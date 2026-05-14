# SpectraMatch Windows Installer Builder

This folder contains everything needed to build a professional Windows installer (.exe) for the SpectraMatch Desktop application.

## What the Installer Does

When a user runs the generated `.exe` installer, they get a professional wizard:

1. **Welcome Page** — With SpectraMatch logo and branding
2. **License Agreement** — User must accept before continuing
3. **Installation Path** — Default: `C:\Program Files\SpectraMatch\` (user can change)
4. **Shortcut Options** — Desktop shortcut + Start Menu entry (both checked by default)
5. **Install Progress** — Shows file extraction progress
6. **Finish Page** — Option to launch SpectraMatch immediately

After installation:
- A **desktop shortcut** with the SpectraMatch icon is created
- A **Start Menu group** with the app + uninstaller is created
- The user can **uninstall** cleanly via Windows Settings > Apps

---

## Prerequisites

You need two free tools installed on your **build machine** (not the end-user's machine):

### 1. PyInstaller
```bash
pip install pyinstaller
```

### 2. Inno Setup 6 (Free)
Download from: https://jrsoftware.org/isdl.php

Install with default options. The build script auto-detects the installation path.

---

## How to Build

### One-Click Build
Simply double-click:
```
installer\build_installer.bat
```

This script automatically:
1. Checks all prerequisites
2. Bundles the entire app with PyInstaller (~3-10 minutes first time)
3. Compiles the Inno Setup installer

### Output
```
static\downloads\SpectraMatch_Setup_3.0.0.exe
```

The build first compiles Inno Setup into `installer\output\`, then moves the final installer into `static\downloads\` so the repo keeps only one distributable copy.

---

## How to Distribute

### Option A: Serve from Your Web App (Default)
Keep the built `.exe` in `static/downloads/` and the public website can link to it directly. The Flask route `/download/desktop` also checks `static/downloads/` first for local deployments.

### Option B: External Hosting (Recommended for Production)
Upload the `.exe` to one of:
- **GitHub Releases** (free, reliable)
- **Any CDN or file hosting service**
- **Your JPaaS hosting** (if it supports large static files)

Then set the environment variable:
```bash
DESKTOP_INSTALLER_URL=https://github.com/SpectraMatch2026/3.0.0/raw/main/static/downloads/SpectraMatch_Setup_3.0.0.exe
```

The Flask route will automatically redirect to this URL instead of serving the local file.

---

## Files in This Folder

| File | Purpose |
|------|---------|
| `build_installer.bat` | One-click build automation script |
| `spectramatch.spec` | PyInstaller spec file (what to bundle) |
| `spectramatch_setup.iss` | Inno Setup script (installer wizard config) |
| `LICENSE.txt` | License agreement shown during installation |
| `spectramatch.ico` | Application icon (multi-size, pre-built) |
| `wizard_image.bmp` | Large wizard sidebar image (164×314, pre-built) |
| `wizard_small.bmp` | Small wizard corner image (55×55, pre-built) |
| `README.md` | This file |

### Generated During Build (gitignored)
| File | Purpose |
|------|---------|
| `output/SpectraMatch_Setup_*.exe` | Temporary Inno Setup output before it is moved into `static/downloads/` |

---

## Updating the Version

When releasing a new version, update these locations:
1. `spectramatch_setup.iss` — `#define MyAppVersion "X.Y.Z"`
2. `app.py` — The installer filename in `download_desktop_installer()`
3. `templates/index.html` — The version shown in the download button
4. `desktop/splash.html` — The version tag

---

## End-User Requirements

The installer handles everything. The end-user needs:
- **Windows 10 or later** (64-bit)
- **~500 MB disk space**
- No Python installation required
- No manual dependency installation required
