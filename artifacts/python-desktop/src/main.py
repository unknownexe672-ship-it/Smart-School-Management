"""
SmartSchool – Python Desktop Launcher (PyInstaller + pywebview)

This Python program is the entry point for the packaged Windows .exe.
It does NOT reimplement the application. Instead it:

1. Reads bundled and user config.env files
2. Probes the configured PostgreSQL database
3. Sets environment variables (PORT, DATABASE_URL, DEMO_MODE, etc.)
4. Starts the bundled Node.js API server in a hidden subprocess
5. Starts a tiny Python HTTP server for the built React frontend
6. Opens pywebview pointed at the local frontend

When the database is unreachable, DEMO_MODE is set to true and the app
runs with realistic sample data (no error dialogs).
"""

import os
import sys
import shutil
import socket
import signal
import subprocess
import threading
import time
import urllib.request
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlparse


# ─── Configuration ────────────────────────────────────────────────────────────
API_PORT = 58423
WEB_PORT = 58424


def is_bundled():
    """True when running from the PyInstaller-built .exe."""
    return getattr(sys, 'frozen', False) and hasattr(sys, '_MEIPASS')


def resource_path(relative_path):
    """Return the absolute path to a bundled resource."""
    base_path = getattr(sys, '_MEIPASS', os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    return os.path.join(base_path, relative_path)


def log_file_path():
    """Write logs to a user-writable location so debugging is possible."""
    if sys.platform == 'win32':
        log_dir = os.path.join(os.path.expanduser('~'), 'AppData', 'Roaming', 'SmartSchool')
    else:
        log_dir = os.path.join(os.path.expanduser('~'), '.smartschool')
    os.makedirs(log_dir, exist_ok=True)
    return os.path.join(log_dir, 'smartschool.log')


def setup_logging():
    """Redirect stdout/stderr to a log file so the app is silent to the user."""
    log_path = log_file_path()
    try:
        log_file = open(log_path, 'a', encoding='utf-8')
        sys.stdout = log_file
        sys.stderr = log_file
        print(f"\n--- SmartSchool started at {time.strftime('%Y-%m-%d %H:%M:%S')} ---")
        return log_file
    except Exception:
        return None


# ─── Config loading ───────────────────────────────────────────────────────────
def parse_env_file(path):
    out = {}
    if not os.path.exists(path):
        return out
    with open(path, 'r', encoding='utf-8') as f:
        for raw in f:
            line = raw.strip()
            if not line or line.startswith('#'):
                continue
            if '=' not in line:
                continue
            key, value = line.split('=', 1)
            key = key.strip()
            value = value.strip()
            if (value.startswith('"') and value.endswith('"')) or \
               (value.startswith("'") and value.endswith("'")):
                value = value[1:-1]
            out[key] = value
    return out


def load_config():
    config = {}

    # 1. Bundled config (packaged with the .exe)
    bundled = resource_path('config.env')
    config.update(parse_env_file(bundled))

    # 2. External config next to the .exe (highest priority on Windows)
    if is_bundled():
        exe_dir = os.path.dirname(sys.executable)
        external = os.path.join(exe_dir, 'config.env')
        config.update(parse_env_file(external))

    # 3. User profile config (good for per-user settings)
    if sys.platform == 'win32':
        user_config = os.path.join(os.path.expanduser('~'), 'AppData', 'Roaming', 'SmartSchool', 'config.env')
    else:
        user_config = os.path.join(os.path.expanduser('~'), '.smartschool', 'config.env')
    config.update(parse_env_file(user_config))

    # 4. System environment variables (override everything)
    for key in ['DATABASE_URL', 'DEEPSEEK_API_KEY', 'SESSION_SECRET']:
        if os.environ.get(key):
            config[key] = os.environ.get(key)

    return config


# ─── Database reachability probe ─────────────────────────────────────────────
def is_db_reachable(database_url):
    if not database_url:
        return False
    try:
        parsed = urlparse(database_url)
        if not parsed.hostname:
            return False
        host = parsed.hostname
        port = parsed.port or 5432
        with socket.create_connection((host, port), timeout=4):
            return True
    except Exception:
        return False


# ─── Node.js runtime discovery ───────────────────────────────────────────────
def find_node():
    """Prefer the bundled Node.js, fall back to system Node."""
    bundled = resource_path('vendor/node/node.exe')
    if os.path.exists(bundled):
        return bundled
    for name in ['node.exe', 'node']:
        system = shutil.which(name)
        if system:
            return system
    return None


# ─── API server management ───────────────────────────────────────────────────
def start_api_server(config, demo_mode):
    node = find_node()
    if not node:
        raise RuntimeError(
            "Node.js runtime not found. The packaged app should include it in vendor/node."
        )

    api_entry = resource_path('api-server/dist/index.mjs')
    if not os.path.exists(api_entry):
        raise RuntimeError(f"API server bundle not found at: {api_entry}")

    env = os.environ.copy()
    env['PORT'] = str(API_PORT)
    env['NODE_ENV'] = 'production'
    env['DATABASE_URL'] = config.get('DATABASE_URL', '')
    env['DEMO_MODE'] = 'true' if demo_mode else 'false'
    env['SESSION_SECRET'] = config.get('SESSION_SECRET', 'python-desktop-fallback-secret')
    env['DEEPSEEK_API_KEY'] = config.get('DEEPSEEK_API_KEY', '')

    # Hide the Node.js console window on Windows
    kwargs = {}
    if sys.platform == 'win32':
        kwargs['creationflags'] = subprocess.CREATE_NO_WINDOW

    return subprocess.Popen(
        [node, api_entry],
        env=env,
        cwd=os.path.dirname(api_entry),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        **kwargs
    )


def wait_for_api(timeout=30):
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            urllib.request.urlopen(
                f'http://127.0.0.1:{API_PORT}/api/healthz',
                timeout=1
            )
            return True
        except Exception:
            time.sleep(0.5)
    return False


# ─── Static frontend server (with SPA fallback) ─────────────────────────────
class SPAHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, directory=None, **kwargs):
        self.directory = directory or os.getcwd()
        super().__init__(*args, directory=self.directory, **kwargs)

    def translate_path(self, path):
        real_path = super().translate_path(path)
        # If the file doesn't exist or is a directory, fall back to index.html
        # so the React SPA router works on page refresh.
        if not os.path.exists(real_path) or os.path.isdir(real_path):
            return os.path.join(self.directory, 'index.html')
        return real_path


