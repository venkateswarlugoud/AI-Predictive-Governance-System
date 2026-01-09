from fastapi import FastAPI
from pydantic import BaseModel
import joblib
import os

app = FastAPI(title="Municipal Complaint AI Service")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_DIR = os.path.join(BASE_DIR, "model")

category_model = joblib.load(os.path.join(MODEL_DIR, "category_model.pkl"))
priority_model = joblib.load(os.path.join(MODEL_DIR, "priority_model.pkl"))

class ComplaintRequest(BaseModel):
    text: str

@app.post("/predict")
def predict_complaint(data: ComplaintRequest):
    category = category_model.predict([data.text])[0]
    priority = priority_model.predict([data.text])[0]

    return {
        "category": category,
        "priority": priority
    }
