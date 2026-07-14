# -*- mode: python ; coding: utf-8 -*-
"""
PyInstaller spec for SmartSchool Python Desktop.

Bundles:
  - Python launcher (src/main.py)
  - Node.js runtime (vendor/node/)
  - Built API server (../../artifacts/api-server/dist/)
  - Built React frontend (../../artifacts/school-app/dist/public/)
  - Configuration (resources/config.env)
  - Icon (build-assets/icon.ico)

Output: dist/SmartSchool.exe (single-file, no console window)
"""

import os

base_dir = os.path.dirname(os.path.abspath(SPECPATH))

a = Analysis(
    ['src/main.py'],
    pathex=[base_dir],
    binaries=[],
    datas=[
        (os.path.join(base_dir, 'resources', 'config.env'), '.'),
        (os.path.join(base_dir, 'build-assets', 'icon.ico'), 'build-assets'),
        (os.path.join(base_dir, 'vendor', 'node'), 'vendor/node'),
        (os.path.join(base_dir, '..', '..', 'artifacts', 'api-server', 'dist'), 'api-server/dist'),
        (os.path.join(base_dir, '..', '..', 'artifacts', 'school-app', 'dist', 'public'), 'frontend'),
    ],
    hiddenimports=[
        'webview',
        'webview.platforms.winforms',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=None,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=None)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='SmartSchool',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=os.path.join(base_dir, 'build-assets', 'icon.ico'),
)
