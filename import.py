import csv
import sqlite3
import os
import requests
from io import StringIO
import pandas as pd
from datetime import datetime

# Database path - đồng bộ với app.py
db_file = 'backend/instance/memberlist251.db'
def get_google_sheet_data(sheet_url):
    """
    Lấy dữ liệu từ Google Sheets public
    """
    try:
        # Chuyển đổi URL Google Sheets thành URL CSV
        if '/edit' in sheet_url:
            # Lấy sheet ID từ URL
            sheet_id = sheet_url.split('/d/')[1].split('/')[0]
            csv_url = f"https://docs.google.com/spreadsheets/d/{sheet_id}/export?format=csv&gid=0"
        else:
            csv_url = sheet_url + '/export?format=csv'
        
        print(f"Đang tải dữ liệu từ: {csv_url}")
        
        response = requests.get(csv_url)
        response.raise_for_status()
        
        # Thử các encoding khác nhau
        encodings_to_try = ['utf-8', 'utf-8-sig', 'latin1', 'cp1252', 'iso-8859-1']
        df = None
        
        for encoding in encodings_to_try:
            try:
                print(f"Thử encoding: {encoding}")
                # Decode response với encoding cụ thể
                content = response.content.decode(encoding)
                df = pd.read_csv(StringIO(content), on_bad_lines='skip')
                print(f"Thành công với encoding: {encoding}")
                break
            except Exception as e:
                print(f"Encoding {encoding} failed: {e}")
                continue
        
        if df is None:
            print("Không thể đọc được dữ liệu với bất kỳ encoding nào")
            return None
        
        # Loại bỏ các dòng hoàn toàn trống
        df = df.dropna(how='all')
        
        # Chỉ lấy 14 cột đầu tiên để đảm bảo đúng format
        if len(df.columns) > 14:
            df = df.iloc[:, :14]
        
        print(f"Đã tải thành công {len(df)} dòng dữ liệu")
        print(f"Số cột: {len(df.columns)}")
        
        return df
    except Exception as e:
        print(f"Lỗi khi lấy dữ liệu từ Google Sheets: {e}")
        print("Hãy thử:")
        print("1. Kiểm tra URL Google Sheets có đúng không")
        print("2. Đảm bảo Google Sheets được chia sẻ công khai")
        print("3. Kiểm tra format dữ liệu trong sheet")
        return None

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
            linkCV TEXT,
            checkin_time TEXT,
            state TEXT,
            note TEXT
        )
    ''')
    conn.commit()

def import_data_from_google_sheet(conn, df):
    """Imports data from Google Sheets DataFrame into the database."""
    default_check_in_state = 'Chưa checkin'
    cursor = conn.cursor()
    
    # Tên các cột dựa trên dữ liệu mẫu
    expected_columns = [
        'Timestamp', 'Họ tên', 'MSSV/Trường', 'Ngành/Lớp', 'Email', 'SĐT', 
        'Loại SV', 'Mảng chính', 'Mảng phụ', 'File name', 'linkCV', 
        'File size', 'Câu hỏi', 'Trạng thái'
    ]
    
    # Đặt tên cột cho DataFrame nếu cần
    if len(df.columns) >= len(expected_columns):
        df.columns = expected_columns[:len(df.columns)]
    elif len(df.columns) < len(expected_columns):
        print(f"Cảnh báo: Chỉ có {len(df.columns)} cột, mong đợi {len(expected_columns)} cột")
        # Sử dụng tên cột hiện tại nếu không đủ
        pass
    
    # Đếm số bản ghi đã thêm và bỏ qua
    added_count = 0
    skipped_count = 0
    
    for index, row in df.iterrows():
        try:
            # Kiểm tra cột "Trạng thái" (cột thứ 14 - index 13)
            status_col = 'Trạng thái' if 'Trạng thái' in df.columns else df.columns[-1] if len(df.columns) >= 14 else None
            
            if status_col:
                status = str(row.get(status_col, '')).strip()
                if status != 'Duyệt':
                    print(f"Bỏ qua dòng {index + 2}: Trạng thái = '{status}' (không phải 'Duyệt')")
                    skipped_count += 1
                    continue
            else:
                print(f"Cảnh báo: Không tìm thấy cột trạng thái, import tất cả dữ liệu")
            
            # Lấy dữ liệu từ các cột cần thiết với fallback
            name = str(row.get('Họ tên', row.iloc[1] if len(row) > 1 else '')).strip()
            mssv = str(row.get('MSSV/Trường', row.iloc[2] if len(row) > 2 else '')).strip()
            email = str(row.get('Email', row.iloc[4] if len(row) > 4 else '')).strip()
            link_cv = str(row.get('linkCV', row.iloc[10] if len(row) > 10 else '')).strip()
            specialist = str(row.get('Mảng chính', row.iloc[7] if len(row) > 7 else '')).strip()
            
            # Kiểm tra dữ liệu bắt buộc
            if not name or not mssv:
                print(f"Bỏ qua dòng {index + 2}: Thiếu họ tên hoặc MSSV (name='{name}', mssv='{mssv}')")
                skipped_count += 1
                continue
            
            # Kiểm tra duplicate MSSV
            cursor.execute('SELECT COUNT(*) FROM Member WHERE MSSV = ?', (mssv,))
            if cursor.fetchone()[0] > 0:
                print(f"Bỏ qua dòng {index + 2}: MSSV '{mssv}' đã tồn tại")
                skipped_count += 1
                continue
            
            cursor.execute('''
                INSERT INTO Member (name, MSSV, email, specialist, linkCV, checkin_time, state, note) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                name,
                mssv,
                email if email != 'nan' else None,
                specialist if specialist != 'nan' else None,
                link_cv if link_cv != 'nan' else None,
                None,  # checkin_time
                default_check_in_state,
                'N/A'  # note
            ))
            
            added_count += 1
            print(f"Đã thêm: {name} - {mssv} - {specialist}")
            
        except Exception as e:
            print(f"Lỗi khi xử lý dòng {index + 2}: {e}")
            print(f"Dữ liệu dòng: {dict(row)}")
            skipped_count += 1
            continue
    
    conn.commit()
    print(f"\n{'='*50}")
    print(f"KẾT QUẢ IMPORT:")
    print(f"- Đã thêm thành công: {added_count} bản ghi")
    print(f"- Bỏ qua: {skipped_count} bản ghi")
    print(f"- Tổng cộng xử lý: {added_count + skipped_count} dòng")
    print(f"{'='*50}")

