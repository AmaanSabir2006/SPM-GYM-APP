@echo off
setlocal

echo ==============================================================================
echo             GymTrack SaaS - Launching React (Vite) Web Frontend
echo ==============================================================================
echo.

cd /d "%~dp0\..\frontend-web"

where npm >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js / npm is not found on your system PATH!
    echo Please install Node.js LTS from https://nodejs.org/
    pause
    exit /b 1
)

if not exist "package.json" (
    echo [INFO] Web Frontend project has not been initialized yet.
    echo The Web Lead can initialize it with:
    echo   cd frontend-web
    echo   npm create vite@latest . -- --template react
    pause
    exit /b 0
)

if not exist "node_modules" (
    echo [INFO] Installing frontend dependencies...
    call npm install
)

echo Starting Vite development server...
call npm run dev
