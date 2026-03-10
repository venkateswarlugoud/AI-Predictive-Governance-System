from fastapi import FastAPI
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
import numpy as np
import os
import warnings
import logging

import torch
from transformers import DistilBertTokenizerFast, DistilBertForSequenceClassification

from ai.scripts.download_models import ensure_models

# Suppress transformers warnings
logging.getLogger("transformers.modeling_utils").setLevel(logging.ERROR)
warnings.filterwarnings("ignore", message=".*UNEXPECTED.*")

app = FastAPI(title="Municipal AI Service")

# Base directory for models (ai/)
BASE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
CATEGORY_MODEL_DIR = os.path.join(BASE_DIR, "models", "complaint_category_model")
PRIORITY_MODEL_DIR = os.path.join(BASE_DIR, "models", "complaint_priority_model")

# Label mapping
CATEGORY_LABELS = ["Sanitation", "Roads", "Electricity", "Water"]
PRIORITY_LABELS = ["Low", "Medium", "High"]

MAX_LENGTH = 64
model_version = "v3.0"

# Global model variables
embedding_model = None
tokenizer = None
category_model = None
priority_model = None


# ---------------------------------------------------------------------------
# Load models AFTER server starts (prevents deployment timeout)
# ---------------------------------------------------------------------------
@app.on_event("startup")
def load_models():
    global embedding_model, tokenizer, category_model, priority_model

    print("Checking model files...")
    ensure_models()

    print("Loading embedding model...")
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        embedding_model = SentenceTransformer("all-MiniLM-L6-v2")

    print("Loading classifier models...")

    tokenizer = DistilBertTokenizerFast.from_pretrained(CATEGORY_MODEL_DIR)

    category_model = DistilBertForSequenceClassification.from_pretrained(
        CATEGORY_MODEL_DIR
    )

    priority_model = DistilBertForSequenceClassification.from_pretrained(
        PRIORITY_MODEL_DIR
    )

    category_model.eval()
    priority_model.eval()

    print("All models loaded successfully")


# ---------------------------------------------------------------------------
# Request Schemas
# ---------------------------------------------------------------------------
class EmbedRequest(BaseModel):
    text: str


class SimilarityRequest(BaseModel):
    text1: str
    text2: str


class ComplaintRequest(BaseModel):
    text: str


# ---------------------------------------------------------------------------
# Utility
# ---------------------------------------------------------------------------
def cosine(a, b):
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))


# ---------------------------------------------------------------------------
# Embedding endpoint
# ---------------------------------------------------------------------------
@app.post("/embed")
def embed(req: EmbedRequest):
    if embedding_model is None:
        return {"error": "Embedding model not loaded"}

    vec = embedding_model.encode(req.text).tolist()
    return {"embedding": vec}


# ---------------------------------------------------------------------------
# Similarity endpoint
# ---------------------------------------------------------------------------
@app.post("/similarity")
def similarity(req: SimilarityRequest):
    if embedding_model is None:
        return {"error": "Embedding model not loaded"}

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


# ---------------------------------------------------------------------------
# Complaint prediction
# ---------------------------------------------------------------------------
@app.post("/predict")
def predict_complaint(data: ComplaintRequest):

    if tokenizer is None or category_model is None or priority_model is None:
        return {
            "decision": "AI_UNAVAILABLE",
            "category": "Uncertain",
            "categoryConfidence": 0.0,
            "priority": "Medium",
            "priorityConfidence": 0.0,
            "error": "Transformer models not loaded",
        }

    text = (data.text or "").strip().lower()

    encoded = tokenizer(
        text,
        truncation=True,
        padding="max_length",
        max_length=MAX_LENGTH,
        return_tensors="pt",
    )

    input_ids = encoded["input_ids"]
    attention_mask = encoded["attention_mask"]

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

    category_id = torch.argmax(cat_logits, dim=1).item()
    priority_id = torch.argmax(pri_logits, dim=1).item()

    cat_probs = torch.softmax(cat_logits, dim=-1).squeeze(0).cpu().numpy()
    pri_probs = torch.softmax(pri_logits, dim=-1).squeeze(0).cpu().numpy()

    category = CATEGORY_LABELS[category_id]
    priority = PRIORITY_LABELS[priority_id]

    category_confidence = float(cat_probs[category_id])
    priority_confidence = float(pri_probs[priority_id])

    category_probs = {
        CATEGORY_LABELS[i]: round(float(cat_probs[i]), 4)
        for i in range(len(CATEGORY_LABELS))
    }

    priority_probs = {
        PRIORITY_LABELS[i]: round(float(pri_probs[i]), 4)
        for i in range(len(PRIORITY_LABELS))
    }

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