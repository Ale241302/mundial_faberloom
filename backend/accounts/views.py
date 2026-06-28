from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from emails.service import send_welcome_email, send_password_reset_email
from .serializers import (
    RegisterSerializer, LoginSerializer, UserSerializer,
    PasswordResetRequestSerializer, PasswordResetConfirmSerializer,
)
from .tokens import make_reset_token, read_reset_token

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
