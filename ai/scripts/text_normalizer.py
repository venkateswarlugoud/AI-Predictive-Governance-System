"""
Text Normalization Module for Government AI System
Handles spelling mistakes, informal English, and noisy text.
Deterministic and explainable - no auto-correct libraries.
"""

import re
import random


# Common abbreviation mappings
ABBREVIATIONS = {
    # Street/road related
    'st': 'street',
    'rd': 'road',
    'ave': 'avenue',
    'blvd': 'boulevard',
    'dr': 'drive',
    
    # Common words
    'lite': 'light',
    'wrk': 'work',
    'wrking': 'working',
    'pls': 'please',
    'thru': 'through',
    'thx': 'thanks',
    'u': 'you',
    'ur': 'your',
    'r': 'are',
    'n': 'and',
    'w': 'with',
    'b': 'be',
    'c': 'see',
    '2': 'to',
    '4': 'for',
    
    # Technical terms
    'elec': 'electric',
    'pwr': 'power',
    'wtr': 'water',
    'san': 'sanitation',
}


def normalize_text(text):
    """
    Normalize text for robust category prediction.
    
    Steps:
    1. Lowercase
    2. Remove extra spaces
    3. Normalize punctuation
    4. Expand common abbreviations
    5. Clean up multiple spaces
    
    Args:
        text: Input text string
        
    Returns:
        Normalized text string
    """
    if not text or not isinstance(text, str):
        return ""
    
    # Step 1: Lowercase
    normalized = text.lower()
    
    # Step 2: Normalize punctuation (keep periods, commas, but normalize spacing)
    # Replace multiple punctuation with single
    normalized = re.sub(r'[!]{2,}', '!', normalized)
    normalized = re.sub(r'[?]{2,}', '?', normalized)
    normalized = re.sub(r'[.]{2,}', '.', normalized)
    
    # Step 3: Expand abbreviations (word boundaries only)
    words = normalized.split()
    expanded_words = []
    for word in words:
        # Remove trailing punctuation temporarily
        trailing_punct = ''
        if word and word[-1] in '.,!?;:':
            trailing_punct = word[-1]
            word = word[:-1]
        
        # Expand abbreviation if found
        if word in ABBREVIATIONS:
            word = ABBREVIATIONS[word]
        
        expanded_words.append(word + trailing_punct)
    
    normalized = ' '.join(expanded_words)
    
    # Step 4: Remove extra spaces (multiple spaces to single)
    normalized = re.sub(r'\s+', ' ', normalized)
    
    # Step 5: Strip leading/trailing whitespace
    normalized = normalized.strip()
    
    return normalized


def add_noise_variant(text, noise_type='random'):
    """
    Create a noisy variant of text for robustness training.
    
    Args:
        text: Clean text string
        noise_type: Type of noise to add ('missing_vowels', 'short_forms', 'informal', 'random')
        
    Returns:
        Noisy variant of text
    """
    import random
    if noise_type == 'random':
        noise_type = random.choice(['missing_vowels', 'short_forms', 'informal'])
    
    if noise_type == 'missing_vowels':
        # Remove some vowels (but keep first letter and common patterns)
        words = text.split()
        noisy_words = []
        for word in words:
            if len(word) > 3:
                # Remove some vowels from middle
                noisy = word[0]  # Keep first char
                for char in word[1:-1]:
                    if char.lower() not in 'aeiou' or random.random() > 0.3:
                        noisy += char
                noisy += word[-1]  # Keep last char
                noisy_words.append(noisy)
            else:
                noisy_words.append(word)
        return ' '.join(noisy_words)
    
    elif noise_type == 'short_forms':
        # Use short forms
        replacements = {
            'street': 'st',
            'road': 'rd',
            'light': 'lite',
            'working': 'wrking',
            'electric': 'elec',
            'electricity': 'elec',
            'water': 'wtr',
            'power': 'pwr',
            'please': 'pls',
            'through': 'thru',
        }
        noisy = text
        for full, short in replacements.items():
            # Replace whole words only
            noisy = re.sub(r'\b' + full + r'\b', short, noisy, flags=re.IGNORECASE)
        return noisy
    
    elif noise_type == 'informal':
        # Add informal phrases
        replacements = {
            'not working': 'gone',
            'not functioning': 'dead',
            'broken': 'broke',
            'damaged': 'broke',
            'not available': 'no',
            'no supply': 'no',
        }
        noisy = text
        for formal, informal in replacements.items():
            noisy = re.sub(r'\b' + formal + r'\b', informal, noisy, flags=re.IGNORECASE)
        return noisy
    
    return text


def normalize_for_training(text):
    """Normalize text during training."""
    return normalize_text(text)


def normalize_for_inference(text):
    """Normalize text during inference (same as training for consistency)."""
    return normalize_text(text)
