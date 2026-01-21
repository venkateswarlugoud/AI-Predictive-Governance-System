"""
SemanticClassifier - Shared class for training and inference
This module ensures the class can be properly unpickled in both contexts.
"""

from sentence_transformers import SentenceTransformer


class SemanticClassifier:
    """
    Wrapper class that combines sentence transformer embeddings with a classifier.
    Maintains the same interface as sklearn Pipeline for compatibility.
    Includes text normalization for robustness.
    """
    
    def __init__(self, embedding_model, classifier, classes_, model_version=None, label_list=None):
        self.embedding_model = embedding_model
        self.classifier = classifier
        self.classes_ = classes_
        self.model_version = model_version
        self.label_list = label_list if label_list is not None else list(classes_)
        # Import normalizer for inference
        from text_normalizer import normalize_for_inference
        self.normalize = normalize_for_inference
    
    def predict_proba(self, texts):
        """Predict class probabilities for input texts."""
        if isinstance(texts, str):
            texts = [texts]
        
        # Normalize texts for robustness
        normalized_texts = [self.normalize(text) for text in texts]
        
        # Generate embeddings
        embeddings = self.embedding_model.encode(normalized_texts, convert_to_numpy=True)
        
        # Get probabilities from classifier
        return self.classifier.predict_proba(embeddings)
    
    def predict(self, texts):
        """Predict class labels for input texts."""
        if isinstance(texts, str):
            texts = [texts]
        
        # Normalize texts for robustness
        normalized_texts = [self.normalize(text) for text in texts]
        
        # Generate embeddings
        embeddings = self.embedding_model.encode(normalized_texts, convert_to_numpy=True)
        
        # Get predictions from classifier
        return self.classifier.predict(embeddings)
