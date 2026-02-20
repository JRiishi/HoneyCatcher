#!/bin/bash
# Build script for Render.com backend deployment

echo "🚀 Starting HoneyCatcher Backend Build..."

# Install Python dependencies
echo "📦 Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

echo "✅ Backend build completed successfully!"
