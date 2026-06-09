import os
import sqlite3

DB_PATH = os.path.join(os.path.dirname(__file__), "tournament.db")
SCHEMA_PATH = os.path.join(os.path.dirname(__file__), "schema.sql")


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")
    return conn


def init_db():
    if not os.path.exists(SCHEMA_PATH):
        raise FileNotFoundError(f"schema.sql not found at {SCHEMA_PATH}")

    with open(SCHEMA_PATH, "r") as f:
        schema = f.read()

    conn = get_connection()
    try:
        conn.executescript(schema)
        conn.commit()
        print("Database initialized successfully.")
    except sqlite3.Error as e:
        print(f"Database initialization failed: {e}")
        raise
    finally:
        conn.close()


def drop_db():
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)
        print("Database dropped.")
    else:
        print("No database found to drop.")


def reset_db():
    drop_db()
    init_db()
    print("Database reset complete.")


if __name__ == "__main__":
    import sys

    command = sys.argv[1] if len(sys.argv) > 1 else "init"

    if command == "init":
        init_db()
    elif command == "reset":
        reset_db()
    elif command == "drop":
        drop_db()
    else:
        print(f"Unknown command: {command}")
        print("Usage: python database.py [init|reset|drop]")
