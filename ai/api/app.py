from fastapi import FastAPI
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
import numpy as np
import os
import sys
import json
import warnings
import logging

import torch
from torch import nn
from transformers import DistilBertTokenizerFast, DistilBertModel

# Suppress transformers warnings about unexpected keys during model loading
logging.getLogger("transformers.modeling_utils").setLevel(logging.ERROR)
warnings.filterwarnings("ignore", message=".*UNEXPECTED.*")

app = FastAPI(title="Municipal AI Service")

# Base directory for models (ai/)
BASE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
MODEL_DIR = os.path.join(BASE_DIR, "models", "complaint_model_v2")

# Label mapping from transformer config (4 categories, 3 priorities)
CATEGORY_LABELS = ["Sanitation", "Roads", "Electricity", "Water"]
PRIORITY_LABELS = ["Low", "Medium", "High"]

# Max sequence length used during training
MAX_LENGTH = 64


class ComplaintClassifierV2(nn.Module):
    """DistilBERT-based multi-head classifier (category + priority)."""

    def __init__(self, base_model_name: str, num_categories: int, num_priorities: int):
        super().__init__()
        self.encoder = DistilBertModel.from_pretrained(base_model_name)
        hidden_size = self.encoder.config.hidden_size
        dropout_prob = getattr(self.encoder.config, "seq_classif_dropout", 0.2)
        self.dropout = nn.Dropout(dropout_prob)
        self.category_classifier = nn.Linear(hidden_size, num_categories)
        self.priority_classifier = nn.Linear(hidden_size, num_priorities)

    def forward(self, input_ids, attention_mask):
        outputs = self.encoder(input_ids=input_ids, attention_mask=attention_mask)
        cls_rep = outputs.last_hidden_state[:, 0]
        cls_rep = self.dropout(cls_rep)
        category_logits = self.category_classifier(cls_rep)
        priority_logits = self.priority_classifier(cls_rep)
        return category_logits, priority_logits


# ---------------------------------------------------------------------------
# Load embedding model (for /embed and /similarity)
# ---------------------------------------------------------------------------
print("Loading embedding model: all-MiniLM-L6-v2")
with warnings.catch_warnings():
    warnings.simplefilter("ignore")
    embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
print("[OK] Embedding model loaded")

# ---------------------------------------------------------------------------
# Load transformer complaint model at startup (CPU only)
# ---------------------------------------------------------------------------
tokenizer = None
model = None
model_version = "v2.0"

try:
    tokenizer = DistilBertTokenizerFast.from_pretrained(MODEL_DIR)
    config_path = os.path.join(MODEL_DIR, "config.json")
    with open(config_path, "r", encoding="utf-8") as f:
        cfg = json.load(f)
    num_categories = len(cfg["category_labels"])
    num_priorities = len(cfg["priority_labels"])
    base_model_name = cfg["base_model_name"]
    model_version = cfg.get("model_version", "v2.0")
    max_len = int(cfg.get("max_length", 64))

    model = ComplaintClassifierV2(
        base_model_name=base_model_name,
        num_categories=num_categories,
        num_priorities=num_priorities,
    )
    model_path = os.path.join(MODEL_DIR, "model.pt")
    state_dict = torch.load(model_path, map_location=torch.device("cpu"))
    model.load_state_dict(state_dict)
    model.eval()
    MAX_LENGTH = max_len
    print("Transformer model loaded successfully (4-category version)")
except Exception as e:
    print(f"ERROR: Could not load transformer model: {e}")
    tokenizer = None
    model = None


class EmbedRequest(BaseModel):
    text: str


class SimilarityRequest(BaseModel):
    text1: str
    text2: str


def cosine(a, b):
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))


@app.post("/embed")
def embed(req: EmbedRequest):
    vec = embedding_model.encode(req.text).tolist()
    return {"embedding": vec}


@app.post("/similarity")
def similarity(req: SimilarityRequest):
    v1 = embedding_model.encode(req.text1)
    v2 = embedding_model.encode(req.text2)
    score = cosine(v1, v2)
    return {
        "similarityScore": round(score, 3),
        "level": (
            "HIGHLY_SIMILAR" if score >= 0.85 else
            "RELATED" if score >= 0.5 else
            "UNRELATED"
        )
    }


class ComplaintRequest(BaseModel):
    text: str


@app.post("/predict")
def predict_complaint(data: ComplaintRequest):
    """
    Predict category and priority using the transformer model
    (DistilBERT multi-head classifier, 4 categories, 3 priorities).
    """
    if model is None or tokenizer is None:
        return {
            "decision": "AI_UNAVAILABLE",
            "category": "Uncertain",
            "categoryConfidence": 0.0,
            "priority": "Medium",
            "priorityConfidence": 0.0,
            "error": "Transformer model not loaded",
        }

    # Combine and normalize text exactly like training: lowercased
    text = (data.text or "").strip()
    text = text.lower()

    # Tokenize with same max_length as training
    encoded = tokenizer(
        text,
        truncation=True,
        padding="max_length",
        max_length=MAX_LENGTH,
        return_tensors="pt",
    )
    input_ids = encoded["input_ids"]
    attention_mask = encoded["attention_mask"]

    # Forward pass (CPU, no grad)
    with torch.no_grad():
        cat_logits, pri_logits = model(input_ids, attention_mask)

    # Predictions from logits
    category_id = torch.argmax(cat_logits, dim=1).item()
    priority_id = torch.argmax(pri_logits, dim=1).item()

    # Softmax for confidence and per-class probs
    cat_probs = torch.softmax(cat_logits, dim=-1).squeeze(0).cpu().numpy()
    pri_probs = torch.softmax(pri_logits, dim=-1).squeeze(0).cpu().numpy()

    category = CATEGORY_LABELS[category_id]
    priority = PRIORITY_LABELS[priority_id]
    category_confidence = float(cat_probs[category_id])
    priority_confidence = float(pri_probs[priority_id])

    category_probs = {CATEGORY_LABELS[i]: round(float(cat_probs[i]), 4) for i in range(len(CATEGORY_LABELS))}
    priority_probs = {PRIORITY_LABELS[i]: round(float(pri_probs[i]), 4) for i in range(len(PRIORITY_LABELS))}

    return {
        "decision": "AI_PREDICTED_V2",
        "category": category,
        "categoryConfidence": round(category_confidence, 3),
        "priority": priority,
        "priorityConfidence": round(priority_confidence, 3),
        "categoryProbs": category_probs,
        "priorityProbs": priority_probs,
        "model_version": model_version,
    }
