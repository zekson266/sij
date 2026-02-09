FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Port configuration - can be overridden via build arg or env var
ARG WEB_PORT=8000
ENV WEB_PORT=${WEB_PORT}

WORKDIR /app

# System deps (for psycopg2 etc.)
RUN apt-get update && apt-get install -y \
    build-essential libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

# Copy Alembic configuration and migrations
COPY alembic.ini .
COPY alembic ./alembic
COPY scripts ./scripts

# Copy application code
COPY app ./app

# Expose FastAPI port (default 8000, actual port set via docker-compose)
# Note: EXPOSE doesn't support variables, but this is just metadata
# The actual port is controlled by docker-compose command override
EXPOSE 8000

# Use environment variable for port (can be overridden by docker-compose command)
# docker-compose will override this CMD with its own command using ${WEB_PORT}
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${WEB_PORT:-8000}"]