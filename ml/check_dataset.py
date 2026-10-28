import pandas as pd
import os

file_path = os.path.join(
    "..",
    "data",
    "processed",
    "mangaluru_traffic_scenarios.csv"
)

df = pd.read_csv(file_path)

print("\n========== DATASET SUMMARY ==========\n")

print("Rows:", len(df))
print("Columns:", len(df.columns))

print("\n========== ROAD NAMES ==========\n")
print(df["Road_Name"].value_counts())

print("\n========== SCENARIO LEVELS ==========\n")
print(df["Scenario_Level"].value_counts())

print("\n========== SCENARIO MULTIPLIERS ==========\n")
print(sorted(df["Scenario_Multiplier"].unique()))

print("\n========== CONGESTION LEVELS ==========\n")
print(df["Congestion_Level"].value_counts())

print("\n========== DATA TYPES ==========\n")
print(df["Data_Type"].value_counts())

print("\n========== TRAFFIC VOLUME ==========\n")
print(df["Traffic_Volume"].describe())

print("\n========== PCU ==========\n")
print(df["PCU"].describe())

print("\n========== V/C RATIO ==========\n")
print(df["VC_Ratio"].describe())

print("\n========== SPEED ==========\n")
print(df["Estimated_Speed_kmph"].describe())

print("\n========== DELAY INDEX ==========\n")
print(df["Delay_Index"].describe())

print("\n========== SCENARIO TABLE ==========\n")

columns_to_show = [
    "Road_Name",
    "Scenario_Level",
    "Scenario_Multiplier",
    "Traffic_Volume",
    "PCU",
    "VC_Ratio",
    "Estimated_Speed_kmph",
    "Delay_Index",
    "Congestion_Level"
]

print(df[columns_to_show].to_string(index=False))

print("\n====================================")
print("Scenario verification completed.")
print("====================================")