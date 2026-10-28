import pandas as pd

file = r"data\processed\intervention_results\signal_intervention_comparison.csv"

df = pd.read_csv(file)

metrics = {
    "Average_Travel_Time_s": 0.25,
    "Average_Waiting_Time_s": 0.20,
    "Average_Speed_kmh": 0.15,
    "CO2_mg": 0.20,
    "NOx_mg": 0.10,
    "Fuel_mg": 0.10
}

scores = pd.DataFrame(index=df.index)

for metric, weight in metrics.items():
    values = df[metric].astype(float)
    
    if metric == "Average_Speed_kmh":
        min_value = values.min()
        max_value = values.max()
        if max_value == min_value:
            normalized = 1
        else:
            normalized = (values - min_value) / (max_value - min_value)
    else:
        min_value = values.min()
        max_value = values.max()
        if max_value == min_value:
            normalized = 1
        else:
            normalized = (max_value - values) / (max_value - min_value)
    
    scores[metric] = normalized * weight

df["Overall_Score"] = scores.sum(axis=1) * 100

df.to_csv(
    r"data\processed\intervention_results\scored_interventions.csv",
    index=False
)

best = df.loc[df["Overall_Score"].idxmax()]

print("BEST INTERVENTION")
print("-----------------")
print("Scenario:", best["Scenario_ID"])
print("North-South Green:", best["NorthSouth_Green_s"], "seconds")
print("East-West Green:", best["EastWest_Green_s"], "seconds")
print("Overall Score:", round(best["Overall_Score"], 2))
