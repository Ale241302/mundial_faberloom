from django.urls import path
from . import views

urlpatterns = [
    path("bootstrap/", views.bootstrap),
    path("live/", views.live_state),
    path("simulate/", views.simulate),
    path("team/<str:name>/", views.team_detail),
    path("predictions/", views.my_predictions),
    path("predictions/save/", views.save_prediction),
    path("ranking/", views.ranking),
    path("admin/users/", views.admin_users),
    path("admin/users/<int:uid>/", views.admin_user_detail),
    path("admin/users/<int:uid>/predictions/", views.admin_user_predictions),
    path("admin/result/", views.admin_result),
    path("admin/round/", views.admin_round),
    path("admin/fixture/", views.admin_fixture),
    path("admin/sync-fifa/", views.admin_sync_fifa),
    path("admin/match-lock/", views.admin_match_lock),
    path("admin/predictions/", views.admin_predictions),
    path("admin/predictions/<int:pid>/", views.admin_prediction_delete),
    path("admin/resolve/", views.admin_resolve),
]
