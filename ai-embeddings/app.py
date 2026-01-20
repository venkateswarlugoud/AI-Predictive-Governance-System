from fastapi import FastAPI
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer

app = FastAPI(title="Government Advisory Embedding Service")

# Load model once at startup (safe & deterministic)
model = SentenceTransformer("all-MiniLM-L6-v2")

class EmbedRequest(BaseModel):
    text: str

@app.post("/embed")
def embed_text(req: EmbedRequest):
    embedding = model.encode(req.text).tolist()
    return {"embedding": embedding}
