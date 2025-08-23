# 🤖 Multilingual Sentiment Analysis & Translation App

A Flask-based web application that provides AI-powered sentiment analysis and translation services using Google's Gemini API.

## ✨ Features

- **Sentiment Analysis**: Analyze text sentiment in multiple languages
- **Translation**: Translate text between different languages using AI
- **File Upload**: Batch process CSV/TXT files for sentiment analysis
- **Real-time Analysis**: Get instant results with detailed insights
- **Modern UI**: Clean, responsive web interface

## 🚀 Quick Start

### Prerequisites

- Python 3.8 or higher
- Google AI API key (get from https://ai.google.dev/)

### Installation

1. **Clone or download the project**
   ```bash
   cd dhruvwithgrok
   ```

2. **Create a virtual environment**
   ```bash
   python -m venv venv
   
   # On Windows:
   venv\Scripts\activate
   
   # On macOS/Linux:
   source venv/bin/activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables**
   ```bash
   # Copy the example environment file
   cp env.example .env
   
   # Edit the .env file and add your Google AI API key:
   GOOGLE_API_KEY=your-actual-api-key-here
   ```

5. **Run the application**
   ```bash
   cd backend
   python app.py
   ```

6. **Open your browser**
   - Navigate to: http://localhost:3000
   - Or try the simple interface: http://localhost:3000/simple.html

## 📋 How to Get Google AI API Key

1. Go to https://ai.google.dev/
2. Click "Get API key"
3. Sign in with your Google account
4. Create a new API key
5. Copy the key and add it to your `.env` file

## 🖥️ Usage

### Simple Text Analysis

1. Open http://localhost:3000/simple.html
2. Enter text in the text area
3. Click "Analyze Sentiment" for sentiment analysis
4. Or select a target language and click "Translate & Analyze"

### File Upload (Advanced)

1. Open http://localhost:3000
2. Upload a CSV or TXT file
3. The app will process each line/row and provide detailed analysis
4. View results in different tabs (Overview, Sentiment, Topics, Raw Data)

### API Endpoints

The app provides RESTful API endpoints:

- `GET /api/health` - Health check
- `POST /api/analyze` - Analyze text sentiment
- `POST /api/translate` - Translate text
- `POST /api/upload` - Upload and process files

### Example API Usage

**Analyze Sentiment:**
```bash
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"text": "I love this product!"}'
```

**Translate Text:**
```bash
curl -X POST http://localhost:3000/api/translate \
  -H "Content-Type: application/json" \
  -d '{"text": "Hola mundo", "target_lang": "en"}'
```

## 📁 Project Structure

```
dhruvwithgrok/
├── backend/                 # Backend Flask application
│   ├── app.py              # Main application file
│   ├── services/           # AI services
│   │   ├── sentiment.py    # Sentiment analysis
│   │   ├── language.py     # Language detection
│   │   ├── translation.py  # Translation service
│   │   ├── chunking.py     # Text processing
│   │   └── gemini_integration.py # Gemini AI integration
│   └── uploads/            # File upload directory
├── frontend/               # Frontend files
│   ├── index.html         # Main interface
│   ├── simple.html        # Simple interface
│   ├── script.js          # JavaScript functionality
│   └── styles.css         # CSS styles
├── requirements.txt       # Python dependencies
├── env.example           # Environment variables example
└── README.md            # This file
```

## 🔧 Configuration

Environment variables (in `.env` file):

```bash
# Required
GOOGLE_API_KEY=your-google-ai-api-key-here

# Optional
FLASK_ENV=development
SECRET_KEY=your-secret-key
MAX_CONTENT_LENGTH=10485760
```

## 🛠️ Troubleshooting

### Common Issues

1. **"API key not configured" error**
   - Make sure you've created a `.env` file with your Google AI API key
   - Verify the key is correct and has the right permissions

2. **Import errors**
   - Make sure you're running from the `backend/` directory
   - Verify all dependencies are installed: `pip install -r requirements.txt`

3. **Port already in use**
   - The app runs on port 3000 by default (to avoid macOS AirPlay conflicts)
   - Stop other applications using port 3000, or change the port in `app.py`

4. **File upload not working**
   - Make sure the `uploads/` directory exists in the backend folder
   - Check file size limits (10MB max by default)

### Getting Help

If you encounter issues:

1. Check the console output for error messages
2. Verify your API key is working by testing a simple request
3. Make sure all dependencies are installed correctly
4. Check that you're running Python 3.8 or higher

## 📝 Supported Languages

**Translation:** English, Spanish, French, German, Italian, Portuguese, Chinese, Japanese, Korean, Arabic, Hindi

**Sentiment Analysis:** Works with any language, but accuracy is best with English

## 🚀 Production Deployment

For production deployment:

1. Set `FLASK_ENV=production` in your environment
2. Use a production WSGI server like Gunicorn:
   ```bash
   pip install gunicorn
   gunicorn --bind 0.0.0.0:5000 app:app
   ```
3. Set up proper environment variables
4. Configure a reverse proxy (nginx, Apache)
5. Set up SSL/HTTPS

## 📄 License

This project is for educational and demonstration purposes.

---

**🎉 Enjoy analyzing sentiment and translating text with AI!**
