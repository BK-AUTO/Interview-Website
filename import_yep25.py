import csv
import sqlite3
import os

# Database path
db_file = 'backend/instance/memberlist.db'

def create_table(conn):
    """Creates the Member table for YEP 2025 event."""
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS Member (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            khoa TEXT,
            MSSV TEXT,
            participation_type TEXT,
            member_type TEXT,
            checkin_time TEXT,
            state TEXT DEFAULT 'Chưa checkin',
            checkin_ceremony INTEGER DEFAULT 0,
            checkin_party INTEGER DEFAULT 0
        )
    ''')
    conn.commit()

def determine_member_type(khoa):
    """Determine if member is CSV (former student) or current student."""
    if not khoa:
        return 'UNKNOWN'
    khoa_upper = khoa.upper()
    if 'CSV' in khoa_upper or 'NCS' in khoa_upper:
        return 'CSV'
    # K66, K67, K68, K69, K70 are current students
    for k in ['K66', 'K67', 'K68', 'K69', 'K70']:
        if k in khoa_upper:
            return 'CURRENT'
    return 'CSV'  # Default older K courses as CSV

def normalize_participation_type(value):
    """Normalize participation type value."""
    if not value or value.strip() == '':
        return None  # CSV members don't have participation type
    value = value.strip()
    if value == 'Cả hai':
        return 'Cả hai'
    elif 'lễ' in value.lower():
        return 'Phần lễ'
    elif 'hội' in value.lower():
        return 'Phần hội'
    return value

def extract_khoa(khoa_value):
    """Extract clean khoa value."""
    if not khoa_value:
        return None
    # Remove 'CSV ' prefix if present
    khoa = khoa_value.strip()
    if khoa.startswith('CSV '):
        khoa = khoa[4:]  # Remove 'CSV ' prefix
    return khoa

def import_data_from_csv(conn, filename):
    """Imports data from the YEP 2025 CSV file into the database."""
    default_check_in_state = 'Chưa checkin'
    cursor = conn.cursor()
    
    with open(filename, 'r', encoding='utf-8-sig') as csvfile:
        reader = csv.DictReader(csvfile)
        row_count = 0
        for row in reader:
            name = row.get('Tên', '').strip()
            if not name:  # Skip empty rows
                continue
                
            khoa_raw = row.get('Khóa', '').strip()
            mssv = row.get('MSSV', '').strip() or None
            participation_raw = row.get('Tham gia phần (Lễ/hội)', '').strip()
            
            khoa = extract_khoa(khoa_raw)
            member_type = determine_member_type(khoa_raw)
            participation_type = normalize_participation_type(participation_raw)
            
            cursor.execute('''
                INSERT INTO Member (name, khoa, MSSV, participation_type, member_type, 
                                   checkin_time, state, checkin_ceremony, checkin_party) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                name,
                khoa,
                mssv,
                participation_type,
                member_type,
                None,  # checkin_time
                default_check_in_state,  # state
                0,     # checkin_ceremony
                0      # checkin_party
            ))
            row_count += 1
    
    conn.commit()
    return row_count

def main():
    # Ensure the directory exists
    os.makedirs(os.path.dirname(db_file), exist_ok=True)
    
    # Connect to database
    conn = sqlite3.connect(db_file)
    
    # Drop and recreate table to reset
    conn.execute("DROP TABLE IF EXISTS Member")
    create_table(conn)
    
    # Import data from CSV
    count = import_data_from_csv(conn, 'bkautoyep25list.csv')
    
    # Close the connection
    conn.close()
    
    print(f"YEP 2025 data imported from CSV to '{db_file}' successfully.")
    print(f"Total members imported: {count}")

if __name__ == "__main__":
    main()

