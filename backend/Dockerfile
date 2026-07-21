# --- Backend Dockerfile (Django + DRF) ---
FROM python:3.12-slim

# Prevent Python from writing .pyc files and buffering stdout.
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# System deps for shapely (GEOS) if wheels are unavailable.
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Collect static files (whitenoise serves them).
RUN python manage.py collectstatic --noinput || true

# Render/Heroku provide $PORT at runtime.
ENV PORT=8000
EXPOSE 8000

CMD gunicorn config.wsgi:application --bind 0.0.0.0:$PORT --workers 3 --timeout 120
