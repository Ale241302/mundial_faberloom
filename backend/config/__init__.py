try:
    from .celery import app as celery_app
    __all__ = ("celery_app",)
except ModuleNotFoundError:  # celery opcional (solo worker/beat)
    celery_app = None
    __all__ = ()
