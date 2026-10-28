import pandas as pd
import numpy as np
import os

# ============================================================
# AI URBAN TRAFFIC & EMISSION INTERVENTION OPTIMIZER
# Step 3A: Correct Large Synthetic Dataset Generator
# ============================================================

INPUT_FILE = os.path.join(
    "..",
    "data",
    "processed",
    "mangaluru_traffic_scenarios.csv"
)

OUTPUT_FILE = os.path.join(
    "..",
    "data",
    "processed",
    "mangaluru_large_traffic_scenarios.csv"
)

TARGET_RECORDS = 5000
RANDOM_SEED = 42

np.random.seed(RANDOM_SEED)


# ------------------------------------------------------------
# 1. Load verified base dataset
# ------------------------------------------------------------

print("\nLoading base dataset...")

df = pd.read_csv(INPUT_FILE)

print("Base records:", len(df))


# ------------------------------------------------------------
# 2. Generate synthetic scenarios
# ------------------------------------------------------------

generated_rows = []

print("\nGenerating corrected synthetic scenarios...")


for i in range(TARGET_RECORDS):

    # Select one verified base scenario
    base = df.sample(
        n=1,
        random_state=RANDOM_SEED + i
    ).iloc[0]


    # --------------------------------------------------------
    # Traffic volume
    # --------------------------------------------------------

    traffic_factor = np.random.uniform(0.90, 1.10)

    traffic_volume = (
        base["Traffic_Volume"] *
        traffic_factor
    )

    traffic_volume = int(round(traffic_volume))


    # --------------------------------------------------------
    # PCU
    # --------------------------------------------------------

    # Preserve original PCU / Traffic relationship

    pcu_per_vehicle = (
        base["PCU"] /
        base["Traffic_Volume"]
    )

    pcu = (
        traffic_volume *
        pcu_per_vehicle
    )

    pcu *= np.random.uniform(0.98, 1.02)

    pcu = round(pcu, 2)


    # --------------------------------------------------------
    # Average hourly vehicle count
    # --------------------------------------------------------

    hourly_ratio = (
        base["Average_Hourly_Vehicle_Count"] /
        base["Traffic_Volume"]
    )

    average_hourly = (
        traffic_volume *
        hourly_ratio
    )

    average_hourly = round(average_hourly, 2)


    # --------------------------------------------------------
    # Peak hour volume
    # --------------------------------------------------------

    peak_ratio = (
        base["Peak_Hour_Volume"] /
        base["Traffic_Volume"]
    )

    peak_hour_volume = (
        traffic_volume *
        peak_ratio
    )

    peak_hour_volume *= np.random.uniform(
        0.95,
        1.05
    )

    peak_hour_volume = int(
        round(peak_hour_volume)
    )


    # --------------------------------------------------------
    # Peak hour PCU
    # --------------------------------------------------------

    peak_pcu_ratio = (
        base["Peak_Hour_PCU"] /
        base["Peak_Hour_Volume"]
    )

    peak_hour_pcu = (
        peak_hour_volume *
        peak_pcu_ratio
    )

    peak_hour_pcu *= np.random.uniform(
        0.98,
        1.02
    )

    peak_hour_pcu = round(
        peak_hour_pcu,
        2
    )


    # --------------------------------------------------------
    # V/C ratio
    # --------------------------------------------------------

    # IMPORTANT:
    # Calculate V/C using the relationship from the
    # original dataset rather than using the erroneous
    # capacity relationship.

    base_vc = base["VC_Ratio"]

    traffic_change = (
        traffic_volume /
        base["Traffic_Volume"]
    )

    vc_ratio = (
        base_vc *
        traffic_change
    )

    vc_ratio *= np.random.uniform(
        0.98,
        1.02
    )

    vc_ratio = round(
        max(0.10, vc_ratio),
        3
    )


    # --------------------------------------------------------
    # Estimated speed
    # --------------------------------------------------------

    base_speed = base["Estimated_Speed_kmph"]

    # Speed decreases gradually as V/C increases

    speed_change = (
        vc_ratio /
        base_vc
    )

    speed = (
        base_speed *
        (1 - 0.25 * (speed_change - 1))
    )

    speed *= np.random.uniform(
        0.97,
        1.03
    )

    # Keep within reasonable urban range

    speed = np.clip(
        speed,
        15,
        45
    )

    speed = round(
        speed,
        2
    )


    # --------------------------------------------------------
    # Delay index
    # --------------------------------------------------------

    base_delay = base["Delay_Index"]

    delay_change = (
        vc_ratio /
        base_vc
    )

    delay = (
        base_delay *
        (1 + 0.30 * (delay_change - 1))
    )

    delay *= np.random.uniform(
        0.97,
        1.03
    )

    delay = max(
        1.0,
        delay
    )

    delay = round(
        delay,
        3
    )


    # --------------------------------------------------------
    # Congestion classification
    # --------------------------------------------------------

    if vc_ratio < 0.50:

        congestion = "Low"

    elif vc_ratio < 0.80:

        congestion = "Moderate"

    elif vc_ratio < 1.00:

        congestion = "High"

    else:

        congestion = "Severe"


    # --------------------------------------------------------
    # Create synthetic row
    # --------------------------------------------------------

    row = {

        "Scenario_ID":
            i + 1,

        "Road_Name":
            base["Road_Name"],

        "Reference_Year":
            base["Reference_Year"],

        "Scenario_Level":
            base["Scenario_Level"],

        "Scenario_Multiplier":
            base["Scenario_Multiplier"],

        "Base_Daily_Vehicle_Count":
            base["Base_Daily_Vehicle_Count"],

        "Traffic_Volume":
            traffic_volume,

        "Average_Hourly_Vehicle_Count":
            average_hourly,

        "Base_Total_PCU":
            base["Base_Total_PCU"],

        "PCU":
            pcu,

        "Peak_Hour":
            base["Peak_Hour"],

        "Peak_Hour_Volume":
            peak_hour_volume,

        "Peak_Hour_PCU":
            peak_hour_pcu,

        "Road_Capacity_PCU":
            base["Road_Capacity_PCU"],

        "VC_Ratio":
            vc_ratio,

        "Estimated_Speed_kmph":
            speed,

        "Delay_Index":
            delay,

        "Congestion_Level":
            congestion,

        "Data_Type":
            "Synthetic_Expanded",

        "Source":
            "Synthetic expansion from verified Mangaluru traffic scenarios"
    }

    generated_rows.append(row)


