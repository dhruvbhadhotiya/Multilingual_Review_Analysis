#!/bin/bash

# Multilingual Review Analysis Platform - Deployment Script
# Usage: ./deploy.sh [development|production]

set -e

MODE=${1:-development}

echo "🚀 Deploying Multilingual Review Analysis Platform in $MODE mode..."

# Check Python version
if ! python3 --version &> /dev/null; then
    echo "❌ Python 3 is required but not installed."
    exit 1
fi

# Create virtual environment if it doesn't exist
if [ ! -d "env" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv env
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source env/bin/activate

# Install/update dependencies
echo "📋 Installing dependencies..."
pip install -r requirements.txt

# Create uploads directory if it doesn't exist
mkdir -p backend/uploads

# Set up environment based on mode
if [ "$MODE" = "production" ]; then
    echo "🏭 Setting up for production..."
    export FLASK_ENV=production
    
    # Install gunicorn if not already installed
    pip install gunicorn
    
    echo "🌟 Starting production server with Gunicorn..."
    echo "📍 Application will be available at http://0.0.0.0:8000"
    gunicorn --workers 3 --bind 0.0.0.0:8000 --timeout 900 backend.app:app
else
    echo "🛠️  Setting up for development..."
    export FLASK_ENV=development
    
    echo "🌟 Starting development server..."
    echo "📍 Application will be available at http://localhost:3000"
    python backend/app.py
fi
