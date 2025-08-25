import os
import logging
import json
from typing import Dict, Any, Optional, List, Union
from ollama import Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logger = logging.getLogger(__name__)

# Initialize Ollama client with the provided configuration
OLLAMA_CLIENT = Client(
    host="https://ollama.com",
    headers={'Authorization': '843da26fdc2545c5b01aa2e094f83699.vMZEWzSM4bI4AFhVinBVAJTu'}
)

# Model configuration
DEFAULT_MODEL = 'gpt-oss:120b'
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
    """,
    
    'summary_analysis': """
    Analyze the following collection of reviews and provide comprehensive insights in JSON format.
    Include the following analysis:
    
    1. Overall sentiment summary
    2. Key themes and topics mentioned
    3. Common praise points
    4. Common complaints
    5. Actionable insights for improvement
    6. Key phrases that appear frequently
    
    Please respond in JSON format with the following structure:
    {{
        "overall_sentiment": "positive/negative/mixed",
        "sentiment_confidence": 0.8,
        "key_themes": ["theme1", "theme2", "theme3"],
        "praise_points": ["point1", "point2"],
        "complaints": ["complaint1", "complaint2"],
        "key_insights": ["insight1", "insight2", "insight3"],
        "frequent_phrases": ["phrase1", "phrase2"],
        "recommendation": "Brief recommendation based on the analysis"
    }}
    
    Reviews: {text}
    """
}

def analyze_with_ollama(
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
    Analyze text using Ollama's gpt-oss:120B model.
    
    Args:
        text: The text to analyze
        analysis_type: Type of analysis to perform (sentiment, topic, review_analysis, summary)
        model: Ollama model to use
        temperature: Controls randomness (0 to 1)
        max_tokens: Maximum number of tokens to generate
        top_p: Nucleus sampling parameter
        top_k: Top-k sampling parameter
        chunk_index: Index of the current chunk (for multi-chunk processing)
        total_chunks: Total number of chunks (for multi-chunk processing)
        
    Returns:
        Dict containing analysis results
    """
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
        
        logger.info(f"Making Ollama API request for analysis_type: {analysis_type}")
        
        # Generate the response using Ollama client
        response = OLLAMA_CLIENT.chat(
            model=model,
            messages=[
                {
                    'role': 'user',
                    'content': formatted_prompt
                }
            ],
            options={
                'temperature': min(max(temperature, 0), 1),
                'num_predict': max_tokens,
                'top_p': top_p,
                'top_k': top_k,
            }
        )
        
        # Process the response
        if not response or 'message' not in response or 'content' not in response['message']:
            logger.error(f"Invalid response from Ollama API: {response}")
            return {"error": "No response from Ollama API"}
        
        response_text = response['message']['content']
        
        if not response_text:
            return {"error": "Empty response from Ollama API"}
        
        logger.info(f"Ollama API response received for {analysis_type}")
        
        # For structured responses, try to parse as JSON
        try:
            # First, clean the response text to handle markdown code blocks
            response_text = response_text.strip()
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
        logger.error(f"Error in Ollama API call: {str(e)}", exc_info=True)
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
        **kwargs: Additional arguments to pass to analyze_with_ollama
        
    Returns:
        List of analysis results
    """
    results = []
    total = len(texts)
    
    for i, text in enumerate(texts):
        try:
            result = analyze_with_ollama(
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

# Backward compatibility - alias the main function to match Gemini naming
analyze_with_gemini = analyze_with_ollama

# Example usage
if __name__ == "__main__":
    # Test sentiment analysis
    test_text = """
    I recently purchased this product and I'm extremely satisfied with its performance. 
    The build quality is excellent and it's very easy to use. However, the battery life 
    could be better and the price is a bit high for what you get.
    """
    
    print("Testing sentiment analysis with Ollama:")
    result = analyze_with_ollama(test_text, analysis_type='sentiment')
    print(json.dumps(result, indent=2))
    
    # Test topic analysis
    print("\nTesting topic analysis with Ollama:")
    result = analyze_with_ollama(test_text, analysis_type='topic')
    print(json.dumps(result, indent=2))
