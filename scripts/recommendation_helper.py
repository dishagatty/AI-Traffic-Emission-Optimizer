import pandas as pd
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent

RECOMMENDATION_FILE = (
    PROJECT_ROOT
    / "data"
    / "processed"
    / "intervention_results"
    / "final_recommendation.csv"
)

def get_recommendation():
    df = pd.read_csv(RECOMMENDATION_FILE)

    if df.empty:
        return {"error": "No recommendation available"}

    result = df.iloc[0].to_dict()

    return {
        "scenario": result["Recommended_Scenario"],
        "north_south_green_seconds": int(result["NorthSouth_Green_s"]),
        "east_west_green_seconds": int(result["EastWest_Green_s"]),
        "overall_score": float(result["Overall_Score"]),
        "travel_time_reduction_percent": float(result["Travel_Time_Reduction_percent"]),
        "waiting_time_reduction_percent": float(result["Waiting_Time_Reduction_percent"]),
        "speed_improvement_percent": float(result["Speed_Improvement_percent"]),
        "co2_reduction_percent": float(result["CO2_Reduction_percent"]),
        "nox_reduction_percent": float(result["NOx_Reduction_percent"]),
        "fuel_reduction_percent": float(result["Fuel_Reduction_percent"])
    }

if __name__ == "__main__":
    print(get_recommendation())
