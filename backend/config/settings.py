"""
Django settings — Mundial FaberLoom (mundial.faberloom.ai)
Proyecto independiente. Backend Django + DRF + PostgreSQL.
"""
import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


def env(key, default=None):
    return os.environ.get(key, default)


def env_bool(key, default=False):
    return str(os.environ.get(key, default)).lower() in ("1", "true", "yes", "on")


SECRET_KEY = env("SECRET_KEY", "dev-insecure-change-me")
DEBUG = env_bool("DEBUG", False)
ALLOWED_HOSTS = env("ALLOWED_HOSTS", "mundial.faberloom.ai,localhost,127.0.0.1").split(",")
CSRF_TRUSTED_ORIGINS = env(
    "CSRF_TRUSTED_ORIGINS",
    "https://mundial.faberloom.ai",
).split(",")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework.authtoken",
    "corsheaders",
    "accounts",
    "tournament",
    "emails",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "emails" / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

if env_bool("DB_SQLITE", False):
    # solo para pruebas locales rápidas (sin Postgres)
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": env("POSTGRES_DB", "mundial"),
            "USER": env("POSTGRES_USER", "mundial"),
            "PASSWORD": env("POSTGRES_PASSWORD", "mundial"),
            "HOST": env("POSTGRES_HOST", "mundial-db"),
            "PORT": env("POSTGRES_PORT", "5432"),
        }
    }

AUTH_USER_MODEL = "accounts.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
     "OPTIONS": {"min_length": 6}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
]

LANGUAGE_CODE = "es"
TIME_ZONE = env("TIME_ZONE", "America/Bogota")
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.TokenAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.AllowAny",
    ],
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
}

# ---- CORS ----
CORS_ALLOWED_ORIGINS = env(
    "CORS_ALLOWED_ORIGINS",
    "https://mundial.faberloom.ai,http://localhost:3200,http://localhost:5173",
).split(",")
CORS_ALLOW_CREDENTIALS = True

# ---- Frontend / public URLs (for email links) ----
PUBLIC_SITE_URL = env("PUBLIC_SITE_URL", "https://mundial.faberloom.ai")

# ---- Celery ----
CELERY_BROKER_URL = env("REDIS_URL", "redis://mundial-redis:6379/0")
CELERY_RESULT_BACKEND = env("REDIS_URL", "redis://mundial-redis:6379/0")
CELERY_TASK_ALWAYS_EAGER = env_bool("CELERY_EAGER", False)

# =====================================================================
#  CORREO  — se envía vía mail.mwt.one (SMTP existente), From "Mundial
#  FaberLoom". Ver cloudflare-email.md para SPF/DKIM/DMARC de faberloom.ai
# =====================================================================
EMAIL_BACKEND = env("EMAIL_BACKEND", "django.core.mail.backends.smtp.EmailBackend")
EMAIL_HOST = env("EMAIL_HOST", "mail.mwt.one")
EMAIL_PORT = int(env("EMAIL_PORT", "465"))
EMAIL_USE_SSL = env_bool("EMAIL_USE_SSL", True)
EMAIL_USE_TLS = env_bool("EMAIL_USE_TLS", False)
EMAIL_HOST_USER = env("EMAIL_HOST_USER", "info@mwt.one")
EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD", "")
# Lo que ve el usuario como remitente (nombre de marca + buzón real de envío)
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", "Mundial FaberLoom <info@mwt.one>")
DEFAULT_REPLY_TO = env("DEFAULT_REPLY_TO", "trade@mwt.one")
EMAIL_TIMEOUT = 20

# Marca para las plantillas
BRAND = {
    "name": "FaberLoom",
    "product": "Simulador Mundial 2026",
    "url": PUBLIC_SITE_URL,
    "coral": "#C96442",
    "ink": "#1F1E1C",
    "paper": "#F4F1ED",
    "paper2": "#EDE8DF",
    "line": "#D8D0C0",
    "taupe": "#8A8278",
}

# ---- Reset de contraseña: vigencia del token corto (segundos) ----
PASSWORD_RESET_TIMEOUT = int(env("PASSWORD_RESET_TIMEOUT", str(60 * 60 * 2)))  # 2 h

# ---- Kimi / Moonshot (IA del sistema) ----
KIMI_API_KEY = env("KIMI_API_KEY", "")
KIMI_BASE_URL = env("KIMI_BASE_URL", "https://api.moonshot.ai/v1")
KIMI_MODEL = env("KIMI_MODEL", "kimi-k2-0905-preview")
KIMI_ENABLED = env_bool("KIMI_ENABLED", bool(KIMI_API_KEY))

if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True

# Sincronización automática de resultados FIFA cada 2 minutos
CELERY_BEAT_SCHEDULE = {
    "sync-fifa-results": {
        "task": "tournament.tasks.sync_fifa_results",
        "schedule": 120.0,
    },
}
