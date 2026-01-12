from fastapi import FastAPI
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
import numpy as np

app = FastAPI(title="Municipal AI Service")

model = SentenceTransformer("all-MiniLM-L6-v2")

class EmbedRequest(BaseModel):
    text: str

class SimilarityRequest(BaseModel):
    text1: str
    text2: str

def cosine(a, b):
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))

@app.post("/embed")
def embed(req: EmbedRequest):
    vec = model.encode(req.text).tolist()
    return {"embedding": vec}

@app.post("/similarity")
def similarity(req: SimilarityRequest):
    v1 = model.encode(req.text1)
    v2 = model.encode(req.text2)
    score = cosine(v1, v2)

    return {
        "similarityScore": round(score, 3),
        "level": (
            "HIGHLY_SIMILAR" if score >= 0.85 else
            "RELATED" if score >= 0.5 else
            "UNRELATED"
        )
    }
