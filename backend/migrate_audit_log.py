"""Database migration: create audit_log table if it doesn't exist, or add the
member_name_snapshot / member_mssv_snapshot columns to one that was created
before this script's ON DELETE CASCADE -> SET NULL change. Safe to re-run.

The audit trail must survive a deleted candidate: ON DELETE SET NULL (not
CASCADE) means deleting a member row detaches the FK but never removes the
log rows, and the snapshot columns keep each row human-readable (name/MSSV)
even after member_id goes NULL. Mirrors app.py's AuditLog model — keep both
in sync.

Usage: python migrate_audit_log.py [path/to/memberlist.db]
"""
import sqlite3
import sys

NEW_COLUMNS = {
    'member_name_snapshot': 'TEXT',
    'member_mssv_snapshot': 'TEXT',
}

def migrate(db_path):
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute('''
        CREATE TABLE IF NOT EXISTS audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            member_id INTEGER,
            member_name_snapshot TEXT,
            member_mssv_snapshot TEXT,
            actor_username TEXT,
            actor_name TEXT,
            actor_email TEXT,
            actor_type TEXT DEFAULT 'admin',
            action TEXT NOT NULL,
            details TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (member_id) REFERENCES member(id) ON DELETE SET NULL
        )
    ''')
    cur.execute('CREATE INDEX IF NOT EXISTS idx_audit_log_member_id ON audit_log(member_id)')

    # Table may already exist from before the snapshot columns / SET NULL
    # change — SQLite can't ALTER a FK's ON DELETE action in place, but that's
    # moot here since SQLite ignores FK actions unless "PRAGMA foreign_keys=ON"
    # is set per-connection (this app never sets it), so an old CASCADE
    # definition is inert. Just backfill the missing columns.
    existing = {row[1] for row in cur.execute("PRAGMA table_info(audit_log)")}
    for column, col_type in NEW_COLUMNS.items():
        if column in existing:
            print(f"[{db_path}] column '{column}' already exists, skipping")
            continue
        cur.execute(f"ALTER TABLE audit_log ADD COLUMN {column} {col_type}")
        print(f"[{db_path}] added column '{column}'")

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