# ------------------------------------------------------------
# 3. Create DataFrame
# ------------------------------------------------------------

large_df = pd.DataFrame(
    generated_rows
)


# ------------------------------------------------------------
# 4. Shuffle
# ------------------------------------------------------------

large_df = large_df.sample(
    frac=1,
    random_state=RANDOM_SEED
).reset_index(drop=True)


# ------------------------------------------------------------
# 5. Save
# ------------------------------------------------------------

large_df.to_csv(
    OUTPUT_FILE,
    index=False
)


# ------------------------------------------------------------
# 6. Display results
# ------------------------------------------------------------

print("\n==============================================")
print("CORRECTED LARGE DATASET GENERATED")
print("==============================================")

print("\nOutput file:")
print(OUTPUT_FILE)

print("\nRecords:")
print(len(large_df))

print("\nColumns:")
print(len(large_df.columns))


print("\n========== CONGESTION DISTRIBUTION ==========")

print(
    large_df["Congestion_Level"]
    .value_counts()
)


print("\n========== ROAD DISTRIBUTION ==========")

print(
    large_df["Road_Name"]
    .value_counts()
)


print("\n========== SCENARIO DISTRIBUTION ==========")

print(
    large_df["Scenario_Level"]
    .value_counts()
)


print("\n========== NUMERICAL SUMMARY ==========")

numeric_columns = [
    "Traffic_Volume",
    "PCU",
    "VC_Ratio",
    "Estimated_Speed_kmph",
    "Delay_Index"
]

print(
    large_df[numeric_columns].describe()
)


print("\n========== RANGE CHECK ==========")

print(
    "\nV/C ratio:",
    large_df["VC_Ratio"].min(),
    "to",
    large_df["VC_Ratio"].max()
)

print(
    "Speed:",
    large_df["Estimated_Speed_kmph"].min(),
    "to",
    large_df["Estimated_Speed_kmph"].max()
)

print(
    "Delay:",
    large_df["Delay_Index"].min(),
    "to",
    large_df["Delay_Index"].max()
)


print("\n==============================================")
print("Dataset saved successfully.")
print("==============================================")