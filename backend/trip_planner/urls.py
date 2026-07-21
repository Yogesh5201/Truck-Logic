"""URL routing for the trip planner app."""

from django.urls import path

from . import views

urlpatterns = [
    path("health/", views.health, name="health"),
    path("simulate-trip/", views.simulate_trip, name="simulate-trip"),
]
