@echo off
setlocal

echo ==============================================================================
echo             GymTrack SaaS - Launching FastAPI Backend Server
echo ==============================================================================
echo.

cd /d "%~dp0\..\backend"

if not exist "venv\Scripts\activate.bat" (
    echo [WARNING] Virtual environment not found in backend\venv!
    echo Running automated setup first...
    call "%~dp0setup_backend.bat"
)

call venv\Scripts\activate.bat

echo.
echo Starting FastAPI development server at http://127.0.0.1:8000 ...
echo Interactive Swagger Documentation: http://127.0.0.1:8000/docs
echo Press CTRL+C to stop the server.
echo.

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
