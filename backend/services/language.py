import logging
from typing import Dict, Optional, Tuple
import re
from langdetect import detect, detect_langs, DetectorFactory
from langdetect.lang_detect_exception import LangDetectException

# For consistent language detection results
DetectorFactory.seed = 0

logger = logging.getLogger(__name__)

# Common language codes and their full names
LANGUAGE_NAMES = {
    'en': 'English',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'ru': 'Russian',
    'zh': 'Chinese',
    'ja': 'Japanese',
    'ko': 'Korean',
    'ar': 'Arabic',
    'hi': 'Hindi',
    'bn': 'Bengali',
    'pa': 'Punjabi',
    'ta': 'Tamil',
    'te': 'Telugu',
    'mr': 'Marathi',
    'gu': 'Gujarati',
    'kn': 'Kannada',
    'ml': 'Malayalam',
    'or': 'Odia',
    'as': 'Assamese'
}

def detect_language(text: str, default: str = 'en') -> str:
    """
    Detect the language of the given text.
    
    Args:
        text: The text to analyze
        default: Default language code to return if detection fails
        
    Returns:
        str: Detected language code (e.g., 'en', 'es', 'fr')
    """
    if not text or not text.strip():
        return default
        
    try:
        # Clean the text by removing URLs, mentions, and special characters
        cleaned_text = clean_text(text)
        if not cleaned_text.strip():
            return default
            
        # Detect the language
        detected_lang = detect(cleaned_text)
        return detected_lang.lower()
        
    except LangDetectException as e:
        logger.warning(f"Language detection failed: {str(e)}")
        return default
    except Exception as e:
        logger.error(f"Error in language detection: {str(e)}", exc_info=True)
        return default

def detect_language_with_confidence(text: str) -> Tuple[str, float]:
    """
    Detect the language of the text along with confidence score.
    
    Args:
        text: The text to analyze
        
    Returns:
        tuple: (language_code, confidence_score)
    """
    if not text or not text.strip():
        return 'en', 0.0
        
    try:
        cleaned_text = clean_text(text)
        if not cleaned_text.strip():
            return 'en', 0.0
            
        # Get all possible languages with confidence scores
        langs = detect_langs(cleaned_text)
        if not langs:
            return 'en', 0.0
            
        # Return the most likely language
        best_match = langs[0]
        return best_match.lang, best_match.prob
        
    except Exception as e:
        logger.error(f"Error in language detection with confidence: {str(e)}", exc_info=True)
        return 'en', 0.0

def get_language_name(lang_code: str) -> str:
    """
    Get the full name of a language from its code.
    
    Args:
        lang_code: Two-letter language code (e.g., 'en', 'es')
        
    Returns:
        str: Full name of the language, or the code if not found
    """
    return LANGUAGE_NAMES.get(lang_code.lower(), lang_code)

def clean_text(text: str) -> str:
    """
    Clean the text before language detection.
    
    Args:
        text: Input text
        
    Returns:
        str: Cleaned text
    """
    if not text:
        return ""
        
    # Remove URLs
    text = re.sub(r'https?://\S+|www\.\S+', '', text)
    # Remove mentions and hashtags
    text = re.sub(r'[#@]\w+', '', text)
    # Remove special characters and numbers (using ASCII-compatible regex)
    text = re.sub(r'[^a-zA-ZÀ-ÿĀ-žА-я\u4e00-\u9fff\u0600-\u06ff\u0900-\u097f\s]', ' ', text)
    # Remove extra whitespace
    text = ' '.join(text.split())
    
    return text.strip()

def is_supported_language(lang_code: str) -> bool:
    """
    Check if a language code is supported.
    
    Args:
        lang_code: Two-letter language code
        
    Returns:
        bool: True if the language is supported, False otherwise
    """
    return lang_code.lower() in LANGUAGE_NAMES

# Example usage
if __name__ == "__main__":
    test_texts = [
        "This is an English sentence.",
        "Esta es una oración en español.",
        "C'est une phrase en français.",
        "Dies ist ein deutscher Satz.",
        "这是一句中文。",
        "こんにちは、元気ですか？",
        "안녕하세요, 잘 지내세요?"
    ]
    
    print("Language Detection Test:")
    print("-" * 50)
    for text in test_texts:
        lang_code = detect_language(text)
        lang_name = get_language_name(lang_code)
        print(f"Text: {text[:30]}... | Detected: {lang_name} ({lang_code})")
    
    print("\nLanguage Detection with Confidence:")
    print("-" * 50)
    for text in test_texts:
        lang_code, confidence = detect_language_with_confidence(text)
        lang_name = get_language_name(lang_code)
        print(f"Text: {text[:30]}... | Detected: {lang_name} ({lang_code}) | Confidence: {confidence:.2%}")
