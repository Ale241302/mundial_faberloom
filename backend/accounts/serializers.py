from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    is_admin = serializers.BooleanField(read_only=True)

    class Meta:
        model = User
        fields = ["id", "email", "name", "role", "lang", "country",
                  "marketing_consent", "is_admin", "is_active", "date_joined"]
        read_only_fields = ["id", "role", "is_admin", "is_active", "date_joined"]


class RegisterSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=120)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=6)
    lang = serializers.CharField(required=False, default="es")
    marketing_consent = serializers.BooleanField(required=False, default=False)

    def validate_email(self, value):
        value = value.lower().strip()
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Ese correo ya está registrado.")
        return value

    def validate_password(self, value):
        validate_password(value)
        return value

    def create(self, data):
        return User.objects.create_user(
            email=data["email"],
            password=data["password"],
            name=data.get("name", "").strip(),
            lang=data.get("lang", "es"),
            marketing_consent=data.get("marketing_consent", False),
        )


class LoginSerializer(serializers.Serializer):
    # CharField (no EmailField) para permitir el alias "admin".
    email = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        login = data["email"].lower().strip()
        # alias: "admin" -> cuenta de administrador
        if login == "admin":
            admin = User.objects.filter(role=User.Role.ADMIN).order_by("id").first()
            if admin:
                login = admin.email
        user = authenticate(username=login, password=data["password"])
        if not user:
            raise serializers.ValidationError("Correo o contraseña incorrectos.")
        if not user.is_active:
            raise serializers.ValidationError(
                "Tu cuenta está desactivada. Contacta al administrador."
            )
        data["user"] = user
        return data


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    token = serializers.CharField()
    password = serializers.CharField(write_only=True, min_length=6)
    password2 = serializers.CharField(write_only=True)

    def validate(self, data):
        if data["password"] != data["password2"]:
            raise serializers.ValidationError(
                {"password2": "Las contraseñas no coinciden."}
            )
        validate_password(data["password"])
        return data
