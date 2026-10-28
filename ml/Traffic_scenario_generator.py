import pandas as pd
import numpy as np
from pathlib import Path

# ============================================================
# AI URBAN TRAFFIC & EMISSION INTERVENTION OPTIMIZER
# STEP 1: TRAFFIC SCENARIO GENERATOR
# ============================================================

# ------------------------------------------------------------
# 1. PROJECT PATH
# ------------------------------------------------------------

# This finds the main AI_Traffic_Project folder
PROJECT_FOLDER = Path(__file__).resolve().parent.parent

# Input file
SMART_CITY_FILE = (
    PROJECT_FOLDER
    / "data"
    / "raw"
    / "mangaluru_smart_city_traffic.csv"
)

# Output folder
OUTPUT_FOLDER = (
    PROJECT_FOLDER
    / "data"
    / "processed"
)

# Output file
OUTPUT_FILE = (
    OUTPUT_FOLDER
    / "mangaluru_traffic_scenarios.csv"
)


# ------------------------------------------------------------
# 2. CHECK FILE
# ------------------------------------------------------------

if not SMART_CITY_FILE.exists():
    raise FileNotFoundError(
        f"Smart City CSV not found:\n{SMART_CITY_FILE}"
    )

print("Smart City traffic file found.")
print(SMART_CITY_FILE)


# ------------------------------------------------------------
# 3. CREATE OUTPUT FOLDER
# ------------------------------------------------------------

OUTPUT_FOLDER.mkdir(
    parents=True,
    exist_ok=True
)


# ------------------------------------------------------------
# 4. LOAD SMART CITY DATA
# ------------------------------------------------------------

traffic_df = pd.read_csv(
    SMART_CITY_FILE
)

print("\nSmart City dataset loaded.")
print("Rows:", len(traffic_df))
print("Columns:", len(traffic_df.columns))


# ------------------------------------------------------------
# 5. DISPLAY DATA
# ------------------------------------------------------------

print("\nAvailable columns:")
print(
    traffic_df.columns.tolist()
)

print("\nFirst 5 records:")
print(
    traffic_df.head()
)


# ------------------------------------------------------------
# 6. REQUIRED COLUMNS
# ------------------------------------------------------------

required_columns = [
    "Road_Name",
    "Survey_Year",
    "Total_Vehicle_Count",
    "Total_PCU",
    "Peak_Hour_Volume",
    "Peak_Hour_PCU",
    "Peak_Hour"
]

missing_columns = [
    column
    for column in required_columns
    if column not in traffic_df.columns
]

if missing_columns:

    raise ValueError(
        "The following columns are missing:\n"
        + str(missing_columns)
    )

print("\nAll required columns are available.")


# ------------------------------------------------------------
# 7. REMOVE INVALID RECORDS
# ------------------------------------------------------------

traffic_df = traffic_df.dropna(
    subset=[
        "Total_Vehicle_Count",
        "Total_PCU",
        "Peak_Hour_Volume",
        "Peak_Hour_PCU"
    ]
).copy()

print(
    "\nValid road records:",
    len(traffic_df)
)


# ------------------------------------------------------------
# 8. TRAFFIC SCENARIO LEVELS
# ------------------------------------------------------------

# These multipliers create simulation/reference scenarios.
# They are NOT real observed traffic measurements.

scenario_levels = {

    "Low": 0.60,

    "Normal": 0.80,

    "Peak": 1.00,

    "High": 1.20,

    "Very_High": 1.40
}


# ------------------------------------------------------------
# 9. GENERATE SCENARIOS
# ------------------------------------------------------------

scenario_records = []

# Reproducible random variation
np.random.seed(42)


