"""DRF serializers enforcing strict validation on trip inputs."""

from rest_framework import serializers

from . import constants as C


class SimulateTripSerializer(serializers.Serializer):
    """Validates the four trip inputs from the assessment brief.

    Locations are accepted as free-text addresses (geocoded server-side).
    ``current_cycle_used`` is the driver's already-accrued on-duty hours in
    the current 8-day cycle and must lie within [0, 70].
    """

    current_location = serializers.CharField(max_length=200, trim_whitespace=True)
    pickup_location = serializers.CharField(max_length=200, trim_whitespace=True)
    dropoff_location = serializers.CharField(max_length=200, trim_whitespace=True)
    current_cycle_used = serializers.FloatField(
        min_value=0.0,
        max_value=C.CYCLE_LIMIT_HOURS,
    )

    def validate_current_location(self, value: str) -> str:
        return self._non_empty(value, "current_location")

    def validate_pickup_location(self, value: str) -> str:
        return self._non_empty(value, "pickup_location")

    def validate_dropoff_location(self, value: str) -> str:
        return self._non_empty(value, "dropoff_location")

    @staticmethod
    def _non_empty(value: str, field: str) -> str:
        if not value or not value.strip():
            raise serializers.ValidationError(f"{field} cannot be blank.")
        return value.strip()
