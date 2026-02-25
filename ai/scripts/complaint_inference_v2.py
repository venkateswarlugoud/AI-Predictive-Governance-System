"""
Inference wrapper for DistilBERT-based complaint classifier (v2.0).

Uses the model and tokenizer saved by train_transformer_model.py under:
  ai/models/complaint_model_v2
"""

import os
import json
from typing import List, Dict, Union

import torch
from torch import nn
from transformers import DistilBertTokenizerFast, DistilBertModel


BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_MODEL_DIR = os.path.join(BASE_DIR, "models", "complaint_model_v2")


class ComplaintClassifierV2(nn.Module):
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


class ComplaintInferenceServiceV2:
    def __init__(self, model_dir: str = DEFAULT_MODEL_DIR, device: str = None):
        self.model_dir = model_dir

        config_path = os.path.join(model_dir, "config.json")
        if not os.path.exists(config_path):
            raise FileNotFoundError(
                f"Config not found at {config_path}. "
                f"Run train_transformer_model.py to train and save the model."
            )

        with open(config_path, "r", encoding="utf-8") as f:
            cfg = json.load(f)

        self.category_labels: List[str] = cfg["category_labels"]
        self.priority_labels: List[str] = cfg["priority_labels"]
        self.model_version: str = cfg.get("model_version", "v2.0")
        self.max_length: int = int(cfg.get("max_length", 128))
        base_model_name: str = cfg["base_model_name"]

        self.tokenizer = DistilBertTokenizerFast.from_pretrained(model_dir)

        model = ComplaintClassifierV2(
            base_model_name=base_model_name,
            num_categories=len(self.category_labels),
            num_priorities=len(self.priority_labels),
        )
        state_path = os.path.join(model_dir, "pytorch_model.bin")
        state_dict = torch.load(state_path, map_location="cpu")
        model.load_state_dict(state_dict)

        if device is None:
            device = "cuda" if torch.cuda.is_available() else "cpu"
        self.device = torch.device(device)
        model.to(self.device)
        model.eval()
        self.model = model

    def _encode(self, texts: List[str]):
        # Ensure lowercase normalization as per requirements
        texts = [t.lower() for t in texts]
        encoded = self.tokenizer(
            texts,
            truncation=True,
            padding=True,
            max_length=self.max_length,
            return_tensors="pt",
        )
        return encoded

    def predict(
        self, texts: Union[str, List[str]]
    ) -> List[Dict[str, Union[str, float, Dict[str, float]]]]:
        """
        Run batch predictions.

        Returns list of dicts with:
          - category
          - priority
          - category_confidence
          - priority_confidence
          - category_probs (per-class)
          - priority_probs (per-class)
        """
        single_input = False
        if isinstance(texts, str):
            texts = [texts]
            single_input = True

        encoded = self._encode(texts)
        input_ids = encoded["input_ids"].to(self.device)
        attention_mask = encoded["attention_mask"].to(self.device)

        with torch.no_grad():
            cat_logits, pri_logits = self.model(input_ids=input_ids, attention_mask=attention_mask)
            cat_probs = torch.softmax(cat_logits, dim=-1).cpu().numpy()
            pri_probs = torch.softmax(pri_logits, dim=-1).cpu().numpy()

        results: List[Dict[str, Union[str, float, Dict[str, float]]]] = []
        for i in range(len(texts)):
            cat_prob_vec = cat_probs[i]
            pri_prob_vec = pri_probs[i]

            cat_idx = int(cat_prob_vec.argmax())
            pri_idx = int(pri_prob_vec.argmax())

            cat_conf = float(cat_prob_vec[cat_idx])
            pri_conf = float(pri_prob_vec[pri_idx])

            cat_label = self.category_labels[cat_idx]
            pri_label = self.priority_labels[pri_idx]

            cat_prob_dict = {
                self.category_labels[j]: float(cat_prob_vec[j])
                for j in range(len(self.category_labels))
            }
            pri_prob_dict = {
                self.priority_labels[j]: float(pri_prob_vec[j])
                for j in range(len(self.priority_labels))
            }

            results.append(
                {
                    "category": cat_label,
                    "priority": pri_label,
                    "category_confidence": cat_conf,
                    "priority_confidence": pri_conf,
                    "category_probs": cat_prob_dict,
                    "priority_probs": pri_prob_dict,
                    "model_version": self.model_version,
                }
            )

        return results if not single_input else [results[0]]


def quick_test():
    """Manual test helper for local runs."""
    service = ComplaintInferenceServiceV2()
    samples = [
        "severe road damage causing deaths",
        "bridge collapse killing two people",
        "live electric wire fallen near school",
        "minor water leakage",
        "garbage not cleaned for 1 day",
    ]
    preds = service.predict(samples)
    for text, pred in zip(samples, preds):
        print("\nTEXT:", text)
        print("  Category:", pred["category"], "(conf:", f"{pred['category_confidence']:.3f})")
        print("  Priority:", pred["priority"], "(conf:", f"{pred['priority_confidence']:.3f})")


if __name__ == "__main__":
    quick_test()

