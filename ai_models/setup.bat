@echo off
echo ============================================
echo   AI Models - Setup Script
echo   CapitalWave Stock Trading Platform
echo ============================================
echo.

:: Check Python installation
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed or not in PATH.
    echo Please install Python 3.9+ from https://python.org
    pause
    exit /b 1
)

echo [1/4] Creating Python virtual environment...
if not exist "venv" (
    python -m venv venv
    echo       Virtual environment created.
) else (
    echo       Virtual environment already exists.
)

echo.
echo [2/4] Activating virtual environment...
call venv\Scripts\activate.bat

echo.
echo [3/4] Installing dependencies...
pip install --upgrade pip >nul 2>&1
pip install -r requirements.txt

echo.
echo [4/4] Creating directories...
if not exist "models_cache" mkdir models_cache
if not exist "models_cache\fine_tuned" mkdir models_cache\fine_tuned
if not exist "datasets" mkdir datasets
if not exist "logs" mkdir logs

echo.
echo ============================================
echo   Setup Complete!
echo ============================================
echo.
echo Next steps:
echo   1. Add your HuggingFace token to .env
echo   2. Download models:   python download_models.py
echo   3. Fine-tune models:  python fine_tune.py
echo   4. Start API server:  python model_service.py
echo.
echo To activate the venv later: venv\Scripts\activate.bat
echo ============================================
pause
