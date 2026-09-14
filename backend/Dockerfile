FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Run database migrations / seed if needed, then start server
ENV PORT=8001
EXPOSE 8001

CMD ["sh", "-c", "python seed_db.py && uvicorn main:app --host 0.0.0.0 --port ${PORT:-8001}"]
