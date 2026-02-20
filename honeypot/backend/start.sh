#!/bin/bash
# Start script for Render.com backend deployment

echo "🚀 Starting HoneyCatcher Backend..."

# Start the FastAPI server with Uvicorn
# Render automatically provides the PORT environment variable
uvicorn main:app \
  --host 0.0.0.0 \
  --port ${PORT:-8000} \
  --workers 1 \
  --log-level info \
  --no-access-log

echo "✅ Backend started on port ${PORT:-8000}"
