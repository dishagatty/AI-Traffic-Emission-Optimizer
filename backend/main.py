from fastapi import FastAPI, Response, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
from pathlib import Path
import sys
import os
import requests
from typing import Literal
from dotenv import load_dotenv
from pydantic import BaseModel, Field
from backend.tomtom_service import (
    RouteNotFoundError,
    calculate_route,
    geocode_place,
    get_live_traffic,
    reverse_geocode,
)
from backend.auth import (
    router as auth_router,
    get_current_user,
)
from backend.models import User

PROJECT_ROOT = Path(__file__).resolve().parent.parent

load_dotenv(PROJECT_ROOT / "backend" / ".env")

TOMTOM_API_KEY = os.getenv("TOMTOM_API_KEY")

sys.path.insert(0, str(PROJECT_ROOT))

from scripts.recommendation_helper import get_recommendation
from scripts.predict_helper import predict_congestion

app = FastAPI(
    title="AI Urban Traffic & Emission Intervention Optimizer",
    description="Traffic intervention recommendation API",
    version="1.0.0"
)
app.include_router(auth_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {
        "message": "AI Urban Traffic & Emission Intervention Optimizer API is running"
    }

@app.get("/recommendation")
def recommendation(
    current_user: User = Depends(get_current_user)
):
    return get_recommendation()

@app.get("/health")
def health():
    return {
        "status": "healthy"
    }

@app.get("/comparison")
def comparison(
    current_user: User = Depends(get_current_user)
):
    file_path = (
        PROJECT_ROOT
        / "data"
        / "processed"
        / "intervention_results"
        / "signal_intervention_comparison.csv"
    )

    df = pd.read_csv(file_path)
    return df.to_dict(orient="records")

@app.get("/traffic-roads")
def get_traffic_roads(
    current_user: User = Depends(get_current_user)
):
    csv_path = (
        Path(__file__).resolve().parent.parent
        / "data"
        / "processed"
        / "mangaluru_large_traffic_scenarios.csv"
    )

    df = pd.read_csv(csv_path)

    # Select one Normal scenario for each road
    roads_df = df[df["Scenario_Level"] == "Normal"].copy()

    roads_df = roads_df.drop_duplicates(
        subset=["Road_Name"],
        keep="first"
    )

    roads = []

    # Map coordinates used for the current Mangaluru visualization
    coordinates = {
        "Balmatta Road two way": [12.8700, 74.8500],
        "Mother Theresa Road": [12.8750, 74.8550],
        "KS Rao Road": [12.8720, 74.8430],
        "KS Rao Road near City Point": [12.8740, 74.8460],
        "KRR Road": [12.8650, 74.8480],
        "Attavar Road": [12.8680, 74.8420],
        "Bunts Hostel Road": [12.8780, 74.8500]
    }

    for _, row in roads_df.iterrows():

        road_name = row["Road_Name"]

        if road_name not in coordinates:
            continue

        roads.append({
            "name": road_name,
            "lat": coordinates[road_name][0],
            "lng": coordinates[road_name][1],
            "scenarioId": int(row["Scenario_ID"]),
            "traffic": int(row["Traffic_Volume"]),
            "peakTraffic": int(row["Peak_Hour_Volume"]),
            "vcRatio": float(row["VC_Ratio"]),
            "speed": float(row["Estimated_Speed_kmph"]),
            "delay": float(row["Delay_Index"]),
            "congestion": row["Congestion_Level"],
            "scenarioLevel": row["Scenario_Level"],
            "peakPeriod": row["Peak_Hour"],
            "features": {
                feature: float(row[feature])
                for feature in (
                    "Traffic_Volume",
                    "Average_Hourly_Vehicle_Count",
                    "PCU",
                    "Peak_Hour_Volume",
                    "Peak_Hour_PCU",
                    "Road_Capacity_PCU",
                    "VC_Ratio",
                    "Estimated_Speed_kmph",
                    "Delay_Index",
                )
            },
        })

    return roads

# ==========================================
# ML CONGESTION PREDICTION
# ==========================================

class TrafficInput(BaseModel):
    Traffic_Volume: float
    Average_Hourly_Vehicle_Count: float
    PCU: float
    Peak_Hour_Volume: float
    Peak_Hour_PCU: float
    Road_Capacity_PCU: float
    VC_Ratio: float
    Estimated_Speed_kmph: float
    Delay_Index: float


class RouteCoordinate(BaseModel):
    latitude: float = Field(ge=12.6, le=13.1)
    longitude: float = Field(ge=74.6, le=75.1)


class RouteRequest(BaseModel):
    origin: RouteCoordinate
    destination: RouteCoordinate
    travel_mode: Literal["car", "pedestrian", "bicycle"] = "car"


@app.post("/route")
def route(
    data: RouteRequest,
    current_user: User = Depends(get_current_user),
):
    if not os.getenv("TOMTOM_API_KEY"):
        raise HTTPException(
            status_code=503,
            detail="Live route planning is unavailable because the routing provider is not configured.",
        )

    try:
        return calculate_route(
            data.origin.model_dump(),
            data.destination.model_dump(),
            data.travel_mode,
        )
    except RouteNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except requests.Timeout as error:
        raise HTTPException(
            status_code=504,
            detail="The routing provider took too long to respond. Please try again.",
        ) from error
    except requests.RequestException as error:
        raise HTTPException(
            status_code=502,
            detail="The live routing provider could not calculate this route.",
        ) from error
    except ValueError as error:
        raise HTTPException(
            status_code=502,
            detail="The routing provider returned an invalid route response.",
        ) from error


@app.get("/reverse-geocode")
def reverse_geocode_point(
    latitude: float = Query(ge=12.6, le=13.1),
    longitude: float = Query(ge=74.6, le=75.1),
    current_user: User = Depends(get_current_user),
):
    if not os.getenv("TOMTOM_API_KEY"):
        raise HTTPException(
            status_code=503,
            detail="Place names are unavailable because the geocoding provider is not configured.",
        )

    try:
        return reverse_geocode(latitude, longitude)
    except requests.Timeout as error:
        raise HTTPException(
            status_code=504,
            detail="The place-name lookup took too long to respond.",
        ) from error
    except requests.RequestException as error:
        raise HTTPException(
            status_code=502,
            detail="The geocoding provider could not identify this map point.",
        ) from error
    except ValueError as error:
        raise HTTPException(
            status_code=502,
            detail="The geocoding provider returned an invalid place response.",
        ) from error


@app.get("/geocode")
def geocode_place_name(
    query: str = Query(min_length=2, max_length=200),
    current_user: User = Depends(get_current_user),
):
    if not os.getenv("TOMTOM_API_KEY"):
        raise HTTPException(
            status_code=503,
            detail="Place search is unavailable because the geocoding provider is not configured.",
        )

    try:
        return geocode_place(query)
    except RouteNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except requests.Timeout as error:
        raise HTTPException(
            status_code=504,
            detail="The place search took too long to respond.",
        ) from error
    except requests.RequestException as error:
        raise HTTPException(
            status_code=502,
            detail="The geocoding provider could not find this place.",
        ) from error
    except ValueError as error:
        raise HTTPException(
            status_code=502,
            detail="The geocoding provider returned an invalid place response.",
        ) from error


@app.post("/predict")
def predict_traffic(
    data: TrafficInput,
    current_user: User = Depends(get_current_user)
):

    input_data = data.dict()

    result = predict_congestion(input_data)

    return result


@app.get("/live-traffic")
def live_traffic(
    latitude: float,
    longitude: float,
    current_user: User = Depends(get_current_user)
):
    return get_live_traffic(latitude, longitude)


@app.get("/tomtom-traffic-tile/{z}/{x}/{y}")
def tomtom_traffic_tile(
    z: int,
    x: int,
    y: int,
    current_user: User = Depends(get_current_user)
):
    if not TOMTOM_API_KEY:
        return Response(
            content="TomTom API key is not configured",
            status_code=500
        )

    url = (
        f"https://api.tomtom.com/traffic/map/4/tile/flow/"
        f"relative0/{z}/{x}/{y}.png"
    )

    try:
        response = requests.get(
            url,
            params={
                "key": TOMTOM_API_KEY
            },
            timeout=10
        )
    except requests.Timeout as error:
        raise HTTPException(
            status_code=504,
            detail="The live traffic tile took too long to respond.",
        ) from error
    except requests.RequestException as error:
        raise HTTPException(
            status_code=502,
            detail="The live traffic tile could not be loaded.",
        ) from error

    return Response(
        content=response.content,
        status_code=response.status_code,
        media_type=response.headers.get(
            "content-type",
            "image/png"
        )
    )