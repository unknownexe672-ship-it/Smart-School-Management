#!/usr/bin/env bash
# ============================================================================
# SmartSchool – Python Desktop / PyInstaller Windows Build Pipeline
# ============================================================================
# Usage:
#   cd artifacts/python-desktop
#   bash scripts/build-windows.sh
#
# Prerequisites (on the build machine only):
#   - Python 3.10+ with pip
#   - pnpm + Node.js (to compile the existing React/Express app)
#   - bash (use Git Bash on Windows)
#
# The resulting .exe requires NO Python, Node, or npm from the end user.
# ============================================================================

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
PY_DIR="$(cd "$(dirname "$0")/.." && pwd)"
NODE_VERSION="20.18.1"
NODE_DIR="$PY_DIR/vendor/node"

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║   SmartSchool Python Desktop – Windows Build Pipeline      ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# ── Step 1: Build API server (Node.js) ────────────────────────────────────────
echo "▶ [1/5] Building API server…"
cd "$REPO_ROOT"
pnpm --filter @workspace/api-server run build
echo "   ✓ API server → artifacts/api-server/dist/"

# ── Step 2: Build frontend for Python desktop ──────────────────────────────────
# BASE_PATH=/ means the frontend expects to be served from the root of the
# Python static server. VITE_API_URL points to the local Node backend port.
echo "▶ [2/5] Building frontend for Python desktop…"
PORT=3000 \
BASE_PATH=/ \
VITE_API_URL=http://127.0.0.1:58423 \
NODE_ENV=production \
pnpm --filter @workspace/school-app run build
echo "   ✓ Frontend → artifacts/school-app/dist/public/"

# ── Step 3: Download bundled Node.js for Windows ──────────────────────────────
echo "▶ [3/5] Preparing bundled Node.js runtime (v$NODE_VERSION)…"
mkdir -p "$NODE_DIR"
cd "$NODE_DIR"

if [ ! -f node.exe ]; then
    echo "   Downloading Node.js v$NODE_VERSION for Windows…"
    curl -L -o node.zip "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-win-x64.zip"
    echo "   Extracting…"
    unzip -o node.zip
    mv node-v${NODE_VERSION}-win-x64/* .
    rm -rf node-v${NODE_VERSION}-win-x64 node.zip
    echo "   ✓ node.exe installed in vendor/node/"
else
    echo "   ✓ node.exe already present"
fi

# ── Step 4: Prepare config.env ─────────────────────────────────────────────────
echo "▶ [4/5] Preparing configuration…"
cd "$PY_DIR"
if [ ! -f resources/config.env ]; then
    cp resources/config.env.example resources/config.env
    echo "   ✓ Copied config.env.example → resources/config.env"
    echo "   ⚠  Edit artifacts/python-desktop/resources/config.env to set DATABASE_URL"
else
    echo "   ✓ resources/config.env already exists"
fi

# ── Step 5: Install Python dependencies and run PyInstaller ───────────────────
echo "▶ [5/5] Running PyInstaller…"
cd "$PY_DIR"
pip install -r requirements.txt
pyinstaller SmartSchool.spec --noconfirm --clean

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  Build complete! Output:                                     ║"
echo "╠════════════════════════════════════════════════════════════╣"
echo "║  dist/SmartSchool.exe                                      ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "To configure the database URL before distributing:"
echo "  Edit artifacts/python-desktop/resources/config.env"
echo "  Set DATABASE_URL=postgres://user:pass@host:5432/dbname"
echo ""
echo "Users can also place a config.env next to SmartSchool.exe"
echo "after installation to override the bundled settings."
echo ""