def show_database_stats(conn):
    """Hiển thị thống kê database sau khi import"""
    cursor = conn.cursor()
    
    try:
        # Đếm tổng số member
        cursor.execute('SELECT COUNT(*) FROM Member')
        total_count = cursor.fetchone()[0]
        
        # Đếm theo trạng thái
        cursor.execute('SELECT state, COUNT(*) FROM Member GROUP BY state')
        state_stats = cursor.fetchall()
        
        # Đếm theo chuyên ngành
        cursor.execute('SELECT specialist, COUNT(*) FROM Member WHERE specialist IS NOT NULL AND specialist != "" GROUP BY specialist')
        specialist_stats = cursor.fetchall()
        
        print(f"\n{'='*60}")
        print(f"THỐNG KÊ DATABASE SAU KHI IMPORT")
        print(f"{'='*60}")
        print(f"Tổng số thành viên: {total_count}")
        
        print(f"\nPhân bố theo trạng thái:")
        for state, count in state_stats:
            print(f"  {state or 'NULL'}: {count}")
        
        if specialist_stats:
            print(f"\nPhân bố theo chuyên ngành:")
            for specialist, count in specialist_stats:
                print(f"  {specialist}: {count}")
        
        print(f"{'='*60}")
        
    except Exception as e:
        print(f"Lỗi khi hiển thị thống kê: {e}")

def backup_database():
    """Tạo backup database trước khi import"""
    if os.path.exists(db_file):
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_file = f"{db_file}.backup_{timestamp}"
        
        try:
            import shutil
            shutil.copy2(db_file, backup_file)
            print(f"Đã tạo backup: {backup_file}")
            return backup_file
        except Exception as e:
            print(f"Lỗi khi tạo backup: {e}")
            return None
    return None

def preview_data(df):
    """Hiển thị preview dữ liệu trước khi import"""
    print("\n=== PREVIEW DỮ LIỆU ===")
    print(f"Tổng số dòng: {len(df)}")
    print(f"Số cột: {len(df.columns)}")
    print("\nCác cột có sẵn:")
    for i, col in enumerate(df.columns):
        print(f"  {i+1:2d}. {col}")
    
    # Hiển thị vài dòng đầu
    print("\n5 dòng đầu tiên:")
    print(df.head().to_string())
    
    # Kiểm tra cột trạng thái
    if 'Trạng thái' in df.columns:
        status_counts = df['Trạng thái'].value_counts()
        print(f"\nPhân bố trạng thái:")
        for status, count in status_counts.items():
            print(f"  '{status}': {count} dòng")
        
        approved_count = sum(df['Trạng thái'] == 'Duyệt')
        print(f"\nSố dòng sẽ được import (trạng thái 'Duyệt'): {approved_count}")
    else:
        print("\nKhông tìm thấy cột 'Trạng thái'!")

def main():
    # Google Sheets URL - cần thay đổi URL này thành URL của sheet thực tế
    # Hoặc có thể hard-code URL ở đây thay vì nhập từ bàn phím
    sheet_url = input("Nhập URL Google Sheets (hoặc Enter để sử dụng URL mặc định): ").strip()
    
    # URL mặc định (cần thay đổi thành URL thực tế của bạn)
    if not sheet_url:
        sheet_url = "https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit#gid=0"
        print(f"Sử dụng URL mặc định: {sheet_url}")
        print("Lưu ý: Vui lòng cập nhật URL mặc định trong code!")
    
    # Lấy dữ liệu từ Google Sheets
    print("Đang lấy dữ liệu từ Google Sheets...")
    df = get_google_sheet_data(sheet_url)
    
    if df is None:
        print("Không thể lấy dữ liệu từ Google Sheets!")
        print("Kiểm tra:")
        print("1. URL có đúng không")
        print("2. Google Sheets có được chia sẻ công khai không")
        print("3. Kết nối internet")
        return
    
    print(f"Đã lấy được {len(df)} dòng dữ liệu từ Google Sheets")
    
    # Hiển thị preview dữ liệu
    preview_data(df)
    
    # Xác nhận trước khi import
    confirm = input("\nBạn có muốn tiếp tục import dữ liệu? (y/N): ").strip().lower()
    if confirm not in ['y', 'yes']:
        print("Đã hủy import.")
        return
    
    # Ensure the directory exists
    os.makedirs(os.path.dirname(db_file), exist_ok=True)
    
    # Tạo backup database hiện tại
    print("\nTạo backup database...")
    backup_file = backup_database()
    
    # Connect to database
    conn = sqlite3.connect(db_file)
    
    # Drop and recreate table to reset
    conn.execute("DROP TABLE IF EXISTS Member")
    create_table(conn)
    
    # Import data from Google Sheets
    import_data_from_google_sheet(conn, df)
    
    # Hiển thị thống kê sau khi import
    show_database_stats(conn)
    
    # Close the connection
    conn.close()
    
    print(f"\nData imported from Google Sheets to '{db_file}' successfully.")

if __name__ == "__main__":
    main()