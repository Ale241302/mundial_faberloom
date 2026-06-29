"""
Token corto y firmado para el enlace de restablecimiento de contraseña.

El enlace que va en el correo es:  {PUBLIC_SITE_URL}/reset/<token>
El <token> lleva el id del usuario + correo, firmado (no se puede
manipular ni falsificar) y con caducidad. Es compacto para una "url corta".
"""
from django.conf import settings
from django.core import signing

SALT = "mundial.faberloom.password-reset"
_signer = signing.TimestampSigner(salt=SALT)


def make_reset_token(user) -> str:
    # payload mínimo => url corta. Firmado con la SECRET_KEY del proyecto.
    raw = signing.dumps(
        {"uid": user.pk, "em": user.email},
        salt=SALT,
        compress=True,
    )
    return raw


def read_reset_token(token: str, max_age: int | None = None):
    """Devuelve el dict {uid, em} si el token es válido y no caducó; si no, None."""
    if max_age is None:
        max_age = settings.PASSWORD_RESET_TIMEOUT
    try:
        return signing.loads(token, salt=SALT, max_age=max_age)
    except signing.BadSignature:
        return None
    except Exception:
        return None


# --- Token de activación para registros desde la landing (lista de espera) ---
ACT_SALT = "mundial.faberloom.activation"


def make_activation_token(user) -> str:
    return signing.dumps({"uid": user.pk, "em": user.email}, salt=ACT_SALT, compress=True)


def read_activation_token(token: str, max_age: int | None = None):
    """Devuelve {uid, em} si es válido; si no, None. Caducidad larga (30 días)."""
    if max_age is None:
        max_age = 60 * 60 * 24 * 30
    try:
        return signing.loads(token, salt=ACT_SALT, max_age=max_age)
    except Exception:
        return None
