from fastapi import FastAPI
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
import numpy as np
import joblib
import os
import sys

# Add scripts directory to path to import modules
scripts_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "scripts")
sys.path.insert(0, scripts_dir)
from text_normalizer import normalize_for_inference

# Import SemanticClassifier from shared module so joblib can unpickle
# This ensures the class is available in the correct module namespace
from semantic_classifier import SemanticClassifier
# Register it in sys.modules so joblib can find it
import semantic_classifier
sys.modules['semantic_classifier'] = semantic_classifier

# Also register for old model format (if model was saved with train_model.SemanticClassifier)
# We'll create an alias in train_model namespace
import importlib.util
train_model_path = os.path.join(scripts_dir, "train_model.py")
if os.path.exists(train_model_path):
    spec = importlib.util.spec_from_file_location("train_model", train_model_path)
    train_model_module = importlib.util.module_from_spec(spec)
    sys.modules["train_model"] = train_model_module
    # Add SemanticClassifier to train_model namespace for backward compatibility
    train_model_module.SemanticClassifier = SemanticClassifier

app = FastAPI(title="Municipal AI Service")

# Load embedding model
embedding_model = SentenceTransformer("all-MiniLM-L6-v2")

# Load category and priority models
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_DIR = os.path.join(BASE_DIR, "model")

category_model = None
priority_model = None

try:
    category_model_path = os.path.join(MODEL_DIR, "category_model.pkl")
    if os.path.exists(category_model_path):
        print(f"Attempting to load category model from: {category_model_path}")
        category_model = joblib.load(category_model_path)
        print(f"[OK] Loaded category model: {category_model_path}")
        if hasattr(category_model, 'model_version'):
            print(f"  Model version: {category_model.model_version}")
        if hasattr(category_model, 'predict_proba'):
            print(f"  Model has predict_proba method: OK")
        else:
            print(f"  ERROR: Model missing predict_proba method!")
    else:
        print(f"⚠ Warning: Category model file not found at: {category_model_path}")
except Exception as e:
    import traceback
    print(f"⚠ ERROR: Could not load category model: {e}")
    print(f"Full traceback:")
    traceback.print_exc()
    category_model = None

try:
    priority_model_path = os.path.join(MODEL_DIR, "priority_model.pkl")
    if os.path.exists(priority_model_path):
        priority_model = joblib.load(priority_model_path)
        print(f"[OK] Loaded priority model: {priority_model_path}")
except Exception as e:
    print(f"⚠ Warning: Could not load priority model: {e}")

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
    Predict category and priority for a complaint.
    Returns "Uncertain" category if confidence < 0.65.
    Text is normalized for robustness (handles typos, informal English).
    """
    # Normalize input text for robustness
    text = normalize_for_inference(data.text)
    
    result = {
        "decision": "AI_PREDICTED"
    }
    
    # Extract model version if available
    model_version = None
    if category_model and hasattr(category_model, 'model_version'):
        model_version = category_model.model_version
    elif priority_model and hasattr(priority_model, 'model_version'):
        model_version = priority_model.model_version
    
    # ---------------- CATEGORY PREDICTION ----------------
    if category_model is None:
        result["category"] = "Uncertain"
        result["categoryConfidence"] = 0.0
        result["error"] = "Category model not loaded"
    else:
        try:
            # Note: category_model.predict_proba already normalizes internally,
            # but we normalize here too for consistency and in case model doesn't
            category_probs = category_model.predict_proba([text])[0]
            cat_index = int(np.argmax(category_probs))
            category_confidence = float(category_probs[cat_index])
            
            # If confidence < 0.65, return "Uncertain"
            if category_confidence < 0.65:
                result["category"] = "Uncertain"
                result["categoryConfidence"] = round(category_confidence, 3)
            else:
                category = category_model.classes_[cat_index]
                result["category"] = category
                result["categoryConfidence"] = round(category_confidence, 3)
        except Exception as e:
            result["category"] = "Uncertain"
            result["categoryConfidence"] = 0.0
            result["error"] = f"Prediction error: {str(e)}"
    
    # ---------------- PRIORITY PREDICTION ----------------
    if priority_model is None:
        result["priority"] = "Medium"  # Default fallback
        result["priorityConfidence"] = 0.0
    else:
        try:
            priority_probs = priority_model.predict_proba([text])[0]
            pri_index = int(np.argmax(priority_probs))
            priority = priority_model.classes_[pri_index]
            priority_confidence = float(priority_probs[pri_index])
            result["priority"] = priority
            result["priorityConfidence"] = round(priority_confidence, 3)
        except Exception as e:
            result["priority"] = "Medium"
            result["priorityConfidence"] = 0.0
    
    # Add model version to response for governance tracking
    if model_version:
        result["model_version"] = model_version
    
    return result
