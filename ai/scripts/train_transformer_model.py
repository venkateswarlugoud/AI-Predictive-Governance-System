"""
Train two separate DistilBERT classifiers on the merged complaint dataset:
  1) Category classifier (Sanitation, Roads, Electricity, Water)
  2) Priority classifier (Low, Medium, High)

Dataset: ai/data/complaints_train_merged.csv (complaint_text, category, priority)
Stratified train/test split. Uses DistilBertForSequenceClassification and Trainer.
"""

import os
import shutil
from typing import Dict, List, Tuple

import numpy as np
import pandas as pd
import torch
from sklearn.model_selection import train_test_split
from torch.utils.data import Dataset
from transformers import (
    DistilBertForSequenceClassification,
    DistilBertTokenizerFast,
    Trainer,
    TrainingArguments,
    set_seed,
)


BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# Dataset path: ai/data/complaints_train_merged.csv (resolve from repo root or from ai/)
MERGED_CSV_PATH = os.path.join(BASE_DIR, "data", "complaints_train_merged.csv")
MODEL_DIR_CATEGORY = os.path.join(BASE_DIR, "models", "complaint_category_model")
MODEL_DIR_PRIORITY = os.path.join(BASE_DIR, "models", "complaint_priority_model")

REQUIRED_COLUMNS = ["complaint_text", "category", "priority"]
CATEGORY_LABELS: List[str] = ["Sanitation", "Roads", "Electricity", "Water"]
PRIORITY_LABELS: List[str] = ["Low", "Medium", "High"]
MODEL_NAME = "distilbert-base-uncased"
MAX_LENGTH = 128


class ComplaintDataset(Dataset):
    """Dataset that tokenizes complaint_text and returns labels for one task."""

    def __init__(
        self,
        texts: List[str],
        labels: List[int],
        tokenizer: DistilBertTokenizerFast,
        max_length: int = MAX_LENGTH,
    ):
        self.texts = texts
        self.labels = labels
        self.tokenizer = tokenizer
        self.max_length = max_length

    def __len__(self) -> int:
        return len(self.texts)

    def __getitem__(self, idx: int) -> Dict[str, torch.Tensor]:
        text = self.texts[idx]
        encoded = self.tokenizer(
            text,
            truncation=True,
            padding="max_length",
            max_length=self.max_length,
            return_tensors="pt",
        )
        return {
            "input_ids": encoded["input_ids"].squeeze(0),
            "attention_mask": encoded["attention_mask"].squeeze(0),
            "labels": torch.tensor(self.labels[idx], dtype=torch.long),
        }


def _load_and_validate_df() -> pd.DataFrame:
    if not os.path.isfile(MERGED_CSV_PATH):
        raise FileNotFoundError(f"Dataset not found: {MERGED_CSV_PATH}")
    df = pd.read_csv(MERGED_CSV_PATH, encoding="utf-8")
    missing = [c for c in REQUIRED_COLUMNS if c not in df.columns]
    if missing:
        raise ValueError(
            f"Dataset missing required columns: {missing}. Required: {REQUIRED_COLUMNS}. Found: {list(df.columns)}"
        )
    df = df[REQUIRED_COLUMNS].copy()
    df["complaint_text"] = df["complaint_text"].fillna("").astype(str).str.strip()
    df = df[df["complaint_text"].str.len() > 0]
    return df


def _compute_accuracy(eval_pred) -> Dict[str, float]:
    logits = eval_pred.predictions
    labels = eval_pred.label_ids
    preds = np.argmax(logits, axis=-1)
    return {"accuracy": float((preds == labels).mean())}


def _label_to_id(labels: List[str], allowed: List[str]) -> List[int]:
    allowed_set = {a.lower(): i for i, a in enumerate(allowed)}
    ids = []
    for raw in labels:
        key = str(raw).strip().lower()
        if key not in allowed_set:
            raise ValueError(f"Invalid label: {raw!r}. Allowed: {allowed}")
        ids.append(allowed_set[key])
    return ids


def _safe_clear_output_dir(output_dir: str) -> None:
    # MANDATORY: prevent disk accumulation from prior runs
    if os.path.exists(output_dir):
        shutil.rmtree(output_dir)


