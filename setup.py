import subprocess
import sys
import os
import shutil

ROOT = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(ROOT, "frontend")


def run(cmd, cwd=None, shell=False):
    print(f"\n  $ {' '.join(cmd) if isinstance(cmd, list) else cmd}")
    result = subprocess.run(
        cmd,
        cwd=cwd or ROOT,
        shell=shell,
        text=True
    )
    if result.returncode != 0:
        print(f"  ❌ Command failed with code {result.returncode}")
        sys.exit(result.returncode)
    return result


def check(tool):
    return shutil.which(tool) is not None


def header(title):
    print(f"\n{'=' * 60}")
    print(f"  {title}")
    print(f"{'=' * 60}")


def main():
    print("=" * 60)
    print("  🏐 Volleyball Tournament — First Time Setup")
    print("=" * 60)

    # ── CHECK REQUIRED TOOLS ──────────────────────────────────
    header("Checking required tools")

    missing = []
    for tool in ["uv", "node", "npm"]:
        if check(tool):
            print(f"  ✅ {tool} found")
        else:
            print(f"  ❌ {tool} not found")
            missing.append(tool)

    if missing:
        print(f"\n  Missing tools: {', '.join(missing)}")
        print("  Install them before running this script:")
        if "uv" in missing:
            print("    uv:   https://docs.astral.sh/uv/getting-started/installation/")
        if "node" in missing or "npm" in missing:
            print("    node: https://nodejs.org/")
        sys.exit(1)

    # ── PYTHON DEPENDENCIES ───────────────────────────────────
    header("Installing Python dependencies (uv)")

    run(["uv", "sync"])
    print("  ✅ Python dependencies installed")

    # ── FRONTEND DEPENDENCIES ─────────────────────────────────
    header("Installing frontend dependencies (npm)")

    if not os.path.exists(FRONTEND_DIR):
        print(f"  ❌ Frontend directory not found at {FRONTEND_DIR}")
        print("     Make sure you have the frontend folder in your project root")
        sys.exit(1)

    # Use shell=True on Windows for npm
    use_shell = sys.platform == "win32"
    run(
        "npm install" if use_shell else ["npm", "install"],
        cwd=FRONTEND_DIR,
        shell=use_shell
    )
    print("  ✅ Frontend dependencies installed")

    # ── DATABASE INIT ─────────────────────────────────────────
    header("Initializing database")

    db_path = os.path.join(ROOT, "database", "tournament.db")
    if os.path.exists(db_path):
        print("  ⚠️  Database already exists — skipping init")
        print(f"     If you want a fresh start run:")
        print(f"     uv run python database/database.py reset")
    else:
        run(["uv", "run", "python", "database/database.py", "init"])
        print("  ✅ Database initialized")

    # ── FRONTEND ENV ──────────────────────────────────────────
    header("Setting up frontend .env")

    env_path = os.path.join(FRONTEND_DIR, ".env")
    if os.path.exists(env_path):
        print("  ⚠️  .env already exists — skipping")
        print(f"     Edit {env_path} manually if needed")
    else:
        with open(env_path, "w") as f:
            f.write("""VITE_API_URL=http://localhost:8003
VITE_WS_URL=ws://localhost:8003
VITE_ADMIN_PASSWORD=volleyball2026
""")
        print("  ✅ frontend/.env created with defaults")
        print("  ⚠️  Remember to change VITE_ADMIN_PASSWORD before tournament day")

    # ── DONE ──────────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("  ✅ Setup complete")
    print("=" * 60)
    print("""
  Next steps:

  1. Seed your data (players + teams):
     uv run python your_seed_script.py

  2. Start the tournament:
     uv run python start.py

  3. Change admin password in frontend/.env before go-live:
     VITE_ADMIN_PASSWORD=yournewpassword
""")


if __name__ == "__main__":
    main()