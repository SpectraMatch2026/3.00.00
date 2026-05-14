@echo off
title SpectraMatch Desktop Launcher
color 0B

echo.
echo  ========================================================
echo       SPECTRAMATCH DESKTOP APPLICATION
echo  ========================================================
echo.
echo  Launching desktop application...
echo.

cd /d "%~dp0"

:: Check pywebview is installed
python -c "import webview" 2>nul
if errorlevel 1 (
    echo  [*] First-time setup: Installing pywebview...
    pip install pywebview
    if errorlevel 1 (
        echo.
        echo  [!] ERROR: Could not install pywebview.
        echo  [!] Try manually: pip install pywebview
        pause
        exit /b 1
    )
    echo  [OK] pywebview installed.
    echo.
)

:: Launch the desktop app
python desktop\app_desktop.py %*

if errorlevel 1 (
    echo.
    echo  [!] Application exited with an error.
    echo  [!] Make sure Python and all dependencies are installed:
    echo       pip install -r requirements.txt pywebview
    echo.
    pause
)
