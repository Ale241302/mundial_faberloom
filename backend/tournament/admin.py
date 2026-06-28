from django.contrib import admin
from .models import Team, Fixture, MarketOdds, Result, TournamentState, Prediction


@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "elo", "host")
    list_filter = ("host",)
    search_fields = ("name",)


@admin.register(Fixture)
class FixtureAdmin(admin.ModelAdmin):
    list_display = ("match_no", "team_a", "team_b", "date_label")


@admin.register(MarketOdds)
class MarketAdmin(admin.ModelAdmin):
    list_display = ("match_no", "a", "d", "b", "a_adv", "b_adv")


@admin.register(Result)
class ResultAdmin(admin.ModelAdmin):
    list_display = ("round", "index", "winner", "score", "updated_at")
    list_filter = ("round",)


@admin.register(TournamentState)
class StateAdmin(admin.ModelAdmin):
    list_display = ("round_open", "total_players", "updated_at")


@admin.register(Prediction)
class PredictionAdmin(admin.ModelAdmin):
    list_display = ("user", "round", "index", "pick", "goal_a", "goal_b")
    list_filter = ("round",)
    search_fields = ("user__email", "user__name")
