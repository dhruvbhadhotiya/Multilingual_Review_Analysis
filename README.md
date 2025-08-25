# Multilingual Review Analysis Platform

A comprehensive web application for analyzing multilingual customer reviews using AI-powered sentiment analysis and topic modeling. Built with Flask backend and vanilla JavaScript frontend, featuring Ollama AI integration for advanced text analysis.

## 🌟 Features

### Core Functionality
- **Multilingual Support**: Automatic language detection and translation
- **AI-Powered Analysis**: Advanced sentiment analysis using Ollama's gpt-oss:120b model
- **Topic Extraction**: AI-identified themes and frequent phrases
- **File Processing**: Support for CSV and TXT files with chunking for large datasets
- **Interactive Dashboard**: Real-time charts and visualizations
- **Export Capabilities**: Download analysis results as CSV

### AI Analysis Features
- Overall sentiment classification with confidence scores
- Key theme identification
- Praise points and complaint categorization
- Actionable insights and recommendations
- Topic cloud with frequency analysis
- Sentiment trends over time

## 🚀 Quick Start

### Prerequisites
- Python 3.8 or higher
- pip package manager
- Ollama API access with valid authentication token

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd Project_D7
   ```

2. **Create virtual environment**:
   ```bash
   python -m venv env
   source env/bin/activate  # On Windows: env\Scripts\activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the application**:
   ```bash
   python backend/app.py
   ```

5. **Open your browser** to `http://localhost:3000`

## 📁 Project Structure

```
Project_D7/
├── backend/
│   ├── services/
│   │   ├── ollama_integration.py    # AI analysis with Ollama
│   │   ├── sentiment.py             # Basic sentiment analysis
│   │   ├── translation.py           # Text translation
│   │   ├── language.py              # Language detection
│   │   └── chunking.py              # Text chunking for large files
│   ├── uploads/                     # Temporary file uploads
│   └── app.py                       # Main Flask application
├── frontend/
│   ├── index.html                   # Main web interface
│   ├── script.js                    # Frontend logic
│   └── styles.css                   # UI styling
├── requirements.txt                 # Python dependencies
└── README.md                        # This file
```

## 🔧 Configuration

The application is pre-configured with Ollama API credentials. If you need to modify the configuration:

1. **Ollama Settings** (in `backend/services/ollama_integration.py`):
   - Model: `gpt-oss:120b`
   - Host: `https://ollama.com`
   - API Key: Pre-configured

2. **Server Settings** (in `backend/app.py`):
   - Port: 3000 (configurable via PORT environment variable)
   - Upload limit: 10MB
   - Supported formats: CSV, TXT

## 📈 Usage

### File Upload Analysis
1. Navigate to the web interface
2. Drag & drop or select a CSV/TXT file with reviews
3. Wait for processing (supports files up to 10MB)
4. Explore results across four tabs:
   - **Overview**: Key statistics and AI insights
   - **Sentiment**: Distribution charts and trends
   - **Topics**: AI-identified themes and topic cloud
   - **Raw Data**: Detailed table with search and export

### Manual Review Analysis
1. Switch to "Text Input" tab
2. Enter a single review text
3. Select language (optional)
4. Add rating (optional)
5. Click "Analyze Reviews" for instant results

## 🌐 API Endpoints

- `GET /api/health` - Health check
- `POST /api/analyze` - Single text analysis
- `POST /api/upload` - File upload and batch processing
- `POST /api/translate` - Text translation

## 🚀 Deployment Guide

### Local Development
Already covered in Quick Start section above.

### Production Deployment

#### Option 1: Traditional Server (Ubuntu/CentOS)

1. **Server Setup**:
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y
   
   # Install Python and pip
   sudo apt install python3 python3-pip python3-venv nginx -y
   ```

2. **Deploy Application**:
   ```bash
   # Clone to production directory
   cd /var/www/
   sudo git clone <repository-url> review-analyzer
   cd review-analyzer
   
   # Set up Python environment
   python3 -m venv env
   source env/bin/activate
   pip install -r requirements.txt
   ```

3. **Configure Gunicorn**:
   ```bash
   # Install gunicorn
   pip install gunicorn
   
   # Test the application
   gunicorn --bind 0.0.0.0:8000 backend.app:app
   ```

4. **Create Systemd Service** (`/etc/systemd/system/review-analyzer.service`):
   ```ini
   [Unit]
   Description=Review Analyzer Flask App
   After=network.target
   
   [Service]
   User=www-data
   Group=www-data
   WorkingDirectory=/var/www/review-analyzer
   Environment="PATH=/var/www/review-analyzer/env/bin"
   ExecStart=/var/www/review-analyzer/env/bin/gunicorn --workers 3 --bind 0.0.0.0:8000 backend.app:app
   Restart=always
   
   [Install]
   WantedBy=multi-user.target
   ```

5. **Configure Nginx** (`/etc/nginx/sites-available/review-analyzer`):
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
   
       location / {
           proxy_pass http://127.0.0.1:8000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           
           # Handle large file uploads
           client_max_body_size 10M;
       }
   }
   ```

6. **Start Services**:
   ```bash
   sudo systemctl enable review-analyzer
   sudo systemctl start review-analyzer
   sudo systemctl enable nginx
   sudo systemctl start nginx
   sudo ln -s /etc/nginx/sites-available/review-analyzer /etc/nginx/sites-enabled
   sudo systemctl reload nginx
   ```

#### Option 2: Docker Deployment

1. **Create Dockerfile**:
   ```dockerfile
   FROM python:3.9-slim
   
   WORKDIR /app
   COPY requirements.txt .
   RUN pip install -r requirements.txt
   
   COPY . .
   
   EXPOSE 3000
   CMD ["python", "backend/app.py"]
   ```

2. **Build and Run**:
   ```bash
   docker build -t review-analyzer .
   docker run -p 3000:3000 review-analyzer
   ```

#### Option 3: Cloud Platforms

**Heroku**:
1. Create `Procfile`: `web: gunicorn backend.app:app --bind 0.0.0.0:$PORT`
2. Deploy: `git push heroku main`

**DigitalOcean App Platform**:
1. Connect GitHub repository
2. Set build command: `pip install -r requirements.txt`
3. Set run command: `python backend/app.py`

**AWS EC2**:
Follow the traditional server setup but on an EC2 instance.

## 🔐 Security Considerations

- API keys are embedded in code (consider environment variables for production)
- File uploads are limited to 10MB
- CORS is enabled for all origins (restrict in production)
- No authentication implemented (add as needed)

## 🐛 Troubleshooting

### Common Issues

1. **Ollama API 404 Error**: 
   - Check if model name `gpt-oss:120b` is correct
   - Verify API credentials are valid

2. **File Upload Timeout**:
   - Increase timeout in frontend (currently 15 minutes)
   - Process smaller files or optimize chunking

3. **Memory Issues with Large Files**:
   - Reduce chunk size in `backend/services/chunking.py`
   - Increase server memory allocation

## 📊 Performance Notes

- Processes ~130 review chunks in approximately 2-4 minutes
- Supports concurrent analysis of multiple chunks
- Memory usage scales with file size
- AI analysis adds ~1-2 seconds per chunk

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes and test thoroughly
4. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

---

**Built with ❤️ using Flask, Ollama AI, and modern web technologies.**