import os
import io
import smtplib
import threading
import logging
from email.header import Header
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email.mime.image import MIMEImage
from email import encoders
import qrcode

logger = logging.getLogger(__name__)

SMTP_SERVER = os.environ.get("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.environ.get("SMTP_PORT", 587))
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "bkauto.ste@gmail.com")
SENDER_PASSWORD = os.environ.get("SENDER_PASSWORD", "gokc piof wspg vsgr")

def generate_ics_content(full_name: str, mssv: str, receiver_email: str) -> str:
    """Tạo nội dung file iCalendar (.ics) định dạng UTF-8."""
    return f"""BEGIN:VCALENDAR
PRODID:-//CLB BK-AUTO//Recruitment Interview//VI
VERSION:2.0
CALSCALE:GREGORIAN
METHOD:REQUEST
BEGIN:VEVENT
UID:bkauto-2026-interview-{mssv}@hust.edu.vn
DTSTAMP:20260925T000000Z
DTSTART:20260927T010000Z
DTEND:20260927T043000Z
SUMMARY;CHARSET=UTF-8:Phỏng vấn tuyển thành viên CLB BK-AUTO
DESCRIPTION;CHARSET=UTF-8:Chào {full_name}!\\nMSSV: {mssv}\\nĐịa điểm: Nhà Khung – Nhà T, ĐHBK Hà Nội (58 Lê Thanh Nghị).\\nVui lòng mang theo email này để quét mã QR khi check-in.
LOCATION;CHARSET=UTF-8:Nhà Khung – Nhà T, Đại học Bách khoa Hà Nội (58 Lê Thanh Nghị)
ORGANIZER;CN=CLB BK-AUTO:mailto:{SENDER_EMAIL}
ATTENDEE;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE;CN={full_name}:mailto:{receiver_email}
STATUS:CONFIRMED
BEGIN:VALARM
TRIGGER:-PT30M
ACTION:DISPLAY
DESCRIPTION;CHARSET=UTF-8:Nhắc nhở: Buổi phỏng vấn BK-AUTO sẽ diễn ra trong 30 phút nữa!
END:VALARM
END:VEVENT
END:VCALENDAR"""

def generate_qr_bytes(data_text: str) -> bytes:
    """Sinh ảnh QR code trực tiếp trong RAM dưới dạng PNG bytes."""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=8,
        border=2,
    )
    qr.add_data(data_text)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#111827", back_color="white")
    
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()

def send_confirmation_email_sync(member_data: dict, app_root_path: str):
    """Gửi email xác nhận kèm QR Code (MSSV) và file ICS (Chạy đồng bộ)."""
    to_email = member_data.get("email")
    if not to_email:
        logger.warning(f"Bỏ qua gửi email: Ứng viên {member_data.get('name')} không có email.")
        return

    name = member_data.get("name", "")
    mssv = member_data.get("MSSV", "")
    specialist = member_data.get("specialist", "Chung")

    # Đọc template HTML
    template_path = os.path.join(app_root_path, "templates_mail", "interview_confirmed.html")
    if not os.path.exists(template_path):
        logger.error(f"Không tìm thấy template email tại: {template_path}")
        return

    with open(template_path, "r", encoding="utf-8") as f:
        html_content = f.read()

    html_body = html_content.replace("{{ ho_ten }}", name).replace("{{ mssv }}", mssv)

    # Khởi tạo MIME container
    msg = MIMEMultipart("mixed")
    subject_text = f"[BK-AUTO] Xác Nhận Lịch Phỏng Vấn Tuyển Cộng Tác Viên Thành Công - {name}"
    msg["Subject"] = Header(subject_text, "utf-8")
    msg["From"] = f"{Header('CLB BK-AUTO', 'utf-8').encode()} <{SENDER_EMAIL}>"
    msg["To"] = to_email

    # Phần related cho nội dung HTML và ảnh inline (CID)
    msg_related = MIMEMultipart("related")
    msg.attach(msg_related)
    msg_related.attach(MIMEText(html_body, "html", "utf-8"))

    # 1. Đính kèm Logo BK-AUTO inline (cid:bkauto-logo)
    logo_path = os.path.join(app_root_path, "assets", "bkauto-logo.png")
    if os.path.exists(logo_path):
        with open(logo_path, "rb") as img_f:
            logo_part = MIMEImage(img_f.read())
            logo_part.add_header("Content-ID", "<bkauto-logo>")
            logo_part.add_header("Content-Disposition", "inline", filename="bkauto-logo.png")
            msg_related.attach(logo_part)
    else:
        logger.warning(f"Không tìm thấy file logo tại {logo_path}. Header email có thể bị khuyết ảnh.")

    # 2. Đính kèm QR Code MSSV inline (cid:qrcode-checkin)
    qr_bytes = generate_qr_bytes(mssv)
    qr_part = MIMEImage(qr_bytes)
    qr_part.add_header("Content-ID", "<qrcode-checkin>")
    qr_part.add_header("Content-Disposition", "inline", filename=f"checkin_qr_{mssv}.png")
    msg_related.attach(qr_part)

    # 3. Đính kèm File iCalendar (.ics)
    ics_text = generate_ics_content(name, mssv, to_email)
    cal_part = MIMEBase("text", "calendar", method="REQUEST", name="invite.ics")
    cal_part.set_payload(ics_text.encode("utf-8"))
    encoders.encode_base64(cal_part)
    cal_part.add_header("Content-Type", 'text/calendar; charset="utf-8"; method=REQUEST')
    cal_part.add_header("Content-Class", "urn:content-classes:calendarmessage")
    cal_part.add_header("Content-Disposition", "attachment; filename=invite.ics")
    msg.attach(cal_part)

    # Gửi qua SMTP
    try:
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT, timeout=15) as server:
            server.starttls()
            server.login(SENDER_EMAIL, SENDER_PASSWORD)
            server.send_message(msg)
            logger.info(f"Đã gửi email xác nhận thành công tới: {name} ({to_email})")
    except Exception as e:
        logger.error(f"Lỗi khi gửi email xác nhận cho {to_email}: {e}")

def send_confirmation_email_async(member_data: dict, app_root_path: str):
    """Bọc việc gửi mail vào Thread để trả lời HTTP response ngay lập tức."""
    thread = threading.Thread(
        target=send_confirmation_email_sync,
        args=(member_data, app_root_path),
        daemon=True
    )
    thread.start()