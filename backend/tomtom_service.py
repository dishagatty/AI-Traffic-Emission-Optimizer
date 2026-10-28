import os
import requests
from dotenv import load_dotenv

# Load environment variables from backend/.env
load_dotenv("backend/.env")

TOMTOM_API_KEY = os.getenv("TOMTOM_API_KEY")

BASE_URL = "https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json"


def get_live_traffic(latitude, longitude):
    """
    Fetch live traffic information from TomTom
    for a given latitude and longitude.
    """

    if not TOMTOM_API_KEY:
        raise ValueError("TOMTOM_API_KEY is not configured")

    params = {
        "key": TOMTOM_API_KEY,
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

    return {
        "current_speed": flow_data.get("currentSpeed"),
        "free_flow_speed": flow_data.get("freeFlowSpeed"),
        "current_travel_time": flow_data.get("currentTravelTime"),
        "free_flow_travel_time": flow_data.get("freeFlowTravelTime"),
        "confidence": flow_data.get("confidence"),
        "road_closure": flow_data.get("roadClosure")
    }