FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Ensure instance and uploads directories exist
RUN mkdir -p /app/instance /app/uploads/cv

EXPOSE 8091

HEALTHCHECK --interval=20s --timeout=5s --start-period=10s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8091/api/health', timeout=2)" || exit 1
CMD ["gunicorn", "--worker-class", "gthread", "--workers", "1", "--threads", "100", "--worker-connections", "1000", "--bind", "0.0.0.0:8091", "--timeout", "120", "--keep-alive", "75", "--access-logfile", "-", "--error-logfile", "-", "wsgi:app"]
