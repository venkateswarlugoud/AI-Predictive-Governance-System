"""
One-time utility to reclassify ALL existing complaints in MongoDB
using the DistilBERT transformer model trained in train_transformer_model.py.

This script is intentionally standalone and does NOT modify:
- Training scripts
- FastAPI API routes
"""
from dotenv import load_dotenv
import os
from pathlib import Path
import sys
import json
import logging
import warnings
from typing import Tuple
from datetime import datetime

# Project root (two levels up from this script, i.e. repo root)
BASE_DIR = Path(__file__).resolve().parents[2]

# Load environment from project root .env and, as a fallback, from server/.env
load_dotenv(BASE_DIR / ".env")
load_dotenv(BASE_DIR / "server" / ".env")

mongo_uri = os.getenv("MONGO_URI")
if not mongo_uri:
    raise RuntimeError(
        "MONGO_URI not found. Ensure it is defined in either .env at project root "
        "or in server/.env."
    )

print("MongoDB URI loaded successfully")

# Suppress transformers "UNEXPECTED keys" load report (harmless for our use)
logging.getLogger("transformers.modeling_utils").setLevel(logging.ERROR)
warnings.filterwarnings("ignore", message=".*UNEXPECTED.*")

import torch
from transformers import DistilBertTokenizerFast
from pymongo import MongoClient
from pymongo.errors import ServerSelectionTimeoutError

from train_transformer_model import (
    ComplaintClassifier,
    CATEGORY_LABELS,
    PRIORITY_LABELS,
    MODEL_DIR,
)


CONFIG_PATH = os.path.join(MODEL_DIR, "config.json")


def load_model_and_tokenizer() -> Tuple[ComplaintClassifier, DistilBertTokenizerFast, int, str]:
    """
    Load tokenizer and transformer model for reclassification.
    Returns: (model, tokenizer, max_length, model_version)
    """
    if not os.path.exists(CONFIG_PATH):
        raise FileNotFoundError(
            f"Expected config.json at {CONFIG_PATH}. Train the model before reclassification."
        )

    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        cfg = json.load(f)

    base_model_name = cfg.get("base_model_name", "distilbert-base-uncased")
    max_length = int(cfg.get("max_length", 64))
    model_version = cfg.get("model_version", "v2.0")

    tokenizer = DistilBertTokenizerFast.from_pretrained(MODEL_DIR)

    model = ComplaintClassifier(
        base_model_name=base_model_name,
        num_categories=len(CATEGORY_LABELS),
        num_priorities=len(PRIORITY_LABELS),
    )
    state_path = os.path.join(MODEL_DIR, "model.pt")
    state_dict = torch.load(state_path, map_location=torch.device("cpu"))
    model.load_state_dict(state_dict)
    model.eval()

    print("Transformer model loaded for reclassification")
    return model, tokenizer, max_length, model_version


def _get_mongo_collection():
    """
    Connect to MongoDB using the same MONGO_URI convention as the Node backend
    and return the complaints collection.
    """
    client = MongoClient(mongo_uri)

    db = client.get_default_database()
    if db is None:
        # Fall back to parsing DB name from URI or use project default.
        from urllib.parse import urlparse

        parsed = urlparse(mongo_uri)
        db_name = (parsed.path or "").lstrip("/") or "municipal_governance"
        db = client[db_name]

    return db["complaints"]


def _governance_decision_status(label: str, confidence: float) -> str:
    """
    Mirror Node confidenceGovernance.js thresholds:
      - >= 0.75 -> AI_CONFIRMED
      - >= 0.55 -> AI_SUGGESTED
      - else    -> REQUIRES_REVIEW
      - "Uncertain" -> REQUIRES_REVIEW
    """
    if label == "Uncertain":
        return "REQUIRES_REVIEW"

    if confidence >= 0.75:
        return "AI_CONFIRMED"
    if confidence >= 0.55:
        return "AI_SUGGESTED"
    return "REQUIRES_REVIEW"


def reclassify_all_complaints() -> None:
    """
    Fetch ALL complaints from MongoDB and reclassify them using the transformer model.
    """
    model, tokenizer, max_length, model_version = load_model_and_tokenizer()

    try:
        complaints = _get_mongo_collection()
        # Trigger connection; fail fast with a clear message if MongoDB is down
        complaints.find_one()
    except ServerSelectionTimeoutError as e:
        print("MongoDB connection failed: cannot reach the database.", file=sys.stderr)
        print("  - Verify MONGO_URI in the project root .env (MongoDB Atlas URI).", file=sys.stderr)
        print("  - Ensure your IP is allowed in MongoDB Atlas Network Access.", file=sys.stderr)
        print("  - Confirm the database user/password are correct.", file=sys.stderr)
        sys.exit(1)

    total = 0
    updated = 0

    for doc in complaints.find(
        {}, {"_id": 1, "title": 1, "description": 1, "decisionAudit": 1}
    ):
        total += 1

        title = (doc.get("title") or "").strip()
        description = (doc.get("description") or "").strip()
        if not title and not description:
            continue

        text = f"{title}. {description}".strip().lower()

        encoded = tokenizer(
            text,
            truncation=True,
            padding="max_length",
            max_length=max_length,
            return_tensors="pt",
        )
        input_ids = encoded["input_ids"]
        attention_mask = encoded["attention_mask"]

        with torch.no_grad():
            cat_logits, pri_logits = model(
                input_ids=input_ids, attention_mask=attention_mask
            )
            cat_probs = torch.softmax(cat_logits, dim=-1)[0]
            pri_probs = torch.softmax(pri_logits, dim=-1)[0]

        category_id = int(torch.argmax(cat_probs).item())
        priority_id = int(torch.argmax(pri_probs).item())

        category_conf = float(cat_probs[category_id].item())
        priority_conf = float(pri_probs[priority_id].item())

        category_label = CATEGORY_LABELS[category_id]
        priority_label = PRIORITY_LABELS[priority_id]

        category_decision_status = _governance_decision_status(
            category_label, category_conf
        )
        priority_decision_status = _governance_decision_status(
            priority_label, priority_conf
        )

        has_override = (
            doc.get("decisionAudit", {}).get("decidedBy") is not None
        )

        # Always refresh advisory AI fields
        update_doc = {
            "category": category_label,
            "priority": priority_label,
            "categoryConfidence": category_conf,
            "priorityConfidence": priority_conf,
            "categorySource": "AI",
            "prioritySource": "AI",
            "categoryDecisionStatus": category_decision_status,
            "priorityDecisionStatus": priority_decision_status,
            "aiModelVersion": model_version,
        }

        # Only update authoritative final fields when no human override exists
        if not has_override:
            update_doc["finalCategory"] = category_label
            update_doc["finalPriority"] = priority_label
        else:
            print(
                f"Skipped final decision update for complaint {doc['_id']} due to human override"
            )

        history_entry = {
            "modelVersion": model_version,
            "category": category_label,
            "priority": priority_label,
            "categoryConfidence": category_conf,
            "priorityConfidence": priority_conf,
            "predictedAt": datetime.utcnow(),
        }

        update_ops = {
            "$set": update_doc,
            "$push": {"aiPredictionHistory": history_entry},
        }

        result = complaints.update_one({"_id": doc["_id"]}, update_ops)
        if result.modified_count:
            updated += 1

        if total % 100 == 0:
            print(f"Processed {total} complaints... updated {updated}")

    print(f"Reclassification complete. Processed={total}, updated={updated}")


if __name__ == "__main__":
    reclassify_all_complaints()

