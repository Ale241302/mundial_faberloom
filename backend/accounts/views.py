import requests
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from emails.service import send_welcome_email, send_password_reset_email, send_waitlist_email
from .serializers import (
    RegisterSerializer, LoginSerializer, UserSerializer,
    PasswordResetRequestSerializer, PasswordResetConfirmSerializer,
)
from .tokens import (
    make_reset_token, read_reset_token,
    make_activation_token, read_activation_token,
)


def client_ip(request):
    """IP real del cliente detrás de Cloudflare / nginx."""
    cf = request.META.get("HTTP_CF_CONNECTING_IP")
    if cf:
        return cf.strip()[:45]
    xff = request.META.get("HTTP_X_FORWARDED_FOR")
    if xff:
        return xff.split(",")[0].strip()[:45]
    return (request.META.get("REMOTE_ADDR") or "")[:45]


def country_from_ip(ip):
    """Mejor esfuerzo: país ISO-2 desde la IP (para la bandera). Si falla, ''."""
    if not ip or ip.startswith(("10.", "127.", "192.168.", "172.16.", "172.17.", "172.18.")):
        return ""
    try:
        r = requests.get(f"https://ipapi.co/{ip}/country/", timeout=2.5,
                         headers={"User-Agent": "FaberLoom"})
        code = (r.text or "").strip().lower()
        if r.status_code == 200 and len(code) == 2 and code.isalpha():
            return code
    except Exception:
        pass
    return ""

User = get_user_model()


def _auth_payload(user):
    token, _ = Token.objects.get_or_create(user=user)
    return {"token": token.key, "user": UserSerializer(user).data}


@api_view(["POST"])
@permission_classes([AllowAny])
def register(request):
    ser = RegisterSerializer(data=request.data)
    ser.is_valid(raise_exception=True)
    user = ser.save()
    user.signup_ip = client_ip(request)
    user.source = request.data.get("source") or "simulador"
    user.country = (request.data.get("country") or country_from_ip(user.signup_ip) or "")[:2].lower()
    user.save(update_fields=["signup_ip", "source", "country"])
    try:
        send_welcome_email(user)
    except Exception:
        pass  # nunca bloquear el registro por un fallo de correo
    return Response(_auth_payload(user), status=status.HTTP_201_CREATED)


@api_view(["POST"])
@permission_classes([AllowAny])
def login(request):
    ser = LoginSerializer(data=request.data)
    ser.is_valid(raise_exception=True)
    return Response(_auth_payload(ser.validated_data["user"]))


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout(request):
    Token.objects.filter(user=request.user).delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def me(request):
    if request.method == "PATCH":
        ser = UserSerializer(request.user, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data)
    return Response(UserSerializer(request.user).data)


@api_view(["POST"])
@permission_classes([AllowAny])
def password_reset_request(request):
    ser = PasswordResetRequestSerializer(data=request.data)
    ser.is_valid(raise_exception=True)
    email = ser.validated_data["email"].lower().strip()
    user = User.objects.filter(email=email, is_active=True).first()
    if user:
        token = make_reset_token(user)
        try:
            send_password_reset_email(user, token)
        except Exception:
            pass
    # respuesta neutra: no revelamos si el correo existe (anti-enumeración)
    return Response({
        "detail": "Si el correo existe, te enviamos un enlace para restablecer tu contraseña."
    })


@api_view(["GET"])
@permission_classes([AllowAny])
def password_reset_validate(request):
    """El front llama a esto al abrir /reset/<token> para validar antes de mostrar el modal."""
    token = request.query_params.get("token", "")
    data = read_reset_token(token)
    if not data:
        return Response({"valid": False}, status=status.HTTP_400_BAD_REQUEST)
    return Response({"valid": True, "email": data.get("em")})


@api_view(["POST"])
@permission_classes([AllowAny])
def password_reset_confirm(request):
    ser = PasswordResetConfirmSerializer(data=request.data)
    ser.is_valid(raise_exception=True)
    data = read_reset_token(ser.validated_data["token"])
    if not data:
        return Response(
            {"detail": "El enlace no es válido o caducó. Solicita uno nuevo."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    user = User.objects.filter(pk=data["uid"], email=data["em"]).first()
    if not user:
        return Response({"detail": "Usuario no encontrado."},
                        status=status.HTTP_400_BAD_REQUEST)
    user.set_password(ser.validated_data["password"])
    user.save(update_fields=["password"])
    Token.objects.filter(user=user).delete()  # cerrar sesiones previas
    return Response(_auth_payload(user))


# ----------------------------------------------------------------------
#  Lista de espera (landing faberloom.ai) + activación de cuenta
# ----------------------------------------------------------------------
@api_view(["POST"])
@permission_classes([AllowAny])
def waitlist(request):
    """Captura de correo desde la landing. Crea un usuario SIN contraseña
    (queda 'pendiente'), guarda la IP y envía el correo de lista de espera
    con un botón que activa la cuenta en el simulador. Idempotente."""
    email = (request.data.get("email") or "").strip().lower()
    lang = (request.data.get("lang") or "es")[:5]
    if not email or "@" not in email:
        return Response({"detail": "Correo inválido."}, status=status.HTTP_400_BAD_REQUEST)

    user = User.objects.filter(email=email).first()
    existed = bool(user)
    if not user:
        ip = client_ip(request)
        user = User(email=email, lang=lang, source="landing",
                    marketing_consent=True, signup_ip=ip,
                    country=country_from_ip(ip))
        user.set_unusable_password()
        user.save()
    else:
        # actualizar IP/idioma del último intento; no tocar contraseña
        user.signup_ip = client_ip(request) or user.signup_ip
        if lang:
            user.lang = lang
        user.save(update_fields=["signup_ip", "lang"])

    pending = not user.has_usable_password()
    token = make_activation_token(user)
    try:
        send_waitlist_email(user, token, lang)
    except Exception:
        pass
    return Response({"ok": True, "existed": existed, "pending": pending, "token": token})


@api_view(["GET"])
@permission_classes([AllowAny])
def activation_validate(request):
    """Valida el token de activación (del correo o de localStorage) y dice si
    la cuenta aún está pendiente de contraseña."""
    data = read_activation_token(request.query_params.get("token", ""))
    if not data:
        return Response({"valid": False}, status=status.HTTP_400_BAD_REQUEST)
    user = User.objects.filter(pk=data["uid"], email=data["em"]).first()
    if not user:
        return Response({"valid": False}, status=status.HTTP_400_BAD_REQUEST)
    return Response({"valid": True, "email": user.email,
                    "name": user.name, "pending": not user.has_usable_password()})


@api_view(["POST"])
@permission_classes([AllowAny])
def activation_complete(request):
    """Completa el registro: nombre + contraseña. Inicia sesión (devuelve token)."""
    data = read_activation_token(request.data.get("token", ""))
    if not data:
        return Response({"detail": "El enlace no es válido o caducó."},
                        status=status.HTTP_400_BAD_REQUEST)
    user = User.objects.filter(pk=data["uid"], email=data["em"]).first()
    if not user:
        return Response({"detail": "Usuario no encontrado."}, status=status.HTTP_400_BAD_REQUEST)
    name = (request.data.get("name") or "").strip()
    password = request.data.get("password") or ""
    if len(password) < 6:
        return Response({"detail": "La contraseña debe tener al menos 6 caracteres."},
                        status=status.HTTP_400_BAD_REQUEST)
    if name:
        user.name = name[:120]
    user.set_password(password)
    user.is_active = True
    user.save()
    return Response(_auth_payload(user))
