@echo off
echo ================================
echo  Starting HoneyBadger Backend
echo ================================
echo.

cd backend

echo [1/3] Activating virtual environment...
call venv\Scripts\activate.bat

echo [2/3] Installing dependencies...
pip install -q python-socketio slowapi redis

echo [3/3] Starting uvicorn server...
echo.
echo Server will start on http://localhost:8000
echo Socket.IO available at http://localhost:8000/socket.io/
echo.
echo Press Ctrl+C to stop the server
echo.

uvicorn main:app --reload --host 0.0.0.0 --port 8000
