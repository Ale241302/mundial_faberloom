from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from accounts.serializers import UserSerializer
from emails.service import send_prediction_email
from .engine import build_engine, BASE, ROUND_LABELS
from .kimi import predict as kimi_predict, projection as kimi_projection, commentary as kimi_commentary
from .models import (
    Team, Fixture, MarketOdds, Result, TournamentState, Prediction, BracketFixture, ClosedMatch,
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
    """Convierte claves de dict a str (JSON) recursivamente para rondas/indices."""
    out = {}
    for k, v in d.items():
        out[str(k)] = {str(kk): vv for kk, vv in v.items()} if isinstance(v, dict) else v
    return out


def _results_payload():
    results = {}
    for r in Result.objects.all():
        results.setdefault(str(r.round), {})[str(r.index)] = {
            "winner": r.winner, "score": r.score,
            "status": getattr(r, "status", "finished"), "minute": getattr(r, "minute", ""),
        }
    return results


def _closed_payload():
    closed = {}
    for cm in ClosedMatch.objects.all():
        closed.setdefault(str(cm.round), {})[str(cm.index)] = True
    return closed


def _overrides_payload():
    overrides = {}
    for bf in BracketFixture.objects.all():
        overrides.setdefault(str(bf.round), {})[str(bf.index)] = {
            "team_a": bf.team_a, "team_b": bf.team_b,
            "date_label": bf.date_label, "confirmed": bf.confirmed,
        }
    return overrides


def _state_payload(state):
    return {
        "round_open": state.round_open,
        "rounds_enabled": state.rounds_enabled,
        "total_players": state.total_players,
    }


def _live_state_payload(request):
    """Estado liviano para polling: evita recalcular Monte Carlo completo."""
    from .fifa import get_live_panel

    eng = build_engine()
    state = TournamentState.get()
    ai_picks, prob_f = eng.freeze("fav")
    data = {
        "state": _state_payload(state),
        "results": _results_payload(),
        "overrides": _overrides_payload(),
        "closed_matches": _closed_payload(),
        "ai_picks": _int_keyed(ai_picks),
        "prob_f": _int_keyed(prob_f),
        "ai_points": eng.score_ai(),
        "live_panel": get_live_panel(force=request.query_params.get("force") == "1"),
    }
    if request.user.is_authenticated and not request.user.is_admin:
        data["my_points"] = eng.score_user(_user_pred_map(request.user))
    return data


# ----------------------------------------------------------------------
#  Bootstrap - todo lo que el front necesita para pintar (sin datos quemados)
# ----------------------------------------------------------------------
@api_view(["GET"])
@permission_classes([AllowAny])
def bootstrap(request):
    eng = build_engine()
    state = TournamentState.get()

    teams = {t.name: TeamSerializer(t).data for t in Team.objects.all()}
    fixtures = FixtureSerializer(Fixture.objects.all(), many=True).data
    market = {str(m.match_no): MarketSerializer(m).data for m in MarketOdds.objects.all()}
    results = _results_payload()
    closed = _closed_payload()
    overrides = _overrides_payload()

    ai_picks, prob_f = eng.freeze("fav")
    reach = eng.simulate(int(request.query_params.get("n", 1500)))
    ai_points = eng.score_ai()

    data = {
        "teams": teams,
        "fixtures": fixtures,
        "market": market,
        "state": _state_payload(state),
        "results": results,
        "overrides": overrides,
        "closed_matches": closed,
        "ai_picks": _int_keyed(ai_picks),
        "prob_f": _int_keyed(prob_f),
        "reach": reach,
        "ai_points": ai_points,
        "base_points": BASE,
        "live_panel": _live_state_payload(request)["live_panel"],
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


@api_view(["GET"])
@permission_classes([AllowAny])
def live_state(request):
    return Response(_live_state_payload(request))


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
    data = TeamSerializer(team).data
    data["reach"] = eng.simulate(2000).get(name)
    st = eng.status_of(name)
    data["status"] = st                       # alive | out | champ
    nm = eng.next_match(name) if st != "out" else None
    data["next_match"] = nm                    # {opponent, my_prob, pending, round_label}

    # IA Kimi: solo proyecta equipos VIVOS, sobre su próximo rival probable
    if request.query_params.get("ai") == "1" and st != "out" and nm:
        opp = nm["opponent"]
        opp_team = Team.objects.filter(name=opp).first()
        data["projection"] = kimi_predict(
            name, opp, eng.p_win(name, opp),
            team.stats, (opp_team.stats if opp_team else {}),
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
    # partido ya jugado o cerrado por el admin => pronóstico bloqueado
    if Result.objects.filter(round=r, index=i).exists():
        return Response({"detail": "Ese partido ya se jugó; el pronóstico está bloqueado."},
                        status=status.HTTP_400_BAD_REQUEST)
    if ClosedMatch.objects.filter(round=r, index=i).exists():
        return Response({"detail": "Ese partido está cerrado para pronósticos."},
                        status=status.HTTP_400_BAD_REQUEST)
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
                      "score": request.data.get("score", ""),
                      "status": "finished", "minute": ""},
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
def admin_sync_fifa(request):
    """Trae resultados reales de FIFA al instante (botón del panel)."""
    if not _is_admin(request):
        return Response(status=status.HTTP_403_FORBIDDEN)
    try:
        from .fifa import sync_results
        n, logs = sync_results()
        return Response({"updated": n, "logs": logs[:40]})
    except Exception as e:
        return Response({"detail": f"Error FIFA: {e}"}, status=status.HTTP_502_BAD_GATEWAY)


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


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def admin_match_lock(request):
    """Abre/cierra un partido concreto para pronósticos."""
    if not _is_admin(request):
        return Response(status=status.HTTP_403_FORBIDDEN)
    r = int(request.data.get("round")); i = int(request.data.get("index"))
    if request.data.get("closed"):
        ClosedMatch.objects.get_or_create(round=r, index=i)
    else:
        ClosedMatch.objects.filter(round=r, index=i).delete()
    return Response({"ok": True})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def admin_predictions(request):
    """Lista TODOS los pronósticos: usuario, cuándo, partido, pronóstico."""
    if not _is_admin(request):
        return Response(status=status.HTTP_403_FORBIDDEN)
    eng = build_engine()
    rounds = eng.resolve("fav")["rounds"]
    out = []
    for p in Prediction.objects.select_related("user").order_by("-updated_at"):
        m = rounds[p.round][p.index] if p.round < len(rounds) and p.index < len(rounds[p.round]) else {}
        out.append({
            "id": p.id, "user": p.user.name or p.user.email, "email": p.user.email,
            "round": p.round, "round_label": ROUND_LABELS[p.round], "index": p.index,
            "team_a": m.get("a"), "team_b": m.get("b"), "pick": p.pick,
            "score": (f"{p.goal_a}-{p.goal_b}" if p.goal_a is not None and p.goal_b is not None else ""),
            "created_at": p.created_at, "updated_at": p.updated_at,
        })
    return Response(out)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def admin_prediction_delete(request, pid):
    """Elimina un pronóstico para que el usuario lo vuelva a hacer."""
    if not _is_admin(request):
        return Response(status=status.HTTP_403_FORBIDDEN)
    Prediction.objects.filter(pk=pid).delete()
    return Response(status=status.HTTP_204_NO_CONTENT)