for _, road in traffic_df.iterrows():

    for scenario_name, multiplier in scenario_levels.items():

        # ----------------------------------------------------
        # Traffic volume
        # ----------------------------------------------------

        base_volume = road[
            "Total_Vehicle_Count"
        ]

        random_variation = np.random.uniform(
            0.95,
            1.05
        )

        traffic_volume = (
            base_volume
            * multiplier
            * random_variation
        )

        traffic_volume = int(
            round(traffic_volume)
        )


        # ----------------------------------------------------
        # PCU
        # ----------------------------------------------------

        base_pcu = road[
            "Total_PCU"
        ]

        pcu = (
            base_pcu
            * multiplier
            * random_variation
        )

        pcu = round(
            pcu,
            2
        )


        # ----------------------------------------------------
        # Peak-hour traffic
        # ----------------------------------------------------

        peak_volume = (
            road["Peak_Hour_Volume"]
            * multiplier
            * random_variation
        )

        peak_volume = int(
            round(peak_volume)
        )


        # ----------------------------------------------------
        # Peak-hour PCU
        # ----------------------------------------------------

        peak_pcu = (
            road["Peak_Hour_PCU"]
            * multiplier
            * random_variation
        )

        peak_pcu = round(
            peak_pcu,
            2
        )


        # ----------------------------------------------------
        # Average hourly traffic
        # ----------------------------------------------------

        average_hourly_volume = round(
            traffic_volume / 24,
            2
        )


        # ----------------------------------------------------
        # Reference road capacity
        # ----------------------------------------------------

        # Temporary reference value.
        # We will replace/refine this using SUMO
        # network information in a later step.

        if road["Road_Name"] == "Attavar Road":

            road_capacity = 2400

        else:

            road_capacity = 3000


        # ----------------------------------------------------
        # V/C RATIO
        # ----------------------------------------------------

        vc_ratio = (
            peak_pcu
            / road_capacity
        )

        vc_ratio = round(
            vc_ratio,
            3
        )


        # ----------------------------------------------------
        # CONGESTION LEVEL
        # ----------------------------------------------------

        if vc_ratio < 0.40:

            congestion = "Low"

        elif vc_ratio < 0.60:

            congestion = "Moderate"

        elif vc_ratio < 0.80:

            congestion = "High"

        else:

            congestion = "Severe"


        # ----------------------------------------------------
        # ESTIMATED SPEED
        # ----------------------------------------------------

        # Synthetic reference value.
        # Actual speed will later come from SUMO.

        free_flow_speed = 45

        estimated_speed = (
            free_flow_speed
            / (
                1
                + 0.50 * max(vc_ratio, 0)
            )
        )

        estimated_speed = round(
            estimated_speed,
            2
        )


        # ----------------------------------------------------
        # DELAY INDEX
        # ----------------------------------------------------

        delay_index = (
            free_flow_speed
            / estimated_speed
        )

        delay_index = round(
            delay_index,
            3
        )


        # ----------------------------------------------------
        # STORE RECORD
        # ----------------------------------------------------

        scenario_records.append({

            "Road_Name":
                road["Road_Name"],

            "Reference_Year":
                int(road["Survey_Year"]),

            "Scenario_Level":
                scenario_name,

            "Scenario_Multiplier":
                multiplier,

            "Base_Daily_Vehicle_Count":
                int(
                    road["Total_Vehicle_Count"]
                ),

            "Traffic_Volume":
                traffic_volume,

            "Average_Hourly_Vehicle_Count":
                average_hourly_volume,

            "Base_Total_PCU":
                float(
                    road["Total_PCU"]
                ),

            "PCU":
                pcu,

            "Peak_Hour":
                road["Peak_Hour"],

            "Peak_Hour_Volume":
                peak_volume,

            "Peak_Hour_PCU":
                peak_pcu,

            "Road_Capacity_PCU":
                road_capacity,

            "VC_Ratio":
                vc_ratio,

            "Estimated_Speed_kmph":
                estimated_speed,

            "Delay_Index":
                delay_index,

            "Congestion_Level":
                congestion,

            "Data_Type":
                "Synthetic_Reference",

            "Source":
                "Mangaluru Smart City Limited DPR-4 traffic survey 2018"
        })


# ------------------------------------------------------------
# 10. CREATE DATAFRAME
# ------------------------------------------------------------

scenario_df = pd.DataFrame(
    scenario_records
)


# ------------------------------------------------------------
# 11. SAVE CSV
# ------------------------------------------------------------

scenario_df.to_csv(
    OUTPUT_FILE,
    index=False
)


# ------------------------------------------------------------
# 12. DISPLAY RESULTS
# ------------------------------------------------------------

print("\n==========================================")
print("TRAFFIC SCENARIO GENERATION COMPLETED")
print("==========================================")

print(
    "\nNumber of scenarios:",
    len(scenario_df)
)

print(
    "Number of columns:",
    len(scenario_df.columns)
)

print(
    "\nOutput file:"
)

print(
    OUTPUT_FILE
)


# ------------------------------------------------------------
# 13. SCENARIO SUMMARY
# ------------------------------------------------------------

print(
    "\nScenario distribution:"
)

print(
    scenario_df[
        "Scenario_Level"
    ].value_counts()
)


print(
    "\nCongestion distribution:"
)

print(
    scenario_df[
        "Congestion_Level"
    ].value_counts()
)


# ------------------------------------------------------------
# 14. CHECK MISSING VALUES
# ------------------------------------------------------------

print(
    "\nMissing values:"
)

print(
    scenario_df.isnull().sum()
)


# ------------------------------------------------------------
# 15. SHOW FIRST RECORDS
# ------------------------------------------------------------

print(
    "\nFirst 10 generated scenarios:"
)

print(
    scenario_df.head(10).to_string(
        index=False
    )
)