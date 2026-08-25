"""Database migration: create audit_log table if it doesn't exist.
Safe to re-run.

Usage: python migrate_audit_log.py [path/to/memberlist.db]
"""
import sqlite3
import sys

def migrate(db_path):
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute('''
        CREATE TABLE IF NOT EXISTS audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            member_id INTEGER,
            actor_username TEXT,
            actor_name TEXT,
            actor_email TEXT,
            actor_type TEXT DEFAULT 'admin',
            action TEXT NOT NULL,
            details TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (member_id) REFERENCES member(id) ON DELETE CASCADE
        )
    ''')
    cur.execute('CREATE INDEX IF NOT EXISTS idx_audit_log_member_id ON audit_log(member_id)')
    conn.commit()
    conn.close()
    print(f"[{db_path}] audit_log table verified/created successfully.")

if __name__ == '__main__':
    db_path = sys.argv[1] if len(sys.argv) > 1 else 'instance/memberlist251.db'
    migrate(db_path)
    # Also migrate instance/new.db if present
    try:
        migrate('backend/instance/new.db')
    except Exception:
        pass
