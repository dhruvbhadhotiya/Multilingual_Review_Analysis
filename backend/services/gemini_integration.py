import os
import logging
import json
from typing import Dict, Any, Optional, List, Union
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logger = logging.getLogger(__name__)

# Initialize Gemini API - try both possible environment variable names
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY') or os.getenv('GOOGLE_API_KEY')
if not GEMINI_API_KEY:
    logger.warning("GEMINI_API_KEY or GOOGLE_API_KEY not found in environment variables. Some features may not work.")
else:
    genai.configure(api_key=GEMINI_API_KEY)

# Model configuration
DEFAULT_MODEL = 'gemini-pro'
DEFAULT_TEMPERATURE = 0.7
DEFAULT_MAX_TOKENS = 1000
DEFAULT_TOP_P = 0.9
DEFAULT_TOP_K = 40

# Analysis types and their corresponding prompts
ANALYSIS_PROMPTS = {
    'sentiment': """
    Analyze the sentiment of the following text. Consider both the overall sentiment and specific aspects mentioned.
    Provide a detailed analysis including:
    1. Overall sentiment (positive, negative, neutral)
    2. Sentiment score (-1 to 1)
    3. Key phrases that influenced the sentiment
    4. Any mixed or contrasting sentiments
    
    Text: {text}
    """,
    
    'topic': """
    Identify the main topics and themes in the following text.
    Provide a list of topics with their relevance scores (0-1).
    Also extract key phrases that represent each topic.
    
    Text: {text}
    """,
    
    'review_analysis': """
    Analyze the following product/service review. Provide a detailed analysis including:
    1. Overall sentiment (positive/negative/neutral)
    2. Sentiment score (-1 to 1)
    3. Key aspects mentioned (e.g., price, quality, delivery)
    4. Sentiment for each aspect
    5. Any specific praises or complaints
    6. Suggestions for improvement (if any)
    
    Review: {text}
    """,
    
    'summary': """
    Generate a concise summary of the following text while preserving key information.
    Focus on the main points, important details, and overall message.
    
    Text: {text}
    """
}

def analyze_with_gemini(
    text: str,
    analysis_type: str = 'sentiment',
    model: str = DEFAULT_MODEL,
    temperature: float = DEFAULT_TEMPERATURE,
    max_tokens: int = DEFAULT_MAX_TOKENS,
    top_p: float = DEFAULT_TOP_P,
    top_k: int = DEFAULT_TOP_K,
    chunk_index: Optional[int] = None,
    total_chunks: Optional[int] = None,
    **kwargs
) -> Dict[str, Any]:
    """
    Analyze text using Google's Gemini model.
    
    Args:
        text: The text to analyze
        analysis_type: Type of analysis to perform (sentiment, topic, review_analysis, summary)
        model: Gemini model to use
        temperature: Controls randomness (0 to 1)
        max_tokens: Maximum number of tokens to generate
        top_p: Nucleus sampling parameter
        top_k: Top-k sampling parameter
        chunk_index: Index of the current chunk (for multi-chunk processing)
        total_chunks: Total number of chunks (for multi-chunk processing)
        
    Returns:
        Dict containing analysis results
    """
    if not GEMINI_API_KEY:
        return {"error": "Gemini API key not configured"}
    
    try:
        # Get the appropriate prompt for the analysis type
        prompt_template = ANALYSIS_PROMPTS.get(analysis_type, ANALYSIS_PROMPTS['sentiment'])
        
        # Add chunk information to the prompt if available
        if chunk_index is not None and total_chunks is not None:
            prompt = f"""
            [Chunk {chunk_index + 1} of {total_chunks}]
            {prompt_template}
            """
        else:
            prompt = prompt_template
        
        # Format the prompt with the actual text
        formatted_prompt = prompt.format(text=text)
        
        # Initialize the model
        model = genai.GenerativeModel(model)
        
        # Generate the response
        response = model.generate_content(
            formatted_prompt,
            generation_config={
                'temperature': min(max(temperature, 0), 1),
                'max_output_tokens': max_tokens,
                'top_p': top_p,
                'top_k': top_k,
            },
            **kwargs
        )
        
        # Process the response
        if not response.text:
            return {"error": "No response from Gemini API"}
        
        # For structured responses, try to parse as JSON
        try:
            # First, clean the response text to handle markdown code blocks
            response_text = response.text.strip()
            if '```json' in response_text:
                # Extract JSON from markdown code block
                json_str = response_text.split('```json')[1].split('```')[0].strip()
                return json.loads(json_str)
            elif '```' in response_text:
                # Extract from generic code block
                json_str = response_text.split('```')[1].strip()
                if json_str.startswith('{') and json_str.endswith('}'):
                    return json.loads(json_str)
            
            # Try to parse the entire response as JSON
            return json.loads(response_text)
        except json.JSONDecodeError:
            # If not JSON, return as text
            return {"analysis": response_text}
            
    except Exception as e:
        logger.error(f"Error in Gemini API call: {str(e)}", exc_info=True)
        return {"error": f"Failed to analyze text: {str(e)}"}

def batch_analyze_texts(
    texts: List[str],
    analysis_type: str = 'sentiment',
    **kwargs
) -> List[Dict[str, Any]]:
    """
    Analyze multiple texts in a batch.
    
    Args:
        texts: List of texts to analyze
        analysis_type: Type of analysis to perform
        **kwargs: Additional arguments to pass to analyze_with_gemini
        
    Returns:
        List of analysis results
    """
    results = []
    total = len(texts)
    
    for i, text in enumerate(texts):
        try:
            result = analyze_with_gemini(
                text=text,
                analysis_type=analysis_type,
                chunk_index=i,
                total_chunks=total,
                **kwargs
            )
            results.append(result)
        except Exception as e:
            logger.error(f"Error analyzing text {i+1}/{total}: {str(e)}")
            results.append({"error": str(e)})
    
    return results

def analyze_sentiment_batch(texts: List[str], **kwargs) -> List[Dict[str, Any]]:
    """Convenience function for batch sentiment analysis."""
    return batch_analyze_texts(texts, analysis_type='sentiment', **kwargs)

def analyze_topics_batch(texts: List[str], **kwargs) -> List[Dict[str, Any]]:
    """Convenience function for batch topic analysis."""
    return batch_analyze_texts(texts, analysis_type='topic', **kwargs)

# Example usage
if __name__ == "__main__":
    # Test sentiment analysis
    test_text = """
    I recently purchased this product and I'm extremely satisfied with its performance. 
    The build quality is excellent and it's very easy to use. However, the battery life 
    could be better and the price is a bit high for what you get.
    """
    
    print("Testing sentiment analysis:")
    result = analyze_with_gemini(test_text, analysis_type='sentiment')
    print(json.dumps(result, indent=2))
    
    # Test topic analysis
    print("\nTesting topic analysis:")
    result = analyze_with_gemini(test_text, analysis_type='topic')
    print(json.dumps(result, indent=2))
