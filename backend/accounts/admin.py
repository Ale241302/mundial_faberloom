from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ("email", "name", "role", "is_active", "date_joined")
    list_filter = ("role", "is_active", "marketing_consent")
    search_fields = ("email", "name")
    ordering = ("-date_joined",)
    readonly_fields = ("date_joined", "last_login")
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Perfil", {"fields": ("name", "lang", "marketing_consent")}),
        ("Permisos", {"fields": ("role", "is_active", "is_staff",
                                 "is_superuser", "groups", "user_permissions")}),
        ("Fechas", {"fields": ("last_login", "date_joined")}),
    )
    add_fieldsets = (
        (None, {"classes": ("wide",),
                "fields": ("email", "name", "role", "password1", "password2")}),
    )
