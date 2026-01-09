import pandas as pd
import os
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline
from sklearn.metrics import accuracy_score
import joblib

# -----------------------------
# PATH SETUP (IMPORTANT)
# -----------------------------
# ai/scripts/train_model.py  -> this file
# ai/                         -> base dir
# ai/model/                   -> where models should be saved

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_PATH = os.path.join(BASE_DIR, "data", "complaints.csv")
MODEL_DIR = os.path.join(BASE_DIR, "model")

# Ensure model directory exists
os.makedirs(MODEL_DIR, exist_ok=True)

# -----------------------------
# LOAD DATA
# -----------------------------
data = pd.read_csv(DATA_PATH)

X = data["text"]
y_category = data["category"]
y_priority = data["priority"]

# -----------------------------
# SPLIT DATA
# -----------------------------
X_train, X_test, y_cat_train, y_cat_test = train_test_split(
    X, y_category, test_size=0.2, random_state=42
)

_, _, y_pri_train, y_pri_test = train_test_split(
    X, y_priority, test_size=0.2, random_state=42
)

# -----------------------------
# MODELS
# -----------------------------
category_model = Pipeline([
    ("tfidf", TfidfVectorizer(stop_words="english")),
    ("clf", MultinomialNB())
])

priority_model = Pipeline([
    ("tfidf", TfidfVectorizer(stop_words="english")),
    ("clf", MultinomialNB())
])

# -----------------------------
# TRAIN
# -----------------------------
category_model.fit(X_train, y_cat_train)
priority_model.fit(X_train, y_pri_train)

# -----------------------------
# EVALUATE
# -----------------------------
cat_pred = category_model.predict(X_test)
pri_pred = priority_model.predict(X_test)

print("Category Prediction Accuracy:", accuracy_score(y_cat_test, cat_pred))
print("Priority Prediction Accuracy:", accuracy_score(y_pri_test, pri_pred))

# -----------------------------
# SAVE MODELS
# -----------------------------
joblib.dump(category_model, os.path.join(MODEL_DIR, "category_model.pkl"))
joblib.dump(priority_model, os.path.join(MODEL_DIR, "priority_model.pkl"))

print("Models saved successfully in:", MODEL_DIR)
