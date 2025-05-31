import csv
import sqlite3
import os

# Database path
db_file = 'backend/instance/memberlist.db'

def create_table(conn):
    """Creates the Member table for anniversary event."""
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS Member (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            MSSV TEXT,
            khoa TEXT,
            organization TEXT,
            join_year TEXT,
            former_role TEXT,
            lottery_number INTEGER,
            checkin_time TEXT,
            state TEXT DEFAULT 'Chưa checkin'
        )
    ''')
    conn.commit()

def import_data_from_csv(conn, filename):
    """Imports data from the anniversary CSV file into the database."""
    default_check_in_state = 'Chưa checkin'
    cursor = conn.cursor()
    
    with open(filename, 'r', encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            cursor.execute('''
                INSERT INTO Member (name, MSSV, khoa, organization, join_year, former_role, lottery_number, checkin_time, state) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                row['Họ và Tên'], 
                row['MSSV'] if row['MSSV'] else None,
                row['Khóa'],
                row['Tổ chức/Nguồn gốc'],
                row['Năm tham gia'] if row['Năm tham gia'] else None,
                row['Cựu vai trò ở CLB'] if row['Cựu vai trò ở CLB'] else None,
                None,  # lottery_number - will be set during checkin
                None,  # checkin_time
                default_check_in_state  # state
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
    import_data_from_csv(conn, 'bk_auto_15th_anniversary.csv')
    
    # Close the connection
    conn.close()
    
    print(f"Anniversary data imported from CSV to '{db_file}' successfully.")

if __name__ == "__main__":
    main()
