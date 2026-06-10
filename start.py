import subprocess
import sys
import os
import time
import socket
import webbrowser
import threading
import re
import shutil

ROOT         = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(ROOT, "frontend")


# ── PORT UTILS ────────────────────────────────────────────────
def find_free_port(start, end):
    for port in range(start, end):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(("", port))
                return port
            except OSError:
                continue
    raise RuntimeError(f"No free port between {start}-{end}")


def get_local_ip():
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            return s.getsockname()[0]
    except Exception:
        return "127.0.0.1"


def wait_for_port(port, timeout=30):
    for _ in range(timeout):
        time.sleep(1)
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.settimeout(1)
                if s.connect_ex(("127.0.0.1", port)) == 0:
                    return True
        except Exception:
            pass
    return False


# ── ENV WRITER ────────────────────────────────────────────────
def write_env(api_url, ws_url, password="volleyball2026"):
    env_path = os.path.join(FRONTEND_DIR, ".env")
    with open(env_path, "w") as f:
        f.write(f"VITE_API_URL={api_url}\n")
        f.write(f"VITE_WS_URL={ws_url}\n")
        f.write(f"VITE_ADMIN_PASSWORD={password}\n")
    print(f"  ✅ .env written")
    print(f"     API → {api_url}")
    print(f"     WS  → {ws_url}")


# ── CLOUDFLARE TUNNEL ─────────────────────────────────────────
def start_tunnel(local_port, label):
    """
    Start a cloudflare tunnel for a local port.
    Returns (process, tunnel_url) or (process, None) if URL not found.
    """
    if not shutil.which("cloudflared"):
        return None, None

    proc = subprocess.Popen(
        [
            "cloudflared", "tunnel",
            "--url", f"http://localhost:{local_port}",
            "--no-autoupdate",
            "--protocol", "http2",
            "--edge-ip-version", "4",
        ],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )

    url = None
    url_pattern = re.compile(r'https://[a-zA-Z0-9\-]+\.trycloudflare\.com')

    # Read output until we find the URL (timeout 30s)
    start = time.time()
    while time.time() - start < 30:
        line = proc.stdout.readline()
        if not line:
            break
        line = line.strip()
        if line:
            print(f"  [Tunnel:{label}] {line}")
        match = url_pattern.search(line)
        if match:
            url = match.group(0)
            print(f"  ✅ {label} tunnel: {url}")
            break

    return proc, url


# ── STREAM LOGS ───────────────────────────────────────────────
def stream_logs(name, process):
    def _stream():
        for line in process.stdout:
            line = line.rstrip()
            if line:
                print(f"  [{name}] {line}")
    t = threading.Thread(target=_stream, daemon=True)
    t.start()


