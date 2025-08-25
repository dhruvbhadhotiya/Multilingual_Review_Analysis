import os
import logging
from datetime import datetime, timezone
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('app.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__, static_folder='../frontend', static_url_path='/static')
CORS(app)  # Enable CORS for all routes

# Configuration
app.config.update(
    UPLOAD_FOLDER=os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads'),
    MAX_CONTENT_LENGTH=10 * 1024 * 1024,  # 10MB max file size
    ALLOWED_EXTENSIONS={'csv', 'txt'},
    SECRET_KEY=os.getenv('FLASK_SECRET_KEY', 'dev-secret-key')
)

# Ensure upload directory exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Import services after app creation to avoid circular imports
from services.sentiment import analyze_sentiment
from services.language import detect_language
from services.chunking import process_file, chunk_text
from services.ollama_integration import analyze_with_ollama
from services.translation import translate_text


def allowed_file(filename):
    """Check if the file has an allowed extension."""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']


@app.route('/')
def serve_frontend():
    """Serve the frontend application."""
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/simple.html')
def serve_simple():
    """Serve the simple interface."""
    return send_from_directory(app.static_folder, 'simple.html')

@app.route('/debug.html')
def serve_debug():
    """Serve the debug interface."""
    return send_from_directory(app.static_folder, 'debug.html')

@app.route('/script.js')
def serve_script():
    """Serve the JavaScript file."""
    return send_from_directory(app.static_folder, 'script.js')

@app.route('/styles.css')
def serve_styles():
    """Serve the CSS file."""
    return send_from_directory(app.static_folder, 'styles.css')


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'version': '1.0.0'
    }), 200


@app.route('/api/analyze', methods=['POST'])
def analyze_text():
    """Analyze text for sentiment and other insights."""
    try:
        data = request.get_json()
        text = data.get('text', '').strip()
        language = data.get('language')
        
        if not text:
            return jsonify({'error': 'No text provided'}), 400
        
        # Detect language if not provided
        if not language or language == 'auto':
            language = detect_language(text)
        
        # Analyze sentiment
        sentiment_result = analyze_sentiment(text, language)
        
        # Get additional analysis from Ollama
        ollama_analysis = analyze_with_ollama(text, analysis_type='sentiment')
        
        return jsonify({
            'text': text,
            'language': language,
            'sentiment': sentiment_result.get('sentiment'),
            'score': sentiment_result.get('score'),
            'analysis': ollama_analysis
        }), 200
        
    except Exception as e:
        logger.error(f'Error in analyze_text: {str(e)}', exc_info=True)
        return jsonify({'error': 'Failed to analyze text'}), 500


@app.route('/api/translate', methods=['POST'])
def translate_text_endpoint():
    """Translate text to target language."""
    try:
        data = request.get_json()
        text = data.get('text', '').strip()
        target_lang = data.get('target_lang', 'en')
        source_lang = data.get('source_lang')
        
        if not text:
            return jsonify({'error': 'No text provided'}), 400
        
        # Perform translation
        translation_result = translate_text(text, target_lang, source_lang)
        
        # If translation succeeded, also analyze sentiment of translated text
        if 'error' not in translation_result:
            try:
                sentiment_result = analyze_sentiment(translation_result['translated_text'], target_lang)
                translation_result.update({
                    'sentiment': sentiment_result.get('sentiment'),
                    'sentiment_score': sentiment_result.get('score'),
                    'confidence': sentiment_result.get('score', 0.5)
                })
            except Exception as e:
                logger.warning(f'Failed to analyze sentiment of translated text: {str(e)}')
        
        return jsonify(translation_result), 200
        
    except Exception as e:
        logger.error(f'Error in translate_text_endpoint: {str(e)}', exc_info=True)
        return jsonify({'error': 'Failed to translate text'}), 500


