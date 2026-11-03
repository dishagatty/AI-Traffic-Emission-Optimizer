import os
from pathlib import Path
from typing import Literal
from urllib.parse import quote
import requests
from dotenv import load_dotenv

# Load environment variables from backend/.env
load_dotenv(Path(__file__).resolve().parent / ".env")

BASE_URL = "https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json"
ROUTE_BASE_URL = "https://api.tomtom.com/routing/1/calculateRoute"
REVERSE_GEOCODE_URL = "https://api.tomtom.com/search/2/reverseGeocode"
GEOCODE_URL = "https://api.tomtom.com/search/2/geocode"


class RouteNotFoundError(Exception):
    pass


def get_live_traffic(latitude, longitude):
    """
    Fetch live traffic information from TomTom
    for a given latitude and longitude.
    """

    api_key = os.getenv("TOMTOM_API_KEY")
    if not api_key:
        raise ValueError("TOMTOM_API_KEY is not configured")

    params = {
        "key": api_key,
        "point": f"{latitude},{longitude}",
        "unit": "kmph"
    }

    response = requests.get(
        BASE_URL,
        params=params,
        timeout=10
    )

    response.raise_for_status()

    data = response.json()

    flow_data = data["flowSegmentData"]
    coordinate_data = flow_data.get("coordinates")
    coordinates = (
        coordinate_data.get("coordinate", [])
        if isinstance(coordinate_data, dict)
        else []
    )
    if not isinstance(coordinates, list):
        coordinates = []
    geometry = [
        [coordinate["latitude"], coordinate["longitude"]]
        for coordinate in coordinates
        if isinstance(coordinate, dict)
        and isinstance(coordinate.get("latitude"), (int, float))
        and isinstance(coordinate.get("longitude"), (int, float))
    ]

    return {
        "current_speed": flow_data.get("currentSpeed"),
        "free_flow_speed": flow_data.get("freeFlowSpeed"),
        "current_travel_time": flow_data.get("currentTravelTime"),
        "free_flow_travel_time": flow_data.get("freeFlowTravelTime"),
        "confidence": flow_data.get("confidence"),
        "road_closure": flow_data.get("roadClosure"),
        "geometry": geometry,
    }


def calculate_route(
    origin,
    destination,
    travel_mode: Literal["car", "pedestrian", "bicycle"] = "car",
):
    if travel_mode not in ("car", "pedestrian", "bicycle"):
        raise ValueError("The selected travel mode is not supported.")

    api_key = os.getenv("TOMTOM_API_KEY")
    if not api_key:
        raise ValueError("TOMTOM_API_KEY is not configured")

    traffic_aware = travel_mode == "car"
    locations = (
        f"{origin['latitude']},{origin['longitude']}:"
        f"{destination['latitude']},{destination['longitude']}"
    )
    params = {
        "key": api_key,
        "traffic": str(traffic_aware).lower(),
        "travelMode": travel_mode,
        "routeType": "fastest",
        "routeRepresentation": "polyline",
    }
    if traffic_aware:
        params["computeTravelTimeFor"] = "all"

    response = requests.get(
        f"{ROUTE_BASE_URL}/{locations}/json",
        params=params,
        timeout=15,
    )
    response.raise_for_status()
    payload = response.json()
    if not isinstance(payload, dict):
        raise ValueError("The routing provider returned an invalid response.")

    routes = payload.get("routes", [])
    if not isinstance(routes, list) or not routes:
        raise RouteNotFoundError("No route was found for these points.")

    route = routes[0]
    if not isinstance(route, dict):
        raise ValueError("The routing provider returned an invalid route.")

    summary = route.get("summary", {})
    legs = route.get("legs", [])
    if not isinstance(summary, dict) or not isinstance(legs, list):
        raise ValueError("The routing provider returned an invalid route summary.")

    geometry = []
    for leg in legs:
        if not isinstance(leg, dict):
            continue
        points = leg.get("points", [])
        if not isinstance(points, list):
            continue
        geometry.extend(
            [point["latitude"], point["longitude"]]
            for point in points
            if isinstance(point, dict)
            and "latitude" in point
            and "longitude" in point
        )
    if len(geometry) < 2:
        raise ValueError("The routing provider returned no route geometry.")

    required_summary_fields = ("lengthInMeters", "travelTimeInSeconds")
    if any(field not in summary for field in required_summary_fields):
        raise ValueError("The routing provider returned an incomplete route summary.")

    return {
        "distance_meters": summary["lengthInMeters"],
        "travel_time_seconds": summary["travelTimeInSeconds"],
        "traffic_delay_seconds": summary.get("trafficDelayInSeconds"),
        "no_traffic_travel_time_seconds": summary.get(
            "noTrafficTravelTimeInSeconds"
        ),
        "departure_time": summary.get("departureTime"),
        "arrival_time": summary.get("arrivalTime"),
        "geometry": geometry,
        "travel_mode": travel_mode,
        "traffic_aware": traffic_aware,
        "provider": "TomTom Routing",
    }


def reverse_geocode(latitude, longitude):
    api_key = os.getenv("TOMTOM_API_KEY")
    if not api_key:
        raise ValueError("TOMTOM_API_KEY is not configured")

    response = requests.get(
        f"{REVERSE_GEOCODE_URL}/{latitude},{longitude}.json",
        params={"key": api_key},
        timeout=10,
    )
    response.raise_for_status()
    payload = response.json()
    if not isinstance(payload, dict):
        raise ValueError("The geocoding provider returned an invalid response.")

    addresses = payload.get("addresses", [])
    address = addresses[0].get("address", {}) if addresses else {}
    if not isinstance(address, dict):
        address = {}

    parts = [
        address.get("streetName"),
        address.get("municipality"),
        address.get("countrySubdivision"),
    ]
    name = ", ".join(dict.fromkeys(part for part in parts if part))
    return {
        "name": name or address.get("freeformAddress") or "Map point",
        "latitude": latitude,
        "longitude": longitude,
        "provider": "TomTom Reverse Geocoding",
    }


def geocode_place(query):
    api_key = os.getenv("TOMTOM_API_KEY")
    if not api_key:
        raise ValueError("TOMTOM_API_KEY is not configured")

    response = requests.get(
        f"{GEOCODE_URL}/{quote(query, safe='')}.json",
        params={"key": api_key, "limit": 1, "countrySet": "IN"},
        timeout=10,
    )
    response.raise_for_status()
    payload = response.json()
    if not isinstance(payload, dict):
        raise ValueError("The geocoding provider returned an invalid response.")

    results = payload.get("results", [])
    if not isinstance(results, list) or not results:
        raise RouteNotFoundError("No matching place was found. Try a nearby landmark or address.")

    result = results[0]
    if not isinstance(result, dict):
        raise ValueError("The geocoding provider returned an invalid place.")

    position = result.get("position", {})
    address = result.get("address", {})
    if not isinstance(position, dict) or not isinstance(address, dict):
        raise ValueError("The geocoding provider returned an incomplete place.")

    latitude = position.get("lat")
    longitude = position.get("lon")
    if not isinstance(latitude, (int, float)) or not isinstance(longitude, (int, float)):
        raise ValueError("The geocoding provider returned invalid coordinates.")

    return {
        "name": address.get("freeformAddress") or query,
        "latitude": latitude,
        "longitude": longitude,
        "provider": "TomTom Geocoding",
    }