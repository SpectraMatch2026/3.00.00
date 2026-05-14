# -*- mode: python ; coding: utf-8 -*-
"""
PyInstaller spec file for SpectraMatch Desktop.

Bundles the Flask backend + pywebview frontend into a single-folder
distribution.  Run from the project root:

    pyinstaller installer/spectramatch.spec
"""

import os
import sys

PROJECT_DIR = os.path.abspath(os.path.join(SPECPATH, '..'))
INSTALLER_DIR = os.path.join(PROJECT_DIR, 'installer')
ICON_FILE = os.path.join(INSTALLER_DIR, 'spectramatch.ico')

# Fallback if .ico is missing
if not os.path.exists(ICON_FILE):
    ICON_FILE = None

block_cipher = None


def collect_data_tree(source_dir, destination_root, excluded_dir_names=None):
    excluded = set(excluded_dir_names or ())
    datas = []
    for dirpath, dirnames, filenames in os.walk(source_dir):
        dirnames[:] = [name for name in dirnames if name not in excluded]
        rel_dir = os.path.relpath(dirpath, source_dir)
        target_dir = destination_root if rel_dir == '.' else os.path.join(destination_root, rel_dir)
        for filename in filenames:
            datas.append((os.path.join(dirpath, filename), target_dir))
    return datas

a = Analysis(
    [os.path.join(PROJECT_DIR, 'desktop', 'app_desktop.py')],
    pathex=[PROJECT_DIR],
    binaries=[],
    datas=[
        # Flask templates & static assets
        *collect_data_tree(os.path.join(PROJECT_DIR, 'templates'), 'templates'),
        *collect_data_tree(
            os.path.join(PROJECT_DIR, 'static'),
            'static',
            excluded_dir_names={'downloads'},
        ),
        # Desktop-specific files
        (os.path.join(PROJECT_DIR, 'desktop', 'splash.html'), 'desktop'),
        # Icon for pywebview window
        (os.path.join(INSTALLER_DIR, 'spectramatch.ico'), 'installer'),
    ],
    hiddenimports=[
        'flask',
        'jinja2',
        'markupsafe',
        'werkzeug',
        'webview',
        'cv2',
        'numpy',
        'PIL',
        'PIL.Image',
        'matplotlib',
        'matplotlib.backends.backend_agg',
        'skimage',
        'scipy',
        'reportlab',
        'reportlab.lib',
        'reportlab.platypus',
        'reportlab.graphics',
        'pypdf',
        'clr',                    # pythonnet for pywebview/edgechromium
        'System',
        'System.Windows.Forms',
        'System.Drawing',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        'tkinter',
        'pytest',
        'notebook',
        'IPython',
        # Heavy packages NOT needed by SpectraMatch — exclude to keep bundle small
        'torch',
        'torchvision',
        'torchaudio',
        'tensorflow',
        'tensorboard',
        'pandas',
        'sympy',
        'transformers',
        'huggingface_hub',
        'accelerate',
        'safetensors',
        'triton',
        'onnx',
        'onnxruntime',
        'lightning',
        'fsspec',
        'datasets',
        'tokenizers',
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='SpectraMatch',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,          # No console window — GUI app
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=ICON_FILE,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='SpectraMatch',
)
