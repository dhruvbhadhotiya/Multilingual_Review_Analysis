# RAG Review Analysis Backend

A Flask-based backend service for analyzing multilingual reviews using AI-powered analysis with Ollama's gpt-oss:120b model.

## Features

- File upload and processing (CSV, TXT, JSON)
- Text chunking with configurable size and overlap
- Sentiment analysis with language detection
- Topic modeling and key phrase extraction
- Integration with Google's Gemini API for advanced analysis
- RESTful API endpoints for easy integration
- CORS support for frontend-backend communication
- Logging and error handling

## Prerequisites

- Python 3.8+
- pip (Python package manager)
- Google Gemini API key

## Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd backend
   ```

2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure environment variables:
   - Copy `.env.example` to `.env`
   - Update the configuration values in `.env`
   - Set your Gemini API key: `GEMINI_API_KEY=your-api-key-here`

## Running the Application

### Development Mode

```bash
# Set environment variables
export FLASK_APP=app.py
export FLASK_ENV=development

# Run the application
flask run
```

The API will be available at `http://localhost:5000`

### Production Mode

For production, it's recommended to use a production WSGI server like Gunicorn:

```bash
gunicorn --bind 0.0.0.0:5000 wsgi:app
```

## API Endpoints

### Health Check

- `GET /api/health`
  - Check if the service is running

### Text Analysis

- `POST /api/analyze`
  - Analyze text for sentiment and other insights
  - Request body:
    ```json
    {
      "text": "Your text to analyze",
      "language": "en"
    }
    ```

### File Upload

- `POST /api/upload`
  - Upload and process a file (CSV, TXT, or JSON)
  - Form data: `file` (the file to upload)

## Project Structure

```
backend/
├── app.py                 # Main application file
├── requirements.txt       # Python dependencies
├── .env                  # Environment variables
├── uploads/              # Directory for uploaded files
└── services/             # Service modules
    ├── __init__.py
    ├── sentiment.py      # Sentiment analysis service
    ├── language.py       # Language detection service
    ├── chunking.py       # Text chunking utilities
    └── gemini_integration.py  # Gemini API integration
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `FLASK_APP` | Flask application entry point | `app.py` |
| `FLASK_ENV` | Environment (development/production) | `development` |
| `SECRET_KEY` | Secret key for session management | `your-secret-key-here` |
| `GEMINI_API_KEY` | Google Gemini API key | - |
| `UPLOAD_FOLDER` | Directory for uploaded files | `./uploads` |
| `MAX_CONTENT_LENGTH` | Maximum file upload size (bytes) | `10485760` (10MB) |
| `DEFAULT_CHUNK_SIZE` | Default text chunk size | `1000` |
| `DEFAULT_CHUNK_OVERLAP` | Default chunk overlap | `100` |

## Error Handling

The API returns appropriate HTTP status codes and JSON error responses:

- `400 Bad Request`: Invalid input or missing parameters
- `404 Not Found`: Resource not found
- `413 Payload Too Large`: File size exceeds limit
- `415 Unsupported Media Type`: Invalid file type
- `500 Internal Server Error`: Server error

## Logging

Logs are written to `app.log` with the following format:
```
[timestamp] [level] [module] - message
```

## Testing

Run tests using pytest:

```bash
pytest tests/
```

## Deployment

### Docker

1. Build the Docker image:
   ```bash
   docker build -t rag-review-backend .
   ```

2. Run the container:
   ```bash
   docker run -p 5000:5000 --env-file .env rag-review-backend
   ```

### Cloud Platforms

The application can be deployed to various cloud platforms:

- Google Cloud Run
- AWS Elastic Beanstalk
- Heroku
- Azure App Service

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