def start_web_server():
    frontend_dir = resource_path('frontend')
    if not os.path.exists(frontend_dir):
        raise RuntimeError(f"Frontend bundle not found at: {frontend_dir}")

    server = ThreadingHTTPServer(
        ('127.0.0.1', WEB_PORT),
        lambda *args, **kwargs: SPAHandler(*args, directory=frontend_dir, **kwargs)
    )
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server


# ─── Application entry point ─────────────────────────────────────────────────
def main():
    log_file = setup_logging()

    try:
        config = load_config()

        db_reachable = is_db_reachable(config.get('DATABASE_URL'))
        demo_mode = not db_reachable

        if demo_mode:
            print("[SmartSchool] Database unreachable. Starting in Demo Mode.")
        else:
            print("[SmartSchool] Database reachable. Starting in Live Mode.")

        print(f"[SmartSchool] Starting API server on port {API_PORT}...")
        api_proc = start_api_server(config, demo_mode)

        print("[SmartSchool] Waiting for API to be ready...")
        if not wait_for_api():
            raise RuntimeError("API server did not start in time.")

        print(f"[SmartSchool] Starting web server on port {WEB_PORT}...")
        web_server = start_web_server()

        print("[SmartSchool] Opening application window...")
        import webview

        webview.create_window(
            'SmartSchool – SMK Bangsar',
            f'http://127.0.0.1:{WEB_PORT}',
            maximized=True,
            min_size=(1024, 700)
        )
        webview.start()

    except Exception as e:
        print(f"[SmartSchool] ERROR: {e}")
        # Re-raise so the bundled app can show a Windows error if needed
        raise
    finally:
        # Cleanup
        try:
            web_server.shutdown()
        except Exception:
            pass
        try:
            api_proc.terminate()
            api_proc.wait(timeout=5)
        except Exception:
            try:
                api_proc.kill()
            except Exception:
                pass
        if log_file:
            log_file.close()


if __name__ == '__main__':
    main()
