from fastapi import FastAPI
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer

app = FastAPI(title="Municipal Embedding Service")

model = SentenceTransformer("all-MiniLM-L6-v2")

class TextRequest(BaseModel):
    text: str

@app.post("/embed")
def embed_text(data: TextRequest):
    vector = model.encode(data.text)
    return {
        "embedding": vector.tolist()
    }
