"""
Django settings for the Truck Routing + ELD Simulation backend.

The application is intentionally stateless: all trip simulation happens at
request time from the user-supplied inputs. No database is required for the
core algorithm, so we default to a lightweight SQLite database only to satisfy
Django's app machinery.
"""

from pathlib import Path

import environ

BASE_DIR = Path(__file__).resolve().parent.parent

# ---------------------------------------------------------------------------
# Environment
# ---------------------------------------------------------------------------
env = environ.Env(
    DJANGO_DEBUG=(bool, False),
)

# Read a local .env file if present (never committed).
env_file = BASE_DIR / ".env"
if env_file.exists():
    environ.Env.read_env(env_file)

SECRET_KEY = env("DJANGO_SECRET_KEY", default="insecure-dev-key-change-me")
DEBUG = env("DJANGO_DEBUG", default=True)

ALLOWED_HOSTS = env.list(
    "DJANGO_ALLOWED_HOSTS", default=["localhost", "127.0.0.1"]
)

# In DEBUG we accept any host (covers Django's test client "testserver" and
# local tunnels); production must set DJANGO_ALLOWED_HOSTS explicitly.
if DEBUG:
    ALLOWED_HOSTS = ["*"]

# The GraphHopper API key. Empty by default -> the routing client falls back
# to a bundled straight-line mock so the app still runs end-to-end without one.
GRAPHHOPPER_API_KEY = env("GRAPHHOPPER_API_KEY", default="")

# Routing profile. GraphHopper's free tier supports car/bike/foot; the "truck"
# profile requires a paid plan. Override via env for HGV-enabled accounts.
GRAPHHOPPER_PROFILE = env("GRAPHHOPPER_PROFILE", default="car")

# ---------------------------------------------------------------------------
# Applications
# ---------------------------------------------------------------------------
INSTALLED_APPS = [
    "django.contrib.contenttypes",
    "django.contrib.staticfiles",
    "rest_framework",
    "corsheaders",
    "trip_planner",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.middleware.common.CommonMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {"context_processors": []},
    },
]

# ---------------------------------------------------------------------------
# Database (only used by Django internals; the simulation is stateless)
# ---------------------------------------------------------------------------
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
CORS_ALLOWED_ORIGINS = env.list(
    "CORS_ALLOWED_ORIGINS",
    default=["http://localhost:5173", "http://127.0.0.1:5173"],
)

# Trust the same origins for CSRF (needed if the frontend ever posts forms).
CSRF_TRUSTED_ORIGINS = [
    o for o in CORS_ALLOWED_ORIGINS if o.startswith("http")
]

# Behind Render/Heroku the app sits behind a TLS-terminating proxy.
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

# ---------------------------------------------------------------------------
# DRF
# ---------------------------------------------------------------------------
REST_FRAMEWORK = {
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
    "DEFAULT_PARSER_CLASSES": [
        "rest_framework.parsers.JSONParser",
    ],
    # Stateless public API: no auth layer, so we don't pull in contrib.auth.
    "DEFAULT_AUTHENTICATION_CLASSES": [],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.AllowAny",
    ],
    "UNAUTHENTICATED_USER": None,
}

# ---------------------------------------------------------------------------
# Static files
# ---------------------------------------------------------------------------
STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STORAGES = {
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