@app.route('/api/upload', methods=['POST'])
def upload_file():
    """
    Handle file upload for batch processing following the complete workflow:
    1. Upload review file
    2. Chunking will happen if size is big
    3. Check for language (English or not)
    4. If not English, translate to English
    5. Analyze each chunk
    6. Generate summary and useful numbers
    """
    try:
        # Check if the post request has the file part
        if 'file' not in request.files:
            return jsonify({'error': 'No file part in the request'}), 400
            
        file = request.files['file']
        
        # If user does not select file, browser also submit an empty part without filename
        if file.filename == '':
            return jsonify({'error': 'No selected file'}), 400
            
        if file and allowed_file(file.filename):
            # Secure the filename and create a unique path
            filename = secure_filename(file.filename)
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            
            # Save the file
            file.save(filepath)
            logger.info(f'File uploaded successfully: {filename}')
            
            # STEP 1 & 2: Process the file and get chunks (chunking if size is big)
            try:
                logger.info(f'Starting file processing: {filename}')
                chunks = process_file(filepath)
                logger.info(f'File chunked into {len(chunks)} chunks')
                
                # Process each chunk following the workflow
                analysis_results = []
                total_chunks = len(chunks)
                
                for i, chunk in enumerate(chunks):
                    logger.info(f'Processing chunk {i+1}/{total_chunks}')
                    
                    chunk_text = chunk['text']
                    if not chunk_text.strip():
                        continue  # Skip empty chunks
                    
                    # STEP 3: Check for language (English or not)
                    # Use language from CSV if available, otherwise detect
                    detected_language = chunk.get('language', '').lower()
                    if not detected_language or detected_language == 'auto':
                        detected_language = detect_language(chunk_text)
                    logger.info(f'Chunk {i+1} language: {detected_language}')
                    
                    # STEP 4: If not English, translate to English
                    original_text = chunk_text
                    translated_text = chunk_text
                    was_translated = False
                    
                    if detected_language != 'en':
                        logger.info(f'Translating chunk {i+1} from {detected_language} to English')
                        try:
                            translation_result = translate_text(chunk_text, target_lang='en', source_lang=detected_language)
                            if 'error' not in translation_result:
                                translated_text = translation_result['translated_text']
                                was_translated = True
                                logger.info(f'Translation successful for chunk {i+1}')
                            else:
                                logger.warning(f'Translation failed for chunk {i+1}, using original text')
                        except Exception as e:
                            logger.warning(f'Translation error for chunk {i+1}: {str(e)}')
                    
                    # STEP 5: Analyze each chunk (basic sentiment only)
                    logger.info(f'Analyzing sentiment for chunk {i+1}')
                    
                    # Basic sentiment analysis (fast and reliable)
                    sentiment_result = analyze_sentiment(translated_text, 'en')
                    
                    # Combine results (no per-chunk Gemini analysis)
                    chunk_result = {
                        'chunk_id': chunk['chunk_id'],
                        'original_text': original_text,
                        'processed_text': translated_text,
                        'detected_language': detected_language,
                        'was_translated': was_translated,
                        'sentiment': sentiment_result.get('sentiment'),
                        'sentiment_score': sentiment_result.get('score'),
                        'polarity': sentiment_result.get('polarity'),
                        'subjectivity': sentiment_result.get('subjectivity'),
                        'confidence': sentiment_result.get('confidence'),
                        'rating': chunk.get('rating'),
                        'date': chunk.get('date'),
                        'analysis': sentiment_result  # For backward compatibility
                    }
                    
                    analysis_results.append(chunk_result)
                    logger.info(f'Chunk {i+1} analysis complete: {sentiment_result.get("sentiment")} ({sentiment_result.get("score"):.2f})')
                
                # STEP 6: Generate summary and useful numbers
                logger.info('Generating summary and statistics')
                summary = generate_summary(analysis_results, filename)
                
                # Clean up the uploaded file after processing
                try:
                    os.remove(filepath)
                    logger.info(f'Cleaned up uploaded file: {filename}')
                except Exception as e:
                    logger.warning(f'Could not delete file {filepath}: {str(e)}')
                
                response_data = {
                    'status': 'success',
                    'filename': filename,
                    'total_chunks': len(analysis_results),
                    'analysis_results': analysis_results,
                    'summary': summary,
                    'workflow_completed': True,
                    'languages_detected': list(set([r['detected_language'] for r in analysis_results])),
                    'translations_performed': sum(1 for r in analysis_results if r['was_translated'])
                }
                
                logger.info(f'File processing complete: {filename}, {len(analysis_results)} chunks analyzed')
                return jsonify(response_data), 200
                
            except Exception as e:
                logger.error(f'Error processing file: {str(e)}', exc_info=True)
                return jsonify({'error': f'Failed to process file: {str(e)}'}), 500
                
        return jsonify({'error': 'File type not allowed. Please upload CSV or TXT files.'}), 400
        
    except Exception as e:
        logger.error(f'Error in upload_file: {str(e)}', exc_info=True)
        return jsonify({'error': 'Internal server error'}), 500


