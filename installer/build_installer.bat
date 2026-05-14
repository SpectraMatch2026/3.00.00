@echo off
title SpectraMatch Installer Builder
color 0B
cd /d "%~dp0\.."

echo.
echo  ================================================================
echo       SPECTRAMATCH INSTALLER BUILDER
echo  ================================================================
echo.

:: ── Step 1: Check prerequisites ─────────────────────────────────
echo  [1/3] Checking prerequisites...
echo.

python --version >nul 2>&1
if errorlevel 1 (
    echo  [ERROR] Python is not installed or not in PATH.
    pause
    exit /b 1
)

python -c "import PIL" >nul 2>&1
if errorlevel 1 (
    echo  [*] Installing Pillow...
    pip install Pillow
)

python -c "import PyInstaller" >nul 2>&1
if errorlevel 1 (
    echo  [*] Installing PyInstaller...
    pip install pyinstaller
)

:: Check Inno Setup
where iscc >nul 2>&1
if errorlevel 1 (
    if exist "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" (
        set "ISCC=C:\Program Files (x86)\Inno Setup 6\ISCC.exe"
    ) else if exist "C:\Program Files\Inno Setup 6\ISCC.exe" (
        set "ISCC=C:\Program Files\Inno Setup 6\ISCC.exe"
    ) else (
        echo.
        echo  [ERROR] Inno Setup 6 is not installed.
        echo  [INFO]  Download free from: https://jrsoftware.org/isdl.php
        echo  [INFO]  Install it, then run this script again.
        pause
        exit /b 1
    )
) else (
    set "ISCC=iscc"
)

echo  [OK] All prerequisites found.
echo.

:: ── Step 2: Bundle with PyInstaller ─────────────────────────────
echo  [2/3] Bundling application with PyInstaller...
echo         (This may take 3-10 minutes on first run)
echo.
pyinstaller --clean --noconfirm installer\spectramatch.spec
if errorlevel 1 (
    echo.
    echo  [ERROR] PyInstaller build failed.
    echo  [HINT]  Check the error above. Common fixes:
    echo          - pip install pywebview
    echo          - pip install -r requirements.txt
    pause
    exit /b 1
)
echo.
echo  [OK] PyInstaller bundle complete: dist\SpectraMatch\
echo.

:: ── Step 3: Build Inno Setup installer ──────────────────────────
echo  [3/3] Building Windows installer...
"%ISCC%" installer\spectramatch_setup.iss
if errorlevel 1 (
    echo.
    echo  [ERROR] Inno Setup compilation failed.
    pause
    exit /b 1
)

if not exist "static\downloads" mkdir "static\downloads"
move /Y "installer\output\SpectraMatch_Setup_3.0.0.exe" "static\downloads\SpectraMatch_Setup_3.0.0.exe" >nul
if errorlevel 1 (
    echo.
    echo  [ERROR] Failed to move installer into static\downloads\.
    pause
    exit /b 1
)

echo.
echo  ================================================================
echo       BUILD COMPLETE!
echo  ================================================================
echo.
echo  Installer:  static\downloads\SpectraMatch_Setup_3.0.0.exe
echo.
echo  You can now:
echo    1. Test the installer locally
echo    2. Upload it to your hosting / GitHub Releases
echo    3. Keep only this single canonical copy in the repo
echo.
pause
