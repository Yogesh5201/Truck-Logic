"""Root URL configuration."""

from django.urls import include, path

urlpatterns = [
    path("api/v1/", include("trip_planner.urls")),
]
