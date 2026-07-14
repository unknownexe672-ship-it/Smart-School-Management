#!/usr/bin/env bash
# ============================================================================
# SmartSchool – Windows Electron Build Script
# ============================================================================
# Usage:
#   cd artifacts/electron
#   bash scripts/build-windows.sh
#
# Prerequisites (run on a machine with Node 18+, pnpm, and Wine or Windows):
#   pnpm install   (from repo root)
#
# What this script does:
#   1. Builds the API server (esbuild → dist/index.mjs)
#   2. Builds the React frontend (Vite → dist/public/) with Electron API URL
#   3. Copies resources into place
#   4. Installs Electron dependencies
#   5. Runs electron-builder to produce SmartSchool-Setup.exe and
#      SmartSchool-Portable.exe in artifacts/electron/dist-electron/
# ============================================================================

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
ELECTRON_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║    SmartSchool Windows Build Pipeline        ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# ── Step 1: Build API server ──────────────────────────────────────────────────
echo "▶ [1/4] Building API server…"
cd "$REPO_ROOT"
pnpm --filter @workspace/api-server run build
echo "   ✓ API server built → artifacts/api-server/dist/"

# ── Step 2: Build frontend for Electron ──────────────────────────────────────
# Key overrides vs. the normal Replit build:
#   BASE_PATH=/          → Vite base URL is root (no /school-app prefix)
#   PORT=3000            → Satisfies vite.config.ts validation (not actually used)
#   VITE_API_URL         → Frontend calls the local API on this port
#   NODE_ENV=production  → Strips dev-only Replit plugins (cartographer, banner)
echo "▶ [2/4] Building frontend for Electron (base=/ api=http://localhost:58423)…"
cd "$REPO_ROOT"
PORT=3000 \
BASE_PATH=/ \
VITE_API_URL=http://localhost:58423 \
NODE_ENV=production \
pnpm --filter @workspace/school-app run build
echo "   ✓ Frontend built → artifacts/school-app/dist/public/"

# ── Step 3: Prepare config.env ────────────────────────────────────────────────
echo "▶ [3/4] Preparing Electron resources…"
RESOURCES_DIR="$ELECTRON_DIR/resources"
mkdir -p "$RESOURCES_DIR"

# Copy the example config as the default if no config.env exists yet.
# Users can edit resources/config.env to set their DATABASE_URL etc.
if [ ! -f "$RESOURCES_DIR/config.env" ]; then
  cp "$RESOURCES_DIR/config.env.example" "$RESOURCES_DIR/config.env"
  echo "   ✓ Copied config.env.example → resources/config.env"
  echo "   ⚠  Edit artifacts/electron/resources/config.env to set DATABASE_URL"
  echo "      before distributing, or the app will launch in Demo Mode."
fi

# ── Step 4: Install Electron deps + run electron-builder ─────────────────────
echo "▶ [4/4] Packaging with electron-builder…"
cd "$ELECTRON_DIR"

# Install electron + electron-builder locally if not already installed
if [ ! -d "node_modules" ]; then
  npm install --no-package-lock 2>&1 | tail -5
fi

# Build! Targets: NSIS installer + Portable (both x64)
npx electron-builder --win --config electron-builder.json5

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  Build complete! Outputs:                    ║"
echo "╠══════════════════════════════════════════════╣"
echo "║  Installer : dist-electron/SmartSchool-Setup.exe      ║"
echo "║  Portable  : dist-electron/SmartSchool-Portable.exe   ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
echo "To configure the database URL before distributing:"
echo "  Edit artifacts/electron/resources/config.env"
echo "  Set DATABASE_URL=postgres://user:pass@host:5432/dbname"
echo ""
