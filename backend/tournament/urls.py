from django.urls import path
from . import views

urlpatterns = [
    path("bootstrap/", views.bootstrap),
    path("simulate/", views.simulate),
    path("team/<str:name>/", views.team_detail),
    path("predictions/", views.my_predictions),
    path("predictions/save/", views.save_prediction),
    path("ranking/", views.ranking),
    # admin
    path("admin/users/", views.admin_users),
    path("admin/users/<int:uid>/", views.admin_user_detail),
    path("admin/users/<int:uid>/predictions/", views.admin_user_predictions),
    path("admin/result/", views.admin_result),
    path("admin/round/", views.admin_round),
    path("admin/resolve/", views.admin_resolve),
]
