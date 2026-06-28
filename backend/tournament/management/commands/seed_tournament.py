"""
Puebla la base de datos del torneo desde backend/seed/wc_data.json.
Sin datos quemados en el frontend: TODO vive aquí.

Uso:
    python manage.py seed_tournament            # crea/actualiza
    python manage.py seed_tournament --reset    # borra y recarga
"""
import json
import os
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from tournament.models import Team, Fixture, MarketOdds, TournamentState

# nombre de equipo -> código de bandera (flagcdn). Igual que el simulador.
CC = {
    "Alemania": "de", "Paraguay": "py", "Francia": "fr", "Suecia": "se",
    "Sudáfrica": "za", "Canadá": "ca", "P. Bajos": "nl", "Marruecos": "ma",
    "Portugal": "pt", "Croacia": "hr", "España": "es", "Austria": "at",
    "EE.UU.": "us", "Bosnia": "ba", "Bélgica": "be", "Senegal": "sn",
    "Brasil": "br", "Japón": "jp", "C. Marfil": "ci", "Noruega": "no",
    "México": "mx", "Ecuador": "ec", "Inglaterra": "gb-eng", "RD Congo": "cd",
    "Argentina": "ar", "Cabo Verde": "cv", "Australia": "au", "Egipto": "eg",
    "Suiza": "ch", "Argelia": "dz", "Colombia": "co", "Ghana": "gh",
}
HOSTS = {"EE.UU.", "México", "Canadá"}

User = get_user_model()


class Command(BaseCommand):
    help = "Puebla equipos, cruces, mercado y estado del Mundial."

    def add_arguments(self, parser):
        parser.add_argument("--reset", action="store_true")

    def handle(self, *args, **opts):
        seed_dir = os.path.join(settings.BASE_DIR, "seed")
        with open(os.path.join(seed_dir, "wc_data.json"), encoding="utf-8") as f:
            wc = json.load(f)

        if opts["reset"]:
            self.stdout.write("Borrando datos previos…")
            Fixture.objects.all().delete()
            MarketOdds.objects.all().delete()
            Team.objects.all().delete()

        stats = wc.get("STATS", {})
        for name, (flag, elo) in wc["TEAMS"].items():
            Team.objects.update_or_create(
                name=name,
                defaults={
                    "code": CC.get(name, ""),
                    "elo": int(elo),
                    "host": name in HOSTS,
                    "stats": stats.get(name, {}),
                },
            )
        self.stdout.write(self.style.SUCCESS(f"Equipos: {Team.objects.count()}"))

        for row in wc["R32"]:
            no, a, b, date = row
            Fixture.objects.update_or_create(
                match_no=int(no),
                defaults={
                    "team_a": Team.objects.get(name=a),
                    "team_b": Team.objects.get(name=b),
                    "date_label": date,
                },
            )
        self.stdout.write(self.style.SUCCESS(f"Cruces R32: {Fixture.objects.count()}"))

        for no, m in wc["MARKET"].items():
            MarketOdds.objects.update_or_create(
                match_no=int(no),
                defaults={"a": m["a"], "d": m["d"], "b": m["b"],
                          "a_adv": m["aAdv"], "b_adv": m["bAdv"]},
            )
        self.stdout.write(self.style.SUCCESS(f"Mercado: {MarketOdds.objects.count()}"))

        state = TournamentState.get()
        self.stdout.write(f"Estado: ronda abierta {state.round_open}")

        # --- admin ---
        admin_email = os.environ.get("ADMIN_EMAIL", "admin@faberloom.ai")
        admin_pass = os.environ.get("ADMIN_PASSWORD", "MuitoWork2026?")
        admin, created = User.objects.get_or_create(
            email=admin_email,
            defaults={"name": "Administrador", "role": User.Role.ADMIN,
                      "is_staff": True, "is_superuser": True},
        )
        if created:
            admin.set_password(admin_pass)
            admin.save()
            self.stdout.write(self.style.SUCCESS(
                f"Admin creado: {admin_email} (login también con 'admin')"))
        else:
            self.stdout.write("Admin ya existía (sin cambios).")

        self.stdout.write(self.style.SUCCESS("Seed completo."))
