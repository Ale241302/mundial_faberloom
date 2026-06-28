from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from accounts.serializers import UserSerializer
from emails.service import send_prediction_email
from .engine import build_engine, BASE
from .kimi import projection as kimi_projection, commentary as kimi_commentary
from .models import (
    Team, Fixture, MarketOdds, Result, TournamentState, Prediction, BracketFixture,
)
from .serializers import (
    TeamSerializer, FixtureSerializer, MarketSerializer, PredictionSerializer,
)

User = get_user_model()


# ----------------------------------------------------------------------
#  Helpers
# ----------------------------------------------------------------------
def _is_admin(request):
    return request.user.is_authenticated and request.user.is_admin


def _user_pred_map(user):
    """{round: {index: {pick, goal_a, goal_b}}} para scoring (incluye goles)."""
    preds = {}
    for p in Prediction.objects.filter(user=user):
        preds.setdefault(p.round, {})[p.index] = {
            "pick": p.pick, "goal_a": p.goal_a, "goal_b": p.goal_b,
        }
    return preds


def _int_keyed(d):
    """Convierte claves de dict a str (JSON) recursivamente para rondas/índices."""
    out = {}
    for k, v in d.items():
        out[str(k)] = {str(kk): vv for kk, vv in v.items()} if isinstance(v, dict) else v
    return out


# ----------------------------------------------------------------------
#  Bootstrap — todo lo que el front necesita para pintar (sin datos quemados)
# ----------------------------------------------------------------------
@api_view(["GET"])
@permission_classes([AllowAny])
def bootstrap(request):
    eng = build_engine()
    state = TournamentState.get()

    teams = {t.name: TeamSerializer(t).data for t in Team.objects.all()}
    fixtures = FixtureSerializer(Fixture.objects.all(), many=True).data
    market = {str(m.match_no): MarketSerializer(m).data for m in MarketOdds.objects.all()}

    results = {}
    for r in Result.objects.all():
        results.setdefault(str(r.round), {})[str(r.index)] = {
            "winner": r.winner, "score": r.score,
        }

    # partidos registrados por el admin (override del modelo)
    overrides = {}
    for bf in BracketFixture.objects.all():
        overrides.setdefault(str(bf.round), {})[str(bf.index)] = {
            "team_a": bf.team_a, "team_b": bf.team_b,
            "date_label": bf.date_label, "confirmed": bf.confirmed,
        }

    ai_picks, prob_f = eng.freeze("fav")
    reach = eng.simulate(int(request.query_params.get("n", 1500)))
    ai_points = eng.score_ai()

    data = {
        "teams": teams,
        "fixtures": fixtures,
        "market": market,
        "state": {
            "round_open": state.round_open,
            "rounds_enabled": state.rounds_enabled,
            "total_players": state.total_players,
        },
        "results": results,
        "overrides": overrides,
        "ai_picks": _int_keyed(ai_picks),
        "prob_f": _int_keyed(prob_f),
        "reach": reach,
        "ai_points": ai_points,
        "base_points": BASE,
    }

    if request.user.is_authenticated and not request.user.is_admin:
        data["my_predictions"] = PredictionSerializer(
            Prediction.objects.filter(user=request.user), many=True
        ).data
        data["my_points"] = eng.score_user(_user_pred_map(request.user))

    return Response(data)


@api_view(["POST"])
@permission_classes([AllowAny])
def simulate(request):
    eng = build_engine()
    n = int(request.data.get("n", 5000))
    return Response({"reach": eng.simulate(n)})


# ----------------------------------------------------------------------
#  Dossier de equipo (+ proyección Kimi opcional)
# ----------------------------------------------------------------------
@api_view(["GET"])
@permission_classes([AllowAny])
def team_detail(request, name):
    team = Team.objects.filter(name=name).first()
    if not team:
        return Response(status=status.HTTP_404_NOT_FOUND)
    eng = build_engine()
    reach = eng.simulate(2000).get(name)
    data = TeamSerializer(team).data
    data["reach"] = reach

    if request.query_params.get("ai") == "1":
        fx = Fixture.objects.filter(team_a=team).first() or Fixture.objects.filter(team_b=team).first()
        if fx:
            a, b = fx.team_a.name, fx.team_b.name
            pa = eng.p_win(a, b)
            data["projection"] = kimi_projection(
                a, b, pa,
                (Team.objects.get(name=a)).stats,
                (Team.objects.get(name=b)).stats,
                lang=request.query_params.get("lang", "es"),
            )
    return Response(data)


