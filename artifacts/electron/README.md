# SmartSchool – Windows Desktop Application

Package the Smart School Management web app as a native Windows executable
(`SmartSchool.exe`) using Electron. No terminal, no npm commands, no localhost
visible to the user — just double-click and go.

---

## How it works

```
SmartSchool.exe
 └─ Electron main process (Node.js)
      ├─ Imports bundled API server  → Express + tRPC on port 58423 (hidden)
      ├─ Registers app:// protocol   → serves Vite-built frontend (no localhost)
      └─ Opens BrowserWindow         → loads app://school-app/
```

- The API server runs **inside** the Electron process — no external Node.js required.
- The frontend is served via a custom `app://` protocol — the user never sees
  `localhost` or any port number in the address bar.
- If the database is unreachable (no internet, bad config), the app
  automatically starts in **Demo Mode** with realistic sample data.

---

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | 18 + | Required on the build machine |
| pnpm | 8 + | `npm i -g pnpm` |
| Wine | 9 + | **Linux/macOS only** — needed for cross-compiling to Windows |

> On Windows, Wine is not needed — build natively.

---

## Building

### 1. Configure database credentials

Edit `artifacts/electron/resources/config.env` (create it from the example
if it doesn't exist yet):

```bash
cp artifacts/electron/resources/config.env.example \
   artifacts/electron/resources/config.env
```

Then open `config.env` and fill in your values:

```env
DATABASE_URL=postgres://user:password@your-host:5432/dbname?sslmode=require
DEEPSEEK_API_KEY=sk-...
SESSION_SECRET=some-long-random-string
```

> **Security note:** `config.env` is bundled inside the installer.  
> Any machine that receives `SmartSchool-Setup.exe` will have access to these
> values. For a school's internal deployment this is acceptable; for public
> distribution, use the per-user config path instead (see below).

### 2. Run the build script

```bash
# From the repository root:
bash artifacts/electron/scripts/build-windows.sh
```

This does four things in order:

| Step | What happens |
|------|-------------|
| 1 | Builds the API server with esbuild → `artifacts/api-server/dist/` |
| 2 | Builds the React frontend with Vite (base=/, API=localhost:58423) → `artifacts/school-app/dist/public/` |
| 3 | Copies config template to `resources/config.env` if not present |
| 4 | Runs `electron-builder` → produces the exe files |

### 3. Find the output

```
artifacts/electron/dist-electron/
  SmartSchool-Setup.exe      ← NSIS installer (recommended for distribution)
  SmartSchool-Portable.exe   ← Single-file portable exe (no installation needed)
```

---

## Per-user configuration (optional)

The app also reads config from the user's AppData folder, which takes priority
over the bundled config:

```
%APPDATA%\SmartSchool\config.env
```

This lets users (or IT admins) point the app at a different database without
repackaging.

---

## Demo Mode

The app enters Demo Mode automatically when:

- `DATABASE_URL` is not set in any config file, **or**
- The PostgreSQL server is unreachable (TCP connect timeout)

In Demo Mode, the API server runs normally but returns realistic sample data
(10 teachers, 5 employees, schedules, expenses, etc.) instead of live database
records. A banner in the app notifies the user.

To force Demo Mode for testing:

```env
# config.env
DEMO_MODE=true
DATABASE_URL=   # leave blank
```

---

## Development (run without building the exe)

```bash
# From repo root — build API and frontend first
pnpm --filter @workspace/api-server run build
PORT=3000 BASE_PATH=/ VITE_API_URL=http://localhost:58423 \
  pnpm --filter @workspace/school-app run build

# Then launch Electron in dev mode
cd artifacts/electron
npm install
npx electron .
```

---

## Folder structure

```
artifacts/electron/
├── src/
│   ├── main.mjs          ← Electron main process
│   └── preload.mjs       ← Context-isolated preload script
├── resources/
│   ├── config.env        ← Your credentials (git-ignored, not committed)
│   └── config.env.example← Template with documentation
├── build-assets/
│   └── icon.ico          ← App icon (replace with your school logo)
├── scripts/
│   └── build-windows.sh  ← One-command build pipeline
├── electron-builder.json5← electron-builder configuration
├── package.json
└── README.md             ← This file
```

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| White screen on launch | Run the build script — `dist/public/` may be missing |
| "API bundle not found" dialog | Run `pnpm --filter @workspace/api-server run build` |
| App launches in Demo Mode unexpectedly | Check `config.env` — `DATABASE_URL` must be set and the host reachable from the machine |
| Antivirus flags the exe | This is common for unsigned Electron apps. Sign the exe with a code-signing certificate for production distribution |
