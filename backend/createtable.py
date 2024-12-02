import sqlite3

# Connect to the database (or create it if it doesn't exist)
conn = sqlite3.connect('instance/memberlist.db')

# Create a cursor object
cursor = conn.cursor()

# Create the Member table
cursor.execute('''
CREATE TABLE "Member" (
    "id" INTEGER,
    "name" TEXT NOT NULL,
    "mssv" TEXT NOT NULL,
    "specialist" TEXT,
    "note" TEXT,
    "IDcard" TEXT,
    "checkin_time" TEXT,
    "state" TEXT NOT NULL,
    PRIMARY KEY("id" AUTOINCREMENT)
);
''')

# Commit the changes and close the connection
conn.commit()
conn.close()