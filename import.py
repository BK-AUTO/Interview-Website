import csv
import sqlite3

# Assuming your database file is named 'interviewer.db'
db_file = 'backend/instance/memberlist.db'

def create_table(conn):
    """Creates the Member table if it doesn't exist."""
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS Member (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            mssv TEXT NOT NULL,
            specialist TEXT,
            note TEXT,
            IDcard TEXT,
            checkin_time TEXT,
            state TEXT NOT NULL
        )
    ''')
    conn.commit()

conn = sqlite3.connect(db_file)
create_table(conn)

def import_data_from_csv(conn, filename):
    """Imports data from the CSV file into the database."""
    default_check_in_state = 'Chưa checkin'
    cursor = conn.cursor()
    with open(filename, 'r', encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            cursor.execute('''
                INSERT INTO Member (mssv, name, specialist, note, IDcard, checkin_time, state) 
                VALUES (?, ?, ?, ?,?,? ,?)
            ''', (
                row['MSSV'], 
                row['Họ và tên'],
                row['Mảng hoạt động'], 
                row['Ghi chú'],
                row['IDcard'],
                'N/A',
                default_check_in_state
            ))
    conn.commit()

conn = sqlite3.connect(db_file)



# Import data from CSV (replace 'your_csv_file.csv' with your actual filename)
import_data_from_csv(conn, 'memberlist.csv')

# Close the connection
conn.close()

print(f"Data imported from CSV to '{db_file}' successfully.")