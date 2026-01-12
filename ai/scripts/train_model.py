from fastapi import FastAPI
from pydantic import BaseModel
import joblib
import os
import numpy as np

app = FastAPI(title="Municipal Complaint AI Service")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_DIR = os.path.join(BASE_DIR, "model")

# Load trained pipelines (TF-IDF + Naive Bayes)
category_model = joblib.load(os.path.join(MODEL_DIR, "category_model.pkl"))
priority_model = joblib.load(os.path.join(MODEL_DIR, "priority_model.pkl"))

class ComplaintRequest(BaseModel):
    text: str

@app.post("/predict")
def predict_complaint(data: ComplaintRequest):
    text = data.text

    # ---------------- CATEGORY ----------------
    category_probs = category_model.predict_proba([text])[0]
    cat_index = int(np.argmax(category_probs))
    category = category_model.classes_[cat_index]
    category_confidence = float(category_probs[cat_index])

    # ---------------- PRIORITY ----------------
    priority_probs = priority_model.predict_proba([text])[0]
    pri_index = int(np.argmax(priority_probs))
    priority = priority_model.classes_[pri_index]
    priority_confidence = float(priority_probs[pri_index])

    return {
        "category": category,
        "categoryConfidence": round(category_confidence, 3),
        "priority": priority,
        "priorityConfidence": round(priority_confidence, 3)
    }
