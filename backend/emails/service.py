"""
Servicio de correo — render de plantillas HTML (marca FaberLoom) y envío
vía SMTP (mail.mwt.one). From visible: "Mundial FaberLoom".
"""
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags


def _site():
    url = settings.PUBLIC_SITE_URL.rstrip("/")
    return url, url.replace("https://", "").replace("http://", "")


def _send(subject, to_email, template, context):
    site_url, site_label = _site()
    ctx = {"site_url": site_url, "site_url_label": site_label, **context}
    html = render_to_string(f"emails/{template}.html", ctx)
    text = strip_tags(html)
    msg = EmailMultiAlternatives(
        subject=subject,
        body=text,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[to_email],
        reply_to=[settings.DEFAULT_REPLY_TO],
    )
    msg.attach_alternative(html, "text/html")
    msg.send(fail_silently=False)


def send_welcome_email(user):
    site_url, _ = _site()
    _send(
        subject="Bienvenido a FaberLoom · Mundial 2026",
        to_email=user.email,
        template="welcome",
        context={"name": user.name or "jugador", "cta_url": site_url},
    )


def send_prediction_email(user, pred):
    site_url, _ = _site()
    _send(
        subject=f"Pronóstico registrado · {pred.get('pick', '')}",
        to_email=user.email,
        template="prediction",
        context={
            "name": user.name or "jugador",
            "round_label": pred.get("round_label", ""),
            "team_a": pred.get("team_a", ""),
            "team_b": pred.get("team_b", ""),
            "pick": pred.get("pick", ""),
            "score": pred.get("score", ""),
            "cta_url": site_url,
        },
    )


def send_password_reset_email(user, token):
    site_url, _ = _site()
    reset_url = f"{site_url}/reset/{token}"
    hours = settings.PASSWORD_RESET_TIMEOUT // 3600
    _send(
        subject="Restablecer tu contraseña · FaberLoom",
        to_email=user.email,
        template="password_reset",
        context={
            "name": user.name or "jugador",
            "email": user.email,
            "reset_url": reset_url,
            "expires_label": f"{hours} horas" if hours else "2 horas",
        },
    )
