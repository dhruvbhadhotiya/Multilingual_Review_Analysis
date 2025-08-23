import logging
from typing import Dict, Any, Optional
import os
from deep_translator import GoogleTranslator
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)

def translate_text(text: str, target_lang: str = 'en', source_lang: Optional[str] = None) -> Dict[str, Any]:
    """
    Translate text using Google Translate API via deep-translator.
    
    Args:
        text: Text to translate
        target_lang: Target language code (default: 'en')
        source_lang: Source language code (auto-detected if None)
        
    Returns:
        Dict containing translation results
    """
    if not text or not text.strip():
        return {
            'error': 'Text cannot be empty',
            'original_text': text,
            'translated_text': text,
            'source_lang': source_lang or 'unknown',
            'target_lang': target_lang
        }
    
    try:
        # Use deep-translator for translation
        if source_lang and source_lang != 'auto':
            translator = GoogleTranslator(source=source_lang, target=target_lang)
        else:
            translator = GoogleTranslator(source='auto', target=target_lang)
        
        # Perform translation
        translated_text = translator.translate(text)
        
        # If translation failed or returned None, use original text
        if not translated_text:
            translated_text = text
        
        logger.info(f"Translation: '{text[:50]}...' -> '{translated_text[:50]}...' ({target_lang})")
        
        return {
            'original_text': text,
            'translated_text': translated_text,
            'source_lang': source_lang or 'auto',
            'target_lang': target_lang,
            'confidence': 0.85  # deep-translator doesn't provide confidence scores
        }
        
    except Exception as e:
        logger.error(f"Translation failed: {str(e)}")
        return {
            'error': f"Translation failed: {str(e)}",
            'original_text': text,
            'translated_text': text,  # Return original if translation fails
            'source_lang': source_lang or 'unknown',
            'target_lang': target_lang
        }

def get_supported_languages() -> Dict[str, str]:
    """
    Get supported languages for translation.
    
    Returns:
        Dict of language codes to language names
    """
    return {
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
        'hi': 'Hindi'
    }

def is_language_supported(lang_code: str) -> bool:
    """
    Check if a language is supported for translation.
    
    Args:
        lang_code: Language code to check
        
    Returns:
        bool: True if supported, False otherwise
    """
    return lang_code.lower() in get_supported_languages()