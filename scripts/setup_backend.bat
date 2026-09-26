@echo off
setlocal enabledelayedexpansion

echo ==============================================================================
echo             GymTrack SaaS - Backend Environment Automated Setup
echo ==============================================================================
echo.

cd /d "%~dp0\..\backend"

:: Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not found on your system PATH!
    echo Please install Python 3.11+ from https://www.python.org/downloads/
    pause
    exit /b 1
)

:: Create Virtual Environment if not exists
if not exist "venv\Scripts\activate.bat" (
    echo [1/3] Creating Python virtual environment in backend\venv...
    python -m venv venv
    if errorlevel 1 (
        echo [ERROR] Failed to create virtual environment.
        pause
        exit /b 1
    )
    echo [OK] Virtual environment created successfully.
) else (
    echo [1/3] Existing virtual environment found in backend\venv.
)

:: Activate virtualenv
call venv\Scripts\activate.bat

:: Upgrade pip and install requirements
echo.
echo [2/3] Installing and upgrading dependencies from requirements.txt...
python -m pip install --upgrade pip
pip install -r requirements.txt
if errorlevel 1 (
    echo [ERROR] Dependency installation encountered an issue.
    pause
    exit /b 1
)
echo [OK] Dependencies installed successfully.

:: Setup .env from .env.example if missing
echo.
echo [3/3] Checking environment configuration (.env)...
if not exist ".env" (
    if exist ".env.example" (
        copy .env.example .env >nul
        echo [OK] Created backend\.env from .env.example.
        echo [NOTE] Remember to add your Supabase connection string in backend\.env!
    )
) else (
    echo [OK] backend\.env already exists.
)

echo.
echo ==============================================================================
echo   Backend setup is complete!
echo   You can now start the server with: scripts\run_backend.bat
echo ==============================================================================
echo.
pause
