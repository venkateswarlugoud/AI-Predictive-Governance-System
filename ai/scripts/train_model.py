"""
AI Training Script - Semantic Embeddings Version
Trains category and priority classifiers using sentence-transformers embeddings.
Replaces TF-IDF with semantic embeddings for better text understanding.
"""

import pandas as pd
import joblib
import os
import sys
from sentence_transformers import SentenceTransformer
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import LabelEncoder
import numpy as np

# Add scripts directory to path to import text_normalizer
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from text_normalizer import normalize_for_training

# Configuration
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
MODEL_DIR = os.path.join(BASE_DIR, "model")
EMBEDDING_MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
MODEL_VERSION = "v1.1"  # Updated for robustness improvements

# Ensure model directory exists
os.makedirs(MODEL_DIR, exist_ok=True)


# Import SemanticClassifier from shared module
from semantic_classifier import SemanticClassifier


def load_data():
    """Load complaint dataset from CSV."""
    csv_path = os.path.join(DATA_DIR, "complaints.csv")
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"Dataset not found at {csv_path}")
    
    df = pd.read_csv(csv_path)
    print(f"Loaded {len(df)} complaints from dataset")
    
    # If dataset has separate title/description, combine them
    if 'text' in df.columns:
        # Already combined, but normalize it
        df['text'] = df['text'].apply(normalize_for_training)
        print("  Normalized text field for robustness")
    elif 'title' in df.columns and 'description' in df.columns:
        # Combine title and description
        df['text'] = df['title'] + '. ' + df['description']
        # Normalize the combined text
        df['text'] = df['text'].apply(normalize_for_training)
        print("  Combined title and description, then normalized for robustness")
    else:
        raise ValueError("Dataset must have either 'text' column or both 'title' and 'description' columns")
    
    return df


def train_classifier(X_embeddings, y, task_name="classifier", use_balanced_weights=False):
    """
    Train a classifier on embeddings.
    Uses LogisticRegression with optional class balancing.
    
    Args:
        X_embeddings: numpy array of embeddings
        y: labels
        task_name: name for logging
        use_balanced_weights: if True, use class_weight="balanced"
    
    Returns:
        Trained classifier
    """
    print(f"\nTraining {task_name}...")
    print(f"  Input shape: {X_embeddings.shape}")
    print(f"  Number of classes: {len(np.unique(y))}")
    if use_balanced_weights:
        print(f"  Using class_weight='balanced' for better handling of imbalanced classes")
    
    # Use LogisticRegression (better probability calibration)
    # For multi-class, 'lbfgs' solver automatically uses multinomial loss
    classifier_params = {
        'max_iter': 1000,
        'random_state': 42,
        'solver': 'lbfgs'
    }
    
    if use_balanced_weights:
        classifier_params['class_weight'] = 'balanced'
    
    classifier = LogisticRegression(**classifier_params)
    
    classifier.fit(X_embeddings, y)
    print(f"  [OK] {task_name} trained successfully")
    
    return classifier


def print_misclassified_examples(classifier, X_embeddings, y_true, texts, classes_, top_n=10):
    """
    Print top N misclassified examples after training.
    
    Args:
        classifier: Trained classifier
        X_embeddings: Embeddings array
        y_true: True labels (encoded)
        texts: Original text strings
        classes_: Class names array
        top_n: Number of examples to print
    """
    # Get predictions
    y_pred = classifier.predict(X_embeddings)
    y_proba = classifier.predict_proba(X_embeddings)
    
    # Find misclassified examples
    misclassified_indices = []
    for i in range(len(y_true)):
        if y_pred[i] != y_true[i]:
            confidence = max(y_proba[i])
            misclassified_indices.append((i, confidence, y_true[i], y_pred[i]))
    
    # Sort by confidence (highest first - most confident mistakes)
    misclassified_indices.sort(key=lambda x: x[1], reverse=True)
    
    print(f"\n  Top {min(top_n, len(misclassified_indices))} Misclassified Examples:")
    print("  " + "=" * 70)
    
    for idx, (i, conf, true_label, pred_label) in enumerate(misclassified_indices[:top_n]):
        true_cat = classes_[true_label]
        pred_cat = classes_[pred_label]
        text_preview = texts[i][:80] + "..." if len(texts[i]) > 80 else texts[i]
        print(f"  {idx+1}. Confidence: {conf:.3f}")
        print(f"     True: {true_cat} | Predicted: {pred_cat}")
        print(f"     Text: {text_preview}")
        print()


