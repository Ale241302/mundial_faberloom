from django.core.management.base import BaseCommand
from tournament.fifa import sync_results


class Command(BaseCommand):
    help = "Trae resultados reales desde la API de FIFA y actualiza el cuadro."

    def handle(self, *args, **opts):
        n, logs = sync_results()
        for l in logs:
            self.stdout.write(l)
        self.stdout.write(self.style.SUCCESS(f"Partidos actualizados: {n}"))
