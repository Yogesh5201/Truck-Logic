"""
HTTP views for the trip planner API.

The single endpoint validates inputs, invokes the stateless simulation
service, and returns the structured JSON payload. All heavy computation lives
in ``services/`` — the view stays thin. Routing-provider failures are surfaced
as typed errors carrying a friendly message, an HTTP status, and a machine
code the frontend can branch on.
"""

from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .serializers import SimulateTripSerializer
from .services import simulator
from .services.graphhopper_client import GraphHopperError


@api_view(["GET"])
def health(request):
    """Simple liveness probe for deployment platforms."""
    return Response({"status": "ok"})


@api_view(["POST"])
def simulate_trip(request):
    """POST /api/v1/simulate-trip/ — run one HOS-compliant trip simulation."""
    serializer = SimulateTripSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    try:
        result = simulator.simulate_trip(
            current=data["current_location"],
            pickup=data["pickup_location"],
            dropoff=data["dropoff_location"],
            cycle_used=data["current_cycle_used"],
        )
    except GraphHopperError as exc:
        # Typed routing failures carry their own HTTP status + machine code.
        return Response(
            {"detail": str(exc), "code": exc.code},
            status=exc.http_status,
        )

    return Response(result, status=status.HTTP_200_OK)
