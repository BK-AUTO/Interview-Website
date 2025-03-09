import csv
import sqlite3
import os

# Database path
db_file = 'backend/instance/memberlist.db'

def create_table(conn):
    """Creates the Member table if it doesn't exist."""
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS Member (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            MSSV TEXT NOT NULL,
            email TEXT,
            specialist TEXT,
            UID TEXT,
            checkin_time TEXT,
            state TEXT,
            role TEXT,
            IDcard TEXT
        )
    ''')
    conn.commit()

def import_data_from_csv(conn, filename):
    """Imports data from the CSV file into the database."""
    default_check_in_state = 'Chưa checkin'
    cursor = conn.cursor()
    
    with open(filename, 'r', encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            cursor.execute('''
                INSERT INTO Member (name, MSSV, email, specialist, UID, checkin_time, state, role, IDcard) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                row['Họ và tên'], 
                row['MSSV'],
                row.get('Email HUST', ''),
                row['Mảng'],
                row.get('UID', ''),
                None,  # checkin_time
                default_check_in_state,  # state
                '',    # role (keeping empty for compatibility)
                row.get('UID', '')  # Using UID as IDcard for compatibility
            ))
    conn.commit()

def main():
    # Ensure the directory exists
    os.makedirs(os.path.dirname(db_file), exist_ok=True)
    
    # Connect to database
    conn = sqlite3.connect(db_file)
    
    # Drop and recreate table to reset
    conn.execute("DROP TABLE IF EXISTS Member")
    create_table(conn)
    
    # Import data from CSV
    import_data_from_csv(conn, 'memberlist.csv')
    
    # Close the connection
    conn.close()
    
    print(f"Data imported from CSV to '{db_file}' successfully.")

if __name__ == "__main__":
    main()