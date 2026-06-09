import os
import signal
import socket
import subprocess
import sys
import time
import webbrowser


# ── FIND NEXT AVAILABLE PORT ──────────────────────────────────
def find_free_port(start=8000, end=8100):
    for port in range(start, end):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(("", port))
                return port
            except OSError:
                continue
    raise RuntimeError(f"No free port found between {start} and {end}")


def find_free_frontend_port(start=5173, end=5200):
    for port in range(start, end):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(("", port))
                return port
            except OSError:
                continue
    raise RuntimeError(f"No free frontend port found between {start} and {end}")


# ── GET LOCAL IP ──────────────────────────────────────────────
def get_local_ip():
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            return s.getsockname()[0]
    except Exception:
        return "127.0.0.1"


# ── WRITE FRONTEND ENV ────────────────────────────────────────
def write_frontend_env(api_port, local_ip):
    env_path = os.path.join(os.path.dirname(__file__), "frontend", ".env")
    content = f"""VITE_API_URL=http://{local_ip}:{api_port}
VITE_WS_URL=ws://{local_ip}:{api_port}
VITE_ADMIN_PASSWORD=volleyball2026
"""
    with open(env_path, "w") as f:
        f.write(content)
    print(f"  ✅ Frontend .env written → API at {local_ip}:{api_port}")


# ── MAIN ──────────────────────────────────────────────────────
def main():
    root = os.path.dirname(os.path.abspath(__file__))

    print("=" * 60)
    print("🏐 Volleyball Tournament — Starting Servers")
    print("=" * 60)

    # Find ports
    api_port = find_free_port(8000, 8100)
    frontend_port = find_free_frontend_port(5173, 5200)
    local_ip = get_local_ip()

    print(f"\n  Backend  → http://{local_ip}:{api_port}")
    print(f"  Frontend → http://{local_ip}:{frontend_port}")
    print(f"  API Docs → http://{local_ip}:{api_port}/docs")

    # Write frontend .env with correct IP and port
    write_frontend_env(api_port, local_ip)

    processes = []

    # ── START BACKEND ─────────────────────────────────────────
    print("\n  Starting backend...")
    backend_cmd = [
        sys.executable,
        "-m",
        "uvicorn",
        "backend.main:app",
        "--host",
        "0.0.0.0",
        "--port",
        str(api_port),
        "--reload",
    ]
    backend = subprocess.Popen(
        backend_cmd,
        cwd=root,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
    )
    processes.append(("Backend", backend))

    # Wait for backend to be ready
    print("  Waiting for backend to be ready", end="", flush=True)
    for _ in range(30):
        time.sleep(1)
        print(".", end="", flush=True)
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.settimeout(1)
                if s.connect_ex(("127.0.0.1", api_port)) == 0:
                    print(" ✅")
                    break
        except Exception:
            pass
    else:
        print(" ❌ Backend did not start in time")

    # ── START FRONTEND ────────────────────────────────────────
    print("\n  Starting frontend...")
    frontend_dir = os.path.join(root, "frontend")

    # Detect package manager
    npm_cmd = "npm"
    if os.path.exists(os.path.join(frontend_dir, "pnpm-lock.yaml")):
        npm_cmd = "pnpm"
    elif os.path.exists(os.path.join(frontend_dir, "yarn.lock")):
        npm_cmd = "yarn"

    frontend_cmd = [
        npm_cmd,
        "run",
        "dev",
        "--",
        "--host",
        "0.0.0.0",
        "--port",
        str(frontend_port),
    ]

    # Windows needs shell=True for npm
    use_shell = sys.platform == "win32"

    frontend = subprocess.Popen(
        frontend_cmd,
        cwd=frontend_dir,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
        shell=use_shell,
    )
    processes.append(("Frontend", frontend))

    # Wait for frontend to be ready
    print("  Waiting for frontend to be ready", end="", flush=True)
    for _ in range(30):
        time.sleep(1)
        print(".", end="", flush=True)
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.settimeout(1)
                if s.connect_ex(("127.0.0.1", frontend_port)) == 0:
                    print(" ✅")
                    break
        except Exception:
            pass
    else:
        print(" ❌ Frontend did not start in time")

    # ── PRINT ACCESS INFO ─────────────────────────────────────
    print("\n" + "=" * 60)
    print("🏐 VOLLEYBALL TOURNAMENT IS LIVE")
    print("=" * 60)
    print(f"\n  📱 Open on any device on this network:")
    print(f"     http://{local_ip}:{frontend_port}")
    print(f"\n  🖥️  Admin panel:")
    print(f"     http://{local_ip}:{frontend_port}/admin")
    print(f"\n  🔌 API Docs:")
    print(f"     http://{local_ip}:{api_port}/docs")
    print(f"\n  Password: volleyball2026")
    print("\n  Press Ctrl+C to stop both servers")
    print("=" * 60)

    # Open browser automatically
    time.sleep(1)
    webbrowser.open(f"http://localhost:{frontend_port}")

    # ── STREAM LOGS ───────────────────────────────────────────
    def stream_logs(name, process):
        import threading

        def _stream():
            for line in process.stdout:
                line = line.rstrip()
                if line:
                    print(f"  [{name}] {line}")

        t = threading.Thread(target=_stream, daemon=True)
        t.start()

    for name, proc in processes:
        stream_logs(name, proc)

    # ── WAIT FOR CTRL+C ───────────────────────────────────────
    try:
        while True:
            # Check if either process died
            for name, proc in processes:
                if proc.poll() is not None:
                    print(f"\n  ⚠️  {name} process exited unexpectedly")
            time.sleep(2)
    except KeyboardInterrupt:
        print("\n\n  Shutting down...")
        for name, proc in processes:
            print(f"  Stopping {name}...")
            proc.terminate()
            try:
                proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                proc.kill()
        print("  ✅ Both servers stopped. Goodbye!")


if __name__ == "__main__":
    main()