def generate_summary(analysis_results, filename="uploaded_file"):
    """Generate a comprehensive summary of all analysis results with optional Gemini insights."""
    total_chunks = len(analysis_results)
    if total_chunks == 0:
        return {
            'total_reviews_analyzed': 0,
            'average_sentiment_score': 0,
            'sentiment_distribution': {'positive': 0, 'neutral': 0, 'negative': 0},
            'common_topics': [],
            'key_insights': ["No reviews to analyze"],
            'languages_detected': [],
            'translations_performed': 0
        }
    
    # Collect sentiment scores
    sentiment_scores = [r.get('sentiment_score', 0.5) for r in analysis_results]
    avg_sentiment = sum(sentiment_scores) / len(sentiment_scores) if sentiment_scores else 0
    
    # Count sentiment categories
    sentiment_counts = {'positive': 0, 'neutral': 0, 'negative': 0}
    for result in analysis_results:
        sentiment = result.get('sentiment', 'neutral').lower()
        if sentiment in sentiment_counts:
            sentiment_counts[sentiment] += 1
    
    # Extract common topics from both basic and advanced analysis
    all_topics = []
    for result in analysis_results:
        # Get topics from advanced analysis
        topics = result.get('topics', []) or result.get('advanced_analysis', {}).get('topics', [])
        if isinstance(topics, list):
            all_topics.extend(topics)
        
        # Also try to get from analysis field (backward compatibility)
        analysis_topics = result.get('analysis', {}).get('topics', [])
        if isinstance(analysis_topics, list):
            all_topics.extend(analysis_topics)
    
    # Count topic frequencies
    from collections import Counter
    topic_counter = Counter(all_topics)
    common_topics = [topic for topic, _ in topic_counter.most_common(10)]
    
    # Language and translation statistics
    languages_detected = list(set([r.get('detected_language', 'en') for r in analysis_results]))
    translations_performed = sum(1 for r in analysis_results if r.get('was_translated', False))
    
    # Calculate additional statistics
    positive_percentage = round((sentiment_counts['positive'] / total_chunks) * 100, 1) if total_chunks > 0 else 0
    negative_percentage = round((sentiment_counts['negative'] / total_chunks) * 100, 1) if total_chunks > 0 else 0
    neutral_percentage = round((sentiment_counts['neutral'] / total_chunks) * 100, 1) if total_chunks > 0 else 0
    
    # Generate detailed insights
    insights = [
        f"Analyzed {total_chunks} reviews with an average sentiment score of {avg_sentiment:.2f}",
        f"Sentiment breakdown: {positive_percentage}% positive, {neutral_percentage}% neutral, {negative_percentage}% negative"
    ]
    
    if languages_detected and len(languages_detected) > 1:
        insights.append(f"Languages detected: {', '.join(languages_detected)}")
    
    if translations_performed > 0:
        insights.append(f"Performed {translations_performed} translations to English")
    
    if common_topics:
        insights.append(f"Top topics: {', '.join(common_topics[:5])}")
    else:
        insights.append("No specific topics identified")
    
    # Generate Ollama insights for the overall summary
    ollama_insights = {}
    try:
        # Create a sample of reviews for Ollama analysis
        sample_reviews = []
        step = max(1, total_chunks // 10)  # Take up to 10 representative samples
        for i in range(0, total_chunks, step):
            if len(sample_reviews) < 10:
                sample_reviews.append(analysis_results[i]['processed_text'][:200])
        
        sample_text = "\n\n".join(sample_reviews)
        
        logger.info("Generating Ollama insights for overall summary")
        ollama_result = analyze_with_ollama(
            sample_text,
            analysis_type='summary_analysis',
            chunk_index=None,
            total_chunks=total_chunks
        )
        
        if 'error' not in ollama_result:
            ollama_insights = ollama_result
            if ollama_result.get('key_insights'):
                insights.extend(ollama_result['key_insights'][:3])  # Add top 3 Ollama insights
        else:
            logger.info("Ollama summary analysis failed, using basic insights only")
            
    except Exception as e:
        logger.info(f"Ollama summary analysis error: {str(e)}")
    
    return {
        'total_reviews_analyzed': total_chunks,
        'average_sentiment_score': round(avg_sentiment, 3),
        'sentiment_distribution': sentiment_counts,
        'sentiment_percentages': {
            'positive': positive_percentage,
            'neutral': neutral_percentage,
            'negative': negative_percentage
        },
        'common_topics': common_topics,
        'languages_detected': languages_detected,
        'translations_performed': translations_performed,
        'key_insights': insights,
        'ollama_insights': ollama_insights,
        'workflow_steps_completed': [
            '✓ File uploaded and chunked',
            '✓ Language detection performed',
            f'✓ {translations_performed} translations completed' if translations_performed > 0 else '✓ No translations needed',
            '✓ Sentiment analysis completed',
            '✓ Summary generated',
            '✓ AI insights generated' if ollama_insights else '✓ Basic insights provided'
        ]
    }


# Error handlers
@app.errorhandler(404)
def not_found_error(error):
    return jsonify({'error': 'Resource not found'}), 404


@app.errorhandler(500)
def internal_error(error):
    logger.error(f'Server Error: {str(error)}', exc_info=True)
    return jsonify({'error': 'Internal server error'}), 500


if __name__ == '__main__':
    # Ensure the upload directory exists
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    
    # Run the app on port 3000 to avoid AirPlay conflict on macOS
    port = int(os.environ.get('PORT', 3000))
    app.run(host='0.0.0.0', port=port, debug=os.environ.get('FLASK_ENV') == 'development')
