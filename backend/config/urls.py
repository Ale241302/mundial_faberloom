from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse


def health(_request):
    return JsonResponse({"status": "ok", "service": "mundial-faberloom-api"})


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", health),
    path("api/auth/", include("accounts.urls")),
    path("api/", include("tournament.urls")),
]
