"""Renombra a los 3 usuarios reales, crea N usuarios ficticios y les registra
pronósticos aleatorios (a los ficticios, NO a los reales). Idempotente.

Uso:  python manage.py seed_fake_users         (100 por defecto)
      python manage.py seed_fake_users --n 50
"""
import random

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

from tournament.engine import build_engine
from tournament.models import Prediction

User = get_user_model()

# usuarios reales -> nuevo nombre de usuario (sus pronósticos NO se tocan)
RENAMES = {
    "Alvaro Alfaro": "SjoAlfaro",
    "Alejandro": "Ale132402",
    "Jorge": "JorgeCasa",
}

FIRST = [
    "Carlos", "Maria", "Juan", "Andres", "Laura", "Diego", "Camila", "Santiago",
    "Valentina", "Mateo", "Sofia", "Sebastian", "Daniela", "Nicolas", "Paula",
    "Felipe", "Mariana", "David", "Luisa", "Samuel", "Gabriela", "Tomas",
    "Isabella", "Martin", "Antonia", "Emilio", "Renata", "Bruno", "Salome",
    "Joaquin", "Kevin", "Tatiana", "Oscar", "Natalia", "Cristian", "Manuela",
]
SUFFIX = ["", "_", "cr", "co", "10", "99", "23", "fut", "gol", "mvp", "x", "2026", "7", "88", "21"]
# países con peso (mayoría CO/CR como el resto de jugadores)
COUNTRIES = (["co"] * 6 + ["cr"] * 5 + ["mx", "ar", "es", "pe", "cl", "ec",
             "ve", "us", "br", "uy", "py", "bo", "pa", "gt", "hn"])


class Command(BaseCommand):
    help = "Renombra reales, crea N ficticios y les pone pronósticos aleatorios."

    def add_arguments(self, parser):
        parser.add_argument("--n", type=int, default=100)

    @transaction.atomic
    def handle(self, *args, **opts):
        # 1) renombrar los 3 reales (sin tocar sus pronósticos)
        for old, new in RENAMES.items():
            u = User.objects.filter(name=old).first()
            if u:
                u.name = new
                u.save(update_fields=["name"])
                self.stdout.write(f"  renombrado: {old} -> {new}")

        eng = build_engine()
        rounds = eng.resolve("fav")["rounds"]

        n = opts["n"]
        used = set(User.objects.values_list("name", flat=True))
        created = preds = 0

        for i in range(1, n + 1):
            email = f"seed{i}@faberloom.fake"
            # nombre de usuario único
            nm = None
            for _ in range(25):
                cand = random.choice(FIRST) + random.choice(SUFFIX)
                if random.random() < 0.4:
                    cand += str(random.randint(1, 999))
                if cand not in used:
                    nm = cand
                    break
            nm = nm or f"player{i}"
            used.add(nm)

            u, was_new = User.objects.get_or_create(
                email=email,
                defaults={"name": nm, "role": User.Role.USER, "source": "seed",
                          "country": random.choice(COUNTRIES), "is_active": True},
            )
            if was_new:
                u.set_password("Mundial2026")
                if not u.country:
                    u.country = random.choice(COUNTRIES)
                u.save()
                created += 1

            # 2) pronósticos aleatorios para TODOS los cruces del cuadro
            for r, slots in enumerate(rounds):
                for idx, m in enumerate(slots):
                    a, b = m.get("a"), m.get("b")
                    if not a or not b:
                        continue
                    pick = random.choice([a, b])
                    ga = random.choices([0, 1, 2, 3, 4], [18, 34, 26, 14, 8])[0]
                    gb = random.choices([0, 1, 2, 3, 4], [18, 34, 26, 14, 8])[0]
                    # marcador coherente con el ganador elegido (sin empates en KO)
                    if pick == a and ga <= gb:
                        ga = gb + 1
                    elif pick == b and gb <= ga:
                        gb = ga + 1
                    Prediction.objects.update_or_create(
                        user=u, round=r, index=idx,
                        defaults={"pick": pick, "goal_a": ga, "goal_b": gb},
                    )
                    preds += 1

        total = User.objects.filter(role=User.Role.USER).count()
        self.stdout.write(self.style.SUCCESS(
            f"OK · ficticios nuevos: {created} · pronósticos escritos: {preds} · "
            f"jugadores totales: {total}"))
