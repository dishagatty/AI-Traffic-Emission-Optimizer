import pandas as pd

file = r"data\processed\intervention_results\scored_interventions.csv"

df = pd.read_csv(file)

best = df.loc[df["Overall_Score"].idxmax()]
baseline = df[df["Scenario_ID"] == "Baseline"].iloc[0]

recommendation = {
    "Recommended_Scenario": best["Scenario_ID"],
    "NorthSouth_Green_s": best["NorthSouth_Green_s"],
    "EastWest_Green_s": best["EastWest_Green_s"],
    "Overall_Score": round(best["Overall_Score"], 2),
    "Travel_Time_Reduction_percent": round(
        (baseline["Average_Travel_Time_s"] - best["Average_Travel_Time_s"])
        / baseline["Average_Travel_Time_s"] * 100, 2
    ),
    "Waiting_Time_Reduction_percent": round(
        (baseline["Average_Waiting_Time_s"] - best["Average_Waiting_Time_s"])
        / baseline["Average_Waiting_Time_s"] * 100, 2
    ),
    "Speed_Improvement_percent": round(
        (best["Average_Speed_kmh"] - baseline["Average_Speed_kmh"])
        / baseline["Average_Speed_kmh"] * 100, 2
    ),
    "CO2_Reduction_percent": round(
        (baseline["CO2_mg"] - best["CO2_mg"])
        / baseline["CO2_mg"] * 100, 2
    ),
    "NOx_Reduction_percent": round(
        (baseline["NOx_mg"] - best["NOx_mg"])
        / baseline["NOx_mg"] * 100, 2
    ),
    "Fuel_Reduction_percent": round(
        (baseline["Fuel_mg"] - best["Fuel_mg"])
        / baseline["Fuel_mg"] * 100, 2
    )
}

pd.DataFrame([recommendation]).to_csv(
    r"data\processed\intervention_results\final_recommendation.csv",
    index=False
)

print("FINAL RECOMMENDATION CREATED")
print("----------------------------")
print("Scenario:", recommendation["Recommended_Scenario"])
print("Signal Timing:", 
      recommendation["NorthSouth_Green_s"], "s N/S +",
      recommendation["EastWest_Green_s"], "s E/W")
print("Overall Score:", recommendation["Overall_Score"])