# ----------------------------------------------------------------------
#  Pronósticos del usuario
# ----------------------------------------------------------------------
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def save_prediction(request):
    if request.user.is_admin:
        return Response({"detail": "El administrador no pronostica."},
                        status=status.HTTP_403_FORBIDDEN)
    state = TournamentState.get()
    r = int(request.data.get("round"))
    if not state.round_enabled(r):
        return Response({"detail": "Las apuestas de esta etapa están cerradas."},
                        status=status.HTTP_400_BAD_REQUEST)
    i = int(request.data.get("index"))
    pred, _ = Prediction.objects.update_or_create(
        user=request.user, round=r, index=i,
        defaults={
            "pick": request.data.get("pick", ""),
            "goal_a": request.data.get("goal_a"),
            "goal_b": request.data.get("goal_b"),
            "pen": request.data.get("pen", ""),
        },
    )
    # correo de confirmación de pronóstico (no bloquea)
    if request.data.get("notify") and pred.pick:
        try:
            eng = build_engine()
            rounds = eng.resolve("fav")["rounds"]
            m = rounds[r][i] if r < len(rounds) and i < len(rounds[r]) else {}
            send_prediction_email(request.user, {
                "round_label": ["Dieciseisavos", "Octavos", "Cuartos", "Semifinal", "Final"][r],
                "team_a": m.get("a"), "team_b": m.get("b"),
                "pick": pred.pick,
                "score": (f"{pred.goal_a}-{pred.goal_b}"
                          if pred.goal_a is not None and pred.goal_b is not None else ""),
            })
        except Exception:
            pass
    return Response(PredictionSerializer(pred).data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_predictions(request):
    eng = build_engine()
    return Response({
        "predictions": PredictionSerializer(
            Prediction.objects.filter(user=request.user), many=True).data,
        "points": eng.score_user(_user_pred_map(request.user)),
    })


# ----------------------------------------------------------------------
#  Ranking
# ----------------------------------------------------------------------
@api_view(["GET"])
@permission_classes([AllowAny])
def ranking(request):
    eng = build_engine()
    rows = []
    for u in User.objects.filter(role=User.Role.USER):
        rows.append({"id": u.id, "name": u.name or u.email,
                     "points": eng.score_user(_user_pred_map(u))})
    rows.sort(key=lambda x: x["points"], reverse=True)
    for k, row in enumerate(rows):
        row["rank"] = k + 1
        row["me"] = request.user.is_authenticated and row["id"] == request.user.id
    return Response({"ranking": rows, "ai_points": eng.score_ai()})


# ----------------------------------------------------------------------
#  ADMIN
# ----------------------------------------------------------------------
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def admin_users(request):
    if not _is_admin(request):
        return Response(status=status.HTTP_403_FORBIDDEN)
    eng = build_engine()
    out = []
    for u in User.objects.filter(role=User.Role.USER):
        out.append({**UserSerializer(u).data,
                    "points": eng.score_user(_user_pred_map(u))})
    return Response(out)


@api_view(["PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def admin_user_detail(request, uid):
    if not _is_admin(request):
        return Response(status=status.HTTP_403_FORBIDDEN)
    u = User.objects.filter(pk=uid).first()
    if not u:
        return Response(status=status.HTTP_404_NOT_FOUND)
    if request.method == "DELETE":
        u.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    if "is_active" in request.data:
        u.is_active = bool(request.data["is_active"])
        u.save(update_fields=["is_active"])
    if request.data.get("password"):
        u.set_password(request.data["password"])
        u.save(update_fields=["password"])
    return Response(UserSerializer(u).data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def admin_user_predictions(request, uid):
    if not _is_admin(request):
        return Response(status=status.HTTP_403_FORBIDDEN)
    u = User.objects.filter(pk=uid).first()
    if not u:
        return Response(status=status.HTTP_404_NOT_FOUND)
    eng = build_engine()
    return Response({
        "user": UserSerializer(u).data,
        "predictions": PredictionSerializer(Prediction.objects.filter(user=u), many=True).data,
        "points": eng.score_user(_user_pred_map(u)),
    })


@api_view(["POST", "DELETE"])
@permission_classes([IsAuthenticated])
def admin_result(request):
    """Carga / borra el resultado real (lock) de un cruce."""
    if not _is_admin(request):
        return Response(status=status.HTTP_403_FORBIDDEN)
    r = int(request.data.get("round"))
    i = int(request.data.get("index"))
    if request.method == "DELETE":
        Result.objects.filter(round=r, index=i).delete()
    else:
        Result.objects.update_or_create(
            round=r, index=i,
            defaults={"winner": request.data.get("winner", ""),
                      "score": request.data.get("score", "")},
        )
    return Response({"ok": True})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def admin_round(request):
    """Abre/cierra una etapa."""
    if not _is_admin(request):
        return Response(status=status.HTTP_403_FORBIDDEN)
    state = TournamentState.get()
    r = str(request.data.get("round"))
    state.rounds_enabled[r] = bool(request.data.get("enabled"))
    state.save(update_fields=["rounds_enabled"])
    return Response({"rounds_enabled": state.rounds_enabled})


@api_view(["POST", "DELETE"])
@permission_classes([IsAuthenticated])
def admin_fixture(request):
    """Registra / borra el partido real de una etapa (octavos, cuartos…)."""
    if not _is_admin(request):
        return Response(status=status.HTTP_403_FORBIDDEN)
    r = int(request.data.get("round"))
    i = int(request.data.get("index"))
    if request.method == "DELETE":
        BracketFixture.objects.filter(round=r, index=i).delete()
        return Response({"ok": True})
    BracketFixture.objects.update_or_create(
        round=r, index=i,
        defaults={
            "team_a": request.data.get("team_a", ""),
            "team_b": request.data.get("team_b", ""),
            "date_label": request.data.get("date_label", ""),
            "confirmed": bool(request.data.get("confirmed", True)),
        },
    )
    return Response({"ok": True})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def admin_resolve(request):
    """Avanza la ronda abierta (round_open + 1)."""
    if not _is_admin(request):
        return Response(status=status.HTTP_403_FORBIDDEN)
    state = TournamentState.get()
    if state.round_open < 4:
        state.round_open += 1
        state.save(update_fields=["round_open"])
    return Response({"round_open": state.round_open})
