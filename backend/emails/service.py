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


WAITLIST_STR = {
    "es": {
        "subject": "Estás en la lista · FaberLoom",
        "preheader": "Vas a ser de los primeros en entrar a FaberLoom.",
        "h1a": "Estás", "h1b": "adentro",
        "lead": "Gracias por sumarte. Cuando FaberLoom abra, vas a ser de los "
                "<strong>primeros</strong> en tener acceso — antes que el público general.",
        "b1": "Asistentes de IA que ejecutan tus tareas, en tu computadora y bajo tu control.",
        "b2": "Avisos tempranos: te escribimos antes que a nadie cuando puedas entrar.",
        "b3": "Acceso anticipado a nuestro Simulador del Mundial 2026 mientras tanto.",
        "cta": "Activar mi acceso anticipado →",
        "after": "Activá tu cuenta en un paso (elegí tu nombre y contraseña) y empezá a jugar el Mundial hoy.",
        "ps": "Si no te registraste, podés ignorar este correo.",
    },
    "en": {
        "subject": "You're on the list · FaberLoom",
        "preheader": "You'll be among the first into FaberLoom.",
        "h1a": "You're", "h1b": "in",
        "lead": "Thanks for joining. When FaberLoom opens, you'll be among the "
                "<strong>first</strong> to get access — ahead of the general public.",
        "b1": "AI assistants that execute your tasks, on your computer, under your control.",
        "b2": "Early heads-up: we'll write to you before anyone else when you can get in.",
        "b3": "Early access to our World Cup 2026 Simulator in the meantime.",
        "cta": "Activate my early access →",
        "after": "Activate your account in one step (pick your name and password) and start playing today.",
        "ps": "If you didn't sign up, you can ignore this email.",
    },
    "fr": {
        "subject": "Tu es sur la liste · FaberLoom",
        "preheader": "Tu seras parmi les premiers à entrer dans FaberLoom.",
        "h1a": "Tu es", "h1b": "dedans",
        "lead": "Merci de t'être inscrit. Quand FaberLoom ouvrira, tu seras parmi les "
                "<strong>premiers</strong> à y accéder — avant le grand public.",
        "b1": "Des assistants IA qui exécutent tes tâches, sur ton ordinateur, sous ton contrôle.",
        "b2": "Alerte en avant-première : on t'écrit avant tout le monde quand tu pourras entrer.",
        "b3": "Accès anticipé à notre Simulateur de la Coupe du Monde 2026 en attendant.",
        "cta": "Activer mon accès anticipé →",
        "after": "Active ton compte en une étape (choisis ton nom et ton mot de passe) et commence à jouer aujourd'hui.",
        "ps": "Si tu ne t'es pas inscrit, tu peux ignorer cet e-mail.",
    },
}


def send_waitlist_email(user, token, lang="es"):
    site_url, _ = _site()
    t = WAITLIST_STR.get(lang, WAITLIST_STR["es"])
    _send(
        subject=t["subject"],
        to_email=user.email,
        template="waitlist",
        context={"t": t, "cta_url": f"{site_url}/activar/{token}"},
    )


def send_match_result_email(user, ctx):
    site_url, _ = _site()
    _send(
        subject=f"Resultado · {ctx.get('team_a','')} {ctx.get('real_score','')} {ctx.get('team_b','')}",
        to_email=user.email,
        template="match_result",
        context={"name": user.name or "jugador", "cta_url": site_url, **ctx},
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
