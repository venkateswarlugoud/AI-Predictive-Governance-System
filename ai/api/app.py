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
from transformers import DistilBertTokenizerFast, DistilBertForSequenceClassification

# Suppress transformers warnings about unexpected keys during model loading
logging.getLogger("transformers.modeling_utils").setLevel(logging.ERROR)
warnings.filterwarnings("ignore", message=".*UNEXPECTED.*")

app = FastAPI(title="Municipal AI Service")

# Base directory for models (ai/)
BASE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
CATEGORY_MODEL_DIR = os.path.join(BASE_DIR, "models", "complaint_category_model")
PRIORITY_MODEL_DIR = os.path.join(BASE_DIR, "models", "complaint_priority_model")
from ai.scripts.download_models import ensure_models
ensure_models()

# Label mapping (4 categories, 3 priorities)
CATEGORY_LABELS = ["Sanitation", "Roads", "Electricity", "Water"]
PRIORITY_LABELS = ["Low", "Medium", "High"]

# Max sequence length used during training
MAX_LENGTH = 64
model_version = "v3.0"


# ---------------------------------------------------------------------------
# Load embedding model (for /embed and /similarity)
# ---------------------------------------------------------------------------
print("Loading embedding model: all-MiniLM-L6-v2")
with warnings.catch_warnings():
    warnings.simplefilter("ignore")
    embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
print("[OK] Embedding model loaded")

# ---------------------------------------------------------------------------
# Load transformer complaint models at startup (CPU only)
# ---------------------------------------------------------------------------
tokenizer = None
category_model = None
priority_model = None

try:
    tokenizer = DistilBertTokenizerFast.from_pretrained(CATEGORY_MODEL_DIR)

    category_model = DistilBertForSequenceClassification.from_pretrained(
        CATEGORY_MODEL_DIR
    )

    priority_model = DistilBertForSequenceClassification.from_pretrained(
        PRIORITY_MODEL_DIR
    )

    category_model.eval()
    priority_model.eval()

    print("Category and Priority models loaded successfully")

except Exception as e:
    print(f"ERROR loading models: {e}")


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
    Predict category and priority using the transformer models
    (separate DistilBERT classifiers, 4 categories, 3 priorities).
    """
    if tokenizer is None or category_model is None or priority_model is None:
        return {
            "decision": "AI_UNAVAILABLE",
            "category": "Uncertain",
            "categoryConfidence": 0.0,
            "priority": "Medium",
            "priorityConfidence": 0.0,
            "error": "Transformer models not loaded",
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
        cat_outputs = category_model(
            input_ids=input_ids,
            attention_mask=attention_mask,
        )

        pri_outputs = priority_model(
            input_ids=input_ids,
            attention_mask=attention_mask,
        )

    cat_logits = cat_outputs.logits
    pri_logits = pri_outputs.logits

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
