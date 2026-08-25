"""One-off migration: add the screening/application fields to an existing
member table (SQLite ALTER TABLE ADD COLUMN, no data loss). Safe to re-run —
skips columns that already exist.

Usage: python migrate_screening_fields.py [path/to/memberlist251.db]
"""
import sqlite3
import sys

NEW_COLUMNS = {
    'phone': 'TEXT',
    'major_class': 'TEXT',
    'student_type': 'TEXT',
    'sub_departments': 'TEXT',
    'confirm_token': 'TEXT',
    'confirm_password_hash': 'TEXT',
    'reschedule_request': 'TEXT',
    'confirmed_at': 'TEXT',
}

def migrate(db_path):
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    existing = {row[1] for row in cur.execute("PRAGMA table_info(member)")}
    for column, col_type in NEW_COLUMNS.items():
        if column in existing:
            print(f"[{db_path}] column '{column}' already exists, skipping")
            continue
        cur.execute(f"ALTER TABLE member ADD COLUMN {column} {col_type}")
        print(f"[{db_path}] added column '{column}'")
    conn.commit()
    conn.close()

if __name__ == '__main__':
    db_path = sys.argv[1] if len(sys.argv) > 1 else 'instance/memberlist251.db'
    migrate(db_path)
