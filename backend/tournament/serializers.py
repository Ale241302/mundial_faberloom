from rest_framework import serializers
from .models import Team, Fixture, MarketOdds, Prediction


class TeamSerializer(serializers.ModelSerializer):
    class Meta:
        model = Team
        fields = ["name", "code", "elo", "host", "stats"]


class FixtureSerializer(serializers.ModelSerializer):
    team_a = serializers.CharField(source="team_a.name")
    team_b = serializers.CharField(source="team_b.name")

    class Meta:
        model = Fixture
        fields = ["match_no", "team_a", "team_b", "date_label"]


class MarketSerializer(serializers.ModelSerializer):
    class Meta:
        model = MarketOdds
        fields = ["match_no", "a", "d", "b", "a_adv", "b_adv"]


class PredictionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Prediction
        fields = ["round", "index", "pick", "goal_a", "goal_b", "pen"]
