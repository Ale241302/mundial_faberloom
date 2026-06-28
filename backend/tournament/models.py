from django.conf import settings
from django.db import models

ROUNDS = [
    (0, "Dieciseisavos"),
    (1, "Octavos"),
    (2, "Cuartos"),
    (3, "Semifinal"),
    (4, "Final"),
]


class Team(models.Model):
    name = models.CharField(max_length=60, unique=True)
    code = models.CharField(max_length=8, help_text="ISO flag code, ej. 'ar', 'gb-eng'")
    elo = models.IntegerField(default=1700)
    host = models.BooleanField(default=False)
    stats = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-elo"]

    def __str__(self):
        return self.name


class Fixture(models.Model):
    """Cruce de Dieciseisavos (R32). Punto de partida del cuadro."""
    match_no = models.PositiveSmallIntegerField(unique=True)
    team_a = models.ForeignKey(Team, on_delete=models.CASCADE, related_name="fixtures_a")
    team_b = models.ForeignKey(Team, on_delete=models.CASCADE, related_name="fixtures_b")
    date_label = models.CharField(max_length=60, blank=True)

    class Meta:
        ordering = ["match_no"]

    def __str__(self):
        return f"{self.match_no}: {self.team_a} vs {self.team_b}"


class MarketOdds(models.Model):
    match_no = models.PositiveSmallIntegerField(unique=True)
    a = models.FloatField()
    d = models.FloatField()
    b = models.FloatField()
    a_adv = models.FloatField()
    b_adv = models.FloatField()

    class Meta:
        ordering = ["match_no"]


class Result(models.Model):
    """Resultado real cargado por el admin: bloquea (lock) un cruce."""
    round = models.PositiveSmallIntegerField()
    index = models.PositiveSmallIntegerField()
    winner = models.CharField(max_length=60)
    score = models.CharField(max_length=12, blank=True)
    status = models.CharField(max_length=12, default="finished")  # scheduled|live|finished
    minute = models.CharField(max_length=8, blank=True)           # "73'" si en vivo
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("round", "index")
        ordering = ["round", "index"]


class BracketFixture(models.Model):
    """
    Partido REAL registrado por el admin para una etapa (octavos, cuartos…).
    Si existe para un (round, index), su emparejamiento sustituye al que
    proyecta el modelo. R0 (16vos) viene de Fixture; aquí van 1..4.
    """
    round = models.PositiveSmallIntegerField()
    index = models.PositiveSmallIntegerField()
    team_a = models.CharField(max_length=60, blank=True)
    team_b = models.CharField(max_length=60, blank=True)
    date_label = models.CharField(max_length=60, blank=True)
    confirmed = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("round", "index")
        ordering = ["round", "index"]


class TournamentState(models.Model):
    """Estado global del torneo (singleton, pk=1)."""
    round_open = models.PositiveSmallIntegerField(default=0)
    rounds_enabled = models.JSONField(default=dict)
    total_players = models.PositiveIntegerField(default=2480)
    updated_at = models.DateTimeField(auto_now=True)

    @classmethod
    def get(cls):
        obj, created = cls.objects.get_or_create(pk=1)
        if created or not obj.rounds_enabled:
            obj.rounds_enabled = {str(r): True for r in range(5)}
            obj.save()
        return obj

    def round_enabled(self, r):
        return self.rounds_enabled.get(str(r), True)


class Prediction(models.Model):
    """Pronóstico de un usuario para un cruce concreto."""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                             related_name="predictions")
    round = models.PositiveSmallIntegerField()
    index = models.PositiveSmallIntegerField()
    pick = models.CharField(max_length=60, blank=True)
    goal_a = models.IntegerField(null=True, blank=True)
    goal_b = models.IntegerField(null=True, blank=True)
    pen = models.CharField(max_length=60, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("user", "round", "index")
        ordering = ["round", "index"]


class ClosedMatch(models.Model):
    """Partido cerrado para pronósticos (por partido, no por etapa)."""
    round = models.PositiveSmallIntegerField()
    index = models.PositiveSmallIntegerField()

    class Meta:
        unique_together = ("round", "index")
        ordering = ["round", "index"]
