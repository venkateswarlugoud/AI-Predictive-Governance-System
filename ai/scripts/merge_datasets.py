"""
Production-ready merge script for complaint datasets.
Creates ai/data/complaints_train_merged.csv from complaints.csv and complaints_robust.csv.
Does NOT modify the original dataset files.
"""

import os
import re
from typing import Optional

import pandas as pd


BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")

COMPLAINTS_PATH = os.path.join(DATA_DIR, "complaints.csv")
ROBUST_PATH = os.path.join(DATA_DIR, "complaints_robust.csv")
OUTPUT_PATH = os.path.join(DATA_DIR, "complaints_train_merged.csv")

REQUIRED_COLUMNS = ["complaint_text", "category", "priority"]

CATEGORY_NORM = {
    "sanitation": "Sanitation",
    "roads": "Roads",
    "electricity": "Electricity",
    "water": "Water",
}
PRIORITY_NORM = {
    "high": "High",
    "medium": "Medium",
    "low": "Low",
}


def _ensure_complaint_text(df: pd.DataFrame, path: str) -> pd.DataFrame:
    """If dataset has title/description instead of complaint_text, combine into complaint_text."""
    if "complaint_text" in df.columns:
        return df
    if "title" in df.columns and "description" in df.columns:
        df = df.copy()
        df["complaint_text"] = (
            df["title"].fillna("").astype(str).str.strip() + " " + df["description"].fillna("").astype(str).str.strip()
        ).str.strip()
        return df
    raise ValueError(
        f"Dataset at {path} has neither 'complaint_text' nor both 'title' and 'description'. "
        f"Columns found: {list(df.columns)}"
    )


def _validate_schema(df: pd.DataFrame, path: str) -> None:
    missing = [c for c in REQUIRED_COLUMNS if c not in df.columns]
    if missing:
        raise ValueError(
            f"Dataset at {path} is missing required columns: {missing}. "
            f"Required: {REQUIRED_COLUMNS}. Found: {list(df.columns)}"
        )


def _normalize_text(s: str) -> str:
    if pd.isna(s):
        return ""
    s = str(s).strip()
    s = re.sub(r"\s+", " ", s)
    return s.lower().strip()


def _normalize_category(s: str) -> str:
    if pd.isna(s):
        raise ValueError("Category cannot be empty after normalization.")
    key = str(s).strip().lower()
    if key not in CATEGORY_NORM:
        raise ValueError(
            f"Invalid category value: {s!r}. Allowed: {list(CATEGORY_NORM.values())}"
        )
    return CATEGORY_NORM[key]


def _normalize_priority(s: str) -> str:
    if pd.isna(s):
        raise ValueError("Priority cannot be empty after normalization.")
    key = str(s).strip().lower()
    if key not in PRIORITY_NORM:
        raise ValueError(
            f"Invalid priority value: {s!r}. Allowed: {list(PRIORITY_NORM.values())}"
        )
    return PRIORITY_NORM[key]


def merge_datasets() -> None:
    # -------------------------------------------------------------------------
    # STEP 1 — LOAD DATASETS
    # -------------------------------------------------------------------------
    if not os.path.isfile(COMPLAINTS_PATH):
        raise FileNotFoundError(f"Missing file: {COMPLAINTS_PATH}")
    if not os.path.isfile(ROBUST_PATH):
        raise FileNotFoundError(f"Missing file: {ROBUST_PATH}")

    df_complaints = pd.read_csv(COMPLAINTS_PATH, encoding="utf-8")
    df_robust = pd.read_csv(ROBUST_PATH, encoding="utf-8")

    df_complaints = _ensure_complaint_text(df_complaints, COMPLAINTS_PATH)
    # Robust already has complaint_text; ensure it has no extra columns required for schema
    _validate_schema(df_complaints, COMPLAINTS_PATH)
    _validate_schema(df_robust, ROBUST_PATH)

    # Keep only required columns for merge
    df_complaints = df_complaints[REQUIRED_COLUMNS].copy()
    df_robust = df_robust[REQUIRED_COLUMNS].copy()

    # -------------------------------------------------------------------------
    # STEP 3 — NORMALIZE DATA
    # -------------------------------------------------------------------------
    for df in (df_complaints, df_robust):
        df["complaint_text"] = df["complaint_text"].apply(_normalize_text)
        df["category"] = df["category"].apply(_normalize_category)
        df["priority"] = df["priority"].apply(_normalize_priority)

    # Drop rows with empty complaint_text after normalization
    df_complaints = df_complaints[df_complaints["complaint_text"].str.len() > 0].copy()
    df_robust = df_robust[df_robust["complaint_text"].str.len() > 0].copy()

    # -------------------------------------------------------------------------
    # STEP 4 — MERGE
    # -------------------------------------------------------------------------
    size_complaints = len(df_complaints)
    size_robust = len(df_robust)
    merged = pd.concat([df_complaints, df_robust], ignore_index=True)
    size_before_dedup = len(merged)

    print("Size of complaints.csv:", size_complaints)
    print("Size of complaints_robust.csv:", size_robust)
    print("Total size before duplicate removal:", size_before_dedup)

    # -------------------------------------------------------------------------
    # STEP 5 — REMOVE DUPLICATES (on complaint_text only)
    # -------------------------------------------------------------------------
    merged = merged.drop_duplicates(subset=["complaint_text"], keep="first").reset_index(drop=True)
    duplicates_removed = size_before_dedup - len(merged)
    final_size = len(merged)

    print("Number of duplicates removed:", duplicates_removed)
    print("Final dataset size:", final_size)

    # -------------------------------------------------------------------------
    # STEP 6 — VALIDATE DISTRIBUTION
    # -------------------------------------------------------------------------
    cat_counts = merged["category"].value_counts().sort_index()
    pri_counts = merged["priority"].value_counts().sort_index()
    total = len(merged)

    print("\nCategory distribution:")
    for cat in cat_counts.index:
        n = int(cat_counts[cat])
        pct = 100.0 * n / total if total else 0
        print(f"  {cat}: {n} ({pct:.1f}%)")
        if total and (n / total) < 0.20:
            print(f"  WARNING: Category '{cat}' is below 20% of total.")

    print("\nPriority distribution:")
    for pri in pri_counts.index:
        n = int(pri_counts[pri])
        pct = 100.0 * n / total if total else 0
        print(f"  {pri}: {n} ({pct:.1f}%)")
        if total and (n / total) > 0.55:
            print(f"  WARNING: Priority '{pri}' exceeds 55% of total.")

    # -------------------------------------------------------------------------
    # STEP 7 — SAVE OUTPUT
    # -------------------------------------------------------------------------
    merged.to_csv(OUTPUT_PATH, index=False, encoding="utf-8")

    # -------------------------------------------------------------------------
    # STEP 8 — FINAL REPORT
    # -------------------------------------------------------------------------
    print("\n-----------------------------------------")
    print("Merge complete.")
    print("Final dataset size:", final_size)
    print("Duplicates removed:", duplicates_removed)
    print("Category counts:")
    for cat in cat_counts.index:
        print(f"  {cat}: {int(cat_counts[cat])}")
    print("Priority counts:")
    for pri in pri_counts.index:
        print(f"  {pri}: {int(pri_counts[pri])}")
    print("File saved: ai/data/complaints_train_merged.csv")
    print("-----------------------------------------")


if __name__ == "__main__":
    merge_datasets()