def save_model_bundle(embedding_model, classifier, classes_, label_encoder, task_name):
    """
    Save model bundle as .pkl file.
    The saved object is a SemanticClassifier with all required attributes:
    - model (SemanticClassifier wrapper with embedding_model and classifier)
    - classes_ (for sklearn compatibility)
    - label_list (list of labels)
    - model_version
    
    Args:
        embedding_model: SentenceTransformer model
        classifier: Trained sklearn classifier
        classes_: Class labels (numpy array)
        label_encoder: LabelEncoder used (for reference)
        task_name: 'category' or 'priority'
    """
    # Create label list
    label_list = classes_.tolist() if hasattr(classes_, 'tolist') else list(classes_)
    
    # Create wrapper with all metadata
    model_wrapper = SemanticClassifier(
        embedding_model=embedding_model,
        classifier=classifier,
        classes_=classes_,
        model_version=MODEL_VERSION,
        label_list=label_list
    )
    
    # Save the wrapper directly (maintains sklearn Pipeline-like interface)
    # The wrapper contains all required information as attributes
    model_path = os.path.join(MODEL_DIR, f"{task_name}_model.pkl")
    joblib.dump(model_wrapper, model_path)
    print(f"  [OK] Saved model bundle to {model_path}")
    print(f"    Model version: {MODEL_VERSION}")
    print(f"    Labels: {label_list}")


def main():
    """Main training function."""
    print("=" * 60)
    print("AI Training Pipeline - Semantic Embeddings Version")
    print("=" * 60)
    
    # Load data
    df = load_data()
    
    # Initialize sentence transformer
    print(f"\nLoading embedding model: {EMBEDDING_MODEL_NAME}")
    embedding_model = SentenceTransformer(EMBEDDING_MODEL_NAME)
    print("  [OK] Embedding model loaded")
    
    # Extract features and labels
    texts = df['text'].tolist()
    categories = df['category'].tolist()
    priorities = df['priority'].tolist()
    
    # Generate embeddings for all texts
    print(f"\nGenerating embeddings for {len(texts)} texts...")
    print("  This may take a few minutes...")
    embeddings = embedding_model.encode(texts, convert_to_numpy=True, show_progress_bar=True)
    print(f"  [OK] Generated embeddings: shape {embeddings.shape}")
    
    # ========== TRAIN CATEGORY CLASSIFIER ==========
    print("\n" + "=" * 60)
    print("TRAINING CATEGORY CLASSIFIER")
    print("=" * 60)
    
    category_encoder = LabelEncoder()
    y_category = category_encoder.fit_transform(categories)
    category_classes = category_encoder.classes_
    
    # Train with balanced class weights to reduce false positives
    category_classifier = train_classifier(
        embeddings, 
        y_category, 
        "Category Classifier",
        use_balanced_weights=True
    )
    
    # Print misclassified examples
    print_misclassified_examples(
        category_classifier,
        embeddings,
        y_category,
        texts,
        category_classes,
        top_n=10
    )
    
    save_model_bundle(
        embedding_model, 
        category_classifier, 
        category_classes,
        category_encoder,
        "category"
    )
    
    # ========== PRIORITY CLASSIFIER SKIPPED ==========
    # Per requirements: Do NOT retrain priority yet
    print("\n" + "=" * 60)
    print("PRIORITY CLASSIFIER")
    print("=" * 60)
    print("  Skipped - Priority model not retrained as per requirements")
    
    # ========== SUMMARY ==========
    print("\n" + "=" * 60)
    print("TRAINING COMPLETE")
    print("=" * 60)
    print(f"[OK] Category model saved: {os.path.join(MODEL_DIR, 'category_model.pkl')}")
    print(f"[OK] Model version: {MODEL_VERSION}")
    print(f"[OK] Embedding model: {EMBEDDING_MODEL_NAME}")
    print(f"[OK] Trained on combined title + description")
    print(f"[OK] Used class_weight='balanced' for category classifier")
    print(f"[OK] Text normalization applied for robustness (typos, informal English)")
    print(f"[OK] Dataset includes 25% noisy variants for robustness training")
    print("\nNote: Priority model not retrained as per requirements.")


if __name__ == "__main__":
    main()