def _make_training_args(output_dir: str) -> TrainingArguments:
    """
    Create TrainingArguments in a way that is compatible with multiple
    transformers versions. Some newer keyword arguments (e.g.
    evaluation_strategy) are not available in older releases, which would
    otherwise cause a TypeError: unexpected keyword argument.
    """
    # Base arguments that are supported broadly.
    base_kwargs = dict(
        output_dir=output_dir,
        num_train_epochs=1,
        per_device_train_batch_size=32,
        per_device_eval_batch_size=32,
        learning_rate=2e-5,
        weight_decay=0.01,
        save_total_limit=1,
        logging_steps=100,
    )

    # Add newer arguments only if they exist on this TrainingArguments class.
    # This keeps the script working even with older transformers versions.
    extra_kwargs = {}
    fields = getattr(TrainingArguments, "__dataclass_fields__", {}) or {}

    # Some versions use `evaluation_strategy`, others use `eval_strategy`.
    has_evaluation_strategy = "evaluation_strategy" in fields
    has_eval_strategy = "eval_strategy" in fields
    has_save_strategy = "save_strategy" in fields

    if has_evaluation_strategy:
        extra_kwargs["evaluation_strategy"] = "epoch"
        if has_save_strategy:
            extra_kwargs["save_strategy"] = "epoch"
    elif has_eval_strategy:
        extra_kwargs["eval_strategy"] = "epoch"
        if has_save_strategy:
            extra_kwargs["save_strategy"] = "epoch"

    # Only enable "load_best_model_at_end" when we can guarantee that save and
    # eval strategies will match; otherwise older transformers will raise a
    # validation error.
    if "load_best_model_at_end" in fields and has_save_strategy and (
        has_evaluation_strategy or has_eval_strategy
    ):
        extra_kwargs["load_best_model_at_end"] = True
        if "metric_for_best_model" in fields:
            extra_kwargs["metric_for_best_model"] = "accuracy"
        if "greater_is_better" in fields:
            extra_kwargs["greater_is_better"] = True

    if "logging_strategy" in fields:
        extra_kwargs["logging_strategy"] = "steps"
    if "report_to" in fields:
        extra_kwargs["report_to"] = "none"

    return TrainingArguments(**base_kwargs, **extra_kwargs)


def _train_one(
    *,
    train_df: pd.DataFrame,
    test_df: pd.DataFrame,
    label_col: str,
    allowed_labels: List[str],
    output_dir: str,
    tokenizer: DistilBertTokenizerFast,
) -> Tuple[Dict[str, float], Trainer]:
    y_train = _label_to_id(train_df[label_col].tolist(), allowed_labels)
    y_test = _label_to_id(test_df[label_col].tolist(), allowed_labels)

    train_ds = ComplaintDataset(
        train_df["complaint_text"].tolist(),
        y_train,
        tokenizer,
        MAX_LENGTH,
    )
    eval_ds = ComplaintDataset(
        test_df["complaint_text"].tolist(),
        y_test,
        tokenizer,
        MAX_LENGTH,
    )

    _safe_clear_output_dir(output_dir)
    training_args = _make_training_args(output_dir)

    model = DistilBertForSequenceClassification.from_pretrained(
        MODEL_NAME,
        num_labels=len(allowed_labels),
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_ds,
        eval_dataset=eval_ds,
        compute_metrics=_compute_accuracy,
    )
    trainer.train()
    eval_out = trainer.evaluate()

    trainer.save_model(output_dir)
    tokenizer.save_pretrained(output_dir)
    return eval_out, trainer


def train() -> None:
    print("Loading dataset: ai/data/complaints_train_merged.csv")
    set_seed(42)
    df = _load_and_validate_df()

    tokenizer = DistilBertTokenizerFast.from_pretrained(MODEL_NAME)

    # -------------------------------------------------------------------------
    # Category model: stratified split on category (MANDATORY)
    # -------------------------------------------------------------------------
    train_df, test_df = train_test_split(
        df,
        test_size=0.2,
        stratify=df["category"],
        random_state=42,
    )
    eval_out_cat, _trainer_cat = _train_one(
        train_df=train_df,
        test_df=test_df,
        label_col="category",
        allowed_labels=CATEGORY_LABELS,
        output_dir=MODEL_DIR_CATEGORY,
        tokenizer=tokenizer,
    )

    # -------------------------------------------------------------------------
    # Priority model: stratified split on priority (MANDATORY)
    # -------------------------------------------------------------------------
    train_df_p, test_df_p = train_test_split(
        df,
        test_size=0.2,
        stratify=df["priority"],
        random_state=42,
    )
    eval_out_pri, _trainer_pri = _train_one(
        train_df=train_df_p,
        test_df=test_df_p,
        label_col="priority",
        allowed_labels=PRIORITY_LABELS,
        output_dir=MODEL_DIR_PRIORITY,
        tokenizer=tokenizer,
    )

    # -------------------------------------------------------------------------
    # Evaluation report
    # -------------------------------------------------------------------------
    acc_cat = eval_out_cat.get("eval_accuracy", 0.0)
    loss_cat = eval_out_cat.get("eval_loss", 0.0)
    acc_pri = eval_out_pri.get("eval_accuracy", 0.0)
    loss_pri = eval_out_pri.get("eval_loss", 0.0)

    print("\n-----------------------------------------")
    print("Category Model Results")
    print("-----------------------------------------")
    print("Accuracy:", acc_cat)
    print("Evaluation Loss:", loss_cat)
    print()
    print("-----------------------------------------")
    print("Priority Model Results")
    print("-----------------------------------------")
    print("Accuracy:", acc_pri)
    print("Evaluation Loss:", loss_pri)
    print("-----------------------------------------")


if __name__ == "__main__":
    train()