# ── MAIN ──────────────────────────────────────────────────────
def main():
    use_shell = sys.platform == "win32"

    # ── READ ARGS ─────────────────────────────────────────────
    use_cloudflare = "--cloudflare" in sys.argv or "-c" in sys.argv
    admin_password = "volleyball2026"

    # Allow custom password: python start.py --password mypassword
    if "--password" in sys.argv:
        idx = sys.argv.index("--password")
        if idx + 1 < len(sys.argv):
            admin_password = sys.argv[idx + 1]

    print("="*60)
    print("  🏐 Volleyball Tournament")
    if use_cloudflare:
        print("  Mode: 🌐 Cloudflare (public access)")
    else:
        print("  Mode: 🏠 Local network")
    print("="*60)

    # ── FIND PORTS ────────────────────────────────────────────
    api_port      = find_free_port(8000, 8006)
    frontend_port = find_free_frontend_port = find_free_port(5173, 5200)
    local_ip      = get_local_ip()

    print(f"\n  Backend port:  {api_port}")
    print(f"  Frontend port: {frontend_port}")

    processes = []

    # ── START BACKEND ─────────────────────────────────────────
    print("\n" + "="*60)
    print("  Starting backend...")
    print("="*60)

    backend = subprocess.Popen(
        [
            sys.executable, "-m", "uvicorn",
            "backend.main:app",
            "--host", "0.0.0.0",
            "--port", str(api_port),
            "--reload"
        ],
        cwd=ROOT,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )
    processes.append(("Backend", backend))

    print("  Waiting for backend", end="", flush=True)
    ready = wait_for_port(api_port)
    if ready:
        print(" ✅")
    else:
        print(" ❌ Backend did not start")
        sys.exit(1)

    stream_logs("Backend", backend)

    # ── CLOUDFLARE MODE ───────────────────────────────────────
    if use_cloudflare:
        if not shutil.which("cloudflared"):
            print("\n  ❌ cloudflared not found.")
            print("     Install: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/")
            print("     Falling back to local mode...\n")
            use_cloudflare = False
        else:
            print("\n" + "="*60)
            print("  Starting Cloudflare tunnels...")
            print("="*60)

            # Backend tunnel
            print(f"\n  Opening backend tunnel (port {api_port})...")
            cf_backend, backend_public_url = start_tunnel(api_port, "API")

            if not backend_public_url:
                print("  ❌ Could not get backend tunnel URL")
                print("  Falling back to local mode...")
                use_cloudflare = False
                if cf_backend:
                    cf_backend.terminate()
            else:
                processes.append(("CF-Backend", cf_backend))

                # Frontend tunnel needs the env written first
                # so write with backend URL now
                api_url = backend_public_url
                ws_url  = backend_public_url.replace("https://", "wss://")
                write_env(api_url, ws_url, admin_password)

    # ── LOCAL MODE ────────────────────────────────────────────
    if not use_cloudflare:
        api_url = f"http://{local_ip}:{api_port}"
        ws_url  = f"ws://{local_ip}:{api_port}"
        write_env(api_url, ws_url, admin_password)

    # ── START FRONTEND ────────────────────────────────────────
    print("\n" + "="*60)
    print("  Starting frontend...")
    print("="*60)

    frontend = subprocess.Popen(
        "npm run dev -- --host 0.0.0.0 --port " + str(frontend_port)
        if use_shell else
        ["npm", "run", "dev", "--",
         "--host", "0.0.0.0",
         "--port", str(frontend_port)],
        cwd=FRONTEND_DIR,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
        shell=use_shell
    )
    processes.append(("Frontend", frontend))

    print("  Waiting for frontend", end="", flush=True)
    ready = wait_for_port(frontend_port)
    if ready:
        print(" ✅")
    else:
        print(" ❌ Frontend did not start")
        for _, p in processes:
            p.terminate()
        sys.exit(1)

    stream_logs("Frontend", frontend)

    # ── CLOUDFLARE FRONTEND TUNNEL ────────────────────────────
    frontend_public_url = None
    if use_cloudflare:
        print(f"\n  Opening frontend tunnel (port {frontend_port})...")
        cf_frontend, frontend_public_url = start_tunnel(frontend_port, "Frontend")
        if frontend_public_url:
            processes.append(("CF-Frontend", cf_frontend))
        else:
            print("  ⚠️  Could not get frontend tunnel URL")
            print(f"  Local frontend still available at:")
            print(f"  http://{local_ip}:{frontend_port}")

    # ── PRINT ACCESS INFO ─────────────────────────────────────
    print("\n" + "="*60)
    print("  🏐 VOLLEYBALL TOURNAMENT IS LIVE")
    print("="*60)

    if use_cloudflare and frontend_public_url:
        print(f"""
  🌐 PUBLIC URL (share this with everyone):
     {frontend_public_url}

  🔒 Admin panel:
     {frontend_public_url}/admin

  🔌 API (public):
     {backend_public_url}

  🔌 API Docs:
     {backend_public_url}/docs
""")
    else:
        print(f"""
  📱 Local network URL (share on same WiFi):
     http://{local_ip}:{frontend_port}

  🔒 Admin panel:
     http://{local_ip}:{frontend_port}/admin

  🔌 API Docs:
     http://{local_ip}:{api_port}/docs
""")

    print(f"  🔑 Admin password: {admin_password}")
    print(f"\n  Press Ctrl+C to stop all servers")
    print("="*60)

    # Open browser
    time.sleep(1)
    if use_cloudflare and frontend_public_url:
        webbrowser.open(frontend_public_url)
    else:
        webbrowser.open(f"http://localhost:{frontend_port}")

    # ── MONITOR & WAIT ────────────────────────────────────────
    try:
        while True:
            for name, proc in processes:
                if proc.poll() is not None:
                    # Tunnels can restart — only exit for core processes
                    if name in ("Backend", "Frontend"):
                        print(f"\n  ❌ {name} crashed — shutting down")
                        for n, p in processes:
                            if p.poll() is None:
                                p.terminate()
                        sys.exit(1)
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
        print("  ✅ All servers stopped. Goodbye!")


if __name__ == "__main__":
    main()