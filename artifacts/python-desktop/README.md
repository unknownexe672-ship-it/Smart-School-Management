# SmartSchool – Python Desktop Application

Package the existing Smart School Management web app as a single Windows
executable (`SmartSchool.exe`) using Python as the launcher and PyInstaller as
the packager. The existing React frontend and Node.js/Express/tRPC backend are
**not rewritten** — Python simply orchestrates them.

---

## How it works

```
SmartSchool.exe
 └─ Python launcher (src/main.py)
      ├─ Loads config.env
      ├─ Probes database → sets DEMO_MODE if unreachable
      ├─ Starts bundled Node.js API server on port 58423 (hidden)
      ├─ Starts Python HTTP server for the built frontend on port 58424
      └─ Opens pywebview window to http://127.0.0.1:58424
```

- **No terminal window** — the .exe is built with `console=False`.
- **No Node.js or npm required on the user's PC** — a Windows Node.js runtime is
  bundled inside the .exe by PyInstaller.
- **No localhost visible** — the user sees a normal desktop window.
- **Demo Mode** — if the database is unreachable (e.g. no internet), the app
  automatically runs with sample data.

---

## Prerequisites (build machine only)

| Tool | Version | Notes |
|------|---------|-------|
| Python | 3.10+ | Required for the launcher and PyInstaller |
| pip | latest | To install Python packages |
| Node.js + pnpm | 18+ / 8+ | Only needed to compile the existing frontend and API |
| bash | any | Use **Git Bash** on Windows |

> The end user does **not** need any of these installed.

---

## Building the .exe

### 1. Configure database credentials

```bash
cd artifacts/python-desktop
cp resources/config.env.example resources/config.env
# Edit resources/config.env
```

Set your values:

```env
DATABASE_URL=postgres://user:password@your-host:5432/dbname?sslmode=require
DEEPSEEK_API_KEY=sk-...
SESSION_SECRET=some-long-random-string
```

> **How to get your Replit database URL:** In Replit, open the **Database**
> tab, click **Connect**, and copy the connection string.

### 2. Run the build

```bash
# From the repo root (or from artifacts/python-desktop)
bash artifacts/python-desktop/scripts/build-windows.sh
```

This script does five things:

| Step | What happens |
|------|-------------|
| 1 | Builds the Node.js API server → `artifacts/api-server/dist/` |
| 2 | Builds the React frontend with `VITE_API_URL=http://127.0.0.1:58423` → `artifacts/school-app/dist/public/` |
| 3 | Downloads and extracts the Windows Node.js runtime → `vendor/node/` |
| 4 | Copies `config.env.example` to `resources/config.env` if not present |
| 5 | Runs PyInstaller → `dist/SmartSchool.exe` |

### 3. Find the output

```
artifacts/python-desktop/dist/SmartSchool.exe
```

Double-click it to run the application.

---

## How to use it on a laptop

1. **Copy** `SmartSchool.exe` to the laptop.
2. **Double-click** the file.
3. The app window opens automatically — no installation, no terminal.

### Offline / no database

If the laptop has no internet or the database is unreachable:

- The app opens in **Demo Mode** automatically.
- Demo Mode shows realistic sample teachers, employees, classes, schedules,
  expenses, and dashboards.
- No error messages are shown to the user.

> **Note:** The AI chat feature (`Amira`) still needs internet + a valid
> `DEEPSEEK_API_KEY`. Without internet it will return a friendly offline message.

---

## Per-user configuration

Users can override the bundled config by placing a `config.env` file in the
same folder as `SmartSchool.exe`:

```
C:\Users\Admin\Desktop\SmartSchool.exe
C:\Users\Admin\Desktop\config.env
```

This is useful for schools that want to deploy the same .exe to multiple PCs
but point each one at a different database.

---

## Folder structure

```
artifacts/python-desktop/
├── src/
│   └── main.py          ← Python launcher (entry point)
├── scripts/
│   └── build-windows.sh ← One-command build pipeline
├── vendor/
│   └── node/            ← Bundled Windows Node.js runtime (created by build script)
├── resources/
│   ├── config.env       ← Your credentials (created from example)
│   └── config.env.example
├── build-assets/
│   └── icon.ico         ← App icon (replace with your school logo)
├── SmartSchool.spec     ← PyInstaller configuration
├── requirements.txt     ← Python dependencies
├── README.md            ← This file
└── dist/
    └── SmartSchool.exe  ← Final output (created by build)
```

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| White screen on launch | Check that the API and frontend were built before PyInstaller. Re-run the build script. |
| "Node.js runtime not found" | Make sure `vendor/node/node.exe` exists. Run the build script again. |
| App opens in Demo Mode unexpectedly | Check `config.env` — `DATABASE_URL` must be set and the host must be reachable from the laptop. |
| Windows SmartScreen / antivirus warning | Common for unsigned apps. Click **More info → Run anyway**, or buy a code-signing certificate. |
| PyWebView window is blank | Install Edge WebView2 on Windows (most modern PCs already have it). |

---

## Switching from Electron to Python

This folder (`artifacts/python-desktop`) is an alternative to the earlier
`artifacts/electron` packaging. Both produce a `SmartSchool.exe`. Use whichever
one your IT environment prefers:

- **Electron** — heavier, Chromium-based, no Python dependency.
- **Python + pywebview** — uses the native Windows web renderer (Edge WebView2),
  smaller download, and matches your Python requirement.
