import logging
from typing import Dict, Any
import requests
from textblob import TextBlob
from langdetect import detect
import os

logger = logging.getLogger(__name__)

def analyze_sentiment(text: str, language: str = 'en') -> Dict[str, Any]:
    """
    Analyze the sentiment of the given text.
    
    Args:
        text: The text to analyze
        language: The language code of the text (default: 'en')
        
    Returns:
        Dict containing sentiment analysis results with 'score' field for frontend compatibility
    """
    try:
        # Fallback to English if language detection fails
        if not language or language == 'auto':
            try:
                language = detect(text) if text.strip() else 'en'
            except:
                language = 'en'
        
        # Simple sentiment analysis using TextBlob
        blob = TextBlob(text)
        
        # Get polarity (-1 to 1) and subjectivity (0 to 1)
        polarity = blob.sentiment.polarity
        subjectivity = blob.sentiment.subjectivity
        
        # Categorize sentiment
        if polarity > 0.1:
            sentiment = 'positive'
        elif polarity < -0.1:
            sentiment = 'negative'
        else:
            sentiment = 'neutral'
        
        # Convert polarity to positive score (0-1) for frontend compatibility
        score = (polarity + 1) / 2  # Convert from [-1,1] to [0,1]
        
        # Additional analysis (can be extended)
        analysis = {
            'sentiment': sentiment,
            'score': round(score, 4),  # Frontend expects 'score' field
            'polarity': round(polarity, 4),
            'subjectivity': round(subjectivity, 4),
            'language': language,
            'word_count': len(text.split()),
            'char_count': len(text)
        }
        
        return analysis
        
    except Exception as e:
        logger.error(f"Error in sentiment analysis: {str(e)}", exc_info=True)
        # Return neutral sentiment in case of errors
        return {
            'sentiment': 'neutral',
            'score': 0.5,
            'polarity': 0.0,
            'subjectivity': 0.5,
            'language': language or 'en',
            'error': str(e)
        }

def get_sentiment_score(text: str, language: str = 'en') -> float:
    """
    Get a sentiment score between -1 (negative) and 1 (positive).
    
    Args:
        text: The text to analyze
        language: The language code of the text
        
    Returns:
        float: Sentiment score between -1 and 1
    """
    try:
        blob = TextBlob(text)
        return float(blob.sentiment.polarity)
    except Exception as e:
        logger.error(f"Error getting sentiment score: {str(e)}")
        return 0.0

def get_sentiment_emoji(sentiment: str) -> str:
    """
    Get an emoji representing the sentiment.
    
    Args:
        sentiment: Sentiment category ('positive', 'negative', 'neutral')
        
    Returns:
        str: Emoji representing the sentiment
    """
    emoji_map = {
        'positive': '😊',
        'negative': '😞',
        'neutral': '😐'
    }
    return emoji_map.get(sentiment.lower(), '🤔')

# Example usage
if __name__ == "__main__":
    test_text = "I love this product! It's amazing and works perfectly."
    result = analyze_sentiment(test_text)
    print(f"Sentiment Analysis Result: {result}")
    print(f"Sentiment Score: {get_sentiment_score(test_text)}")
    print(f"Sentiment Emoji: {get_sentiment_emoji(result['sentiment'])}")
