import pandas as pd
from pathlib import Path
import math

# ============================================================
# PROJECT PATHS
# ============================================================

PROJECT_DIR = Path(__file__).resolve().parent.parent

DATASET = (
    PROJECT_DIR
    / "data"
    / "processed"
    / "mangaluru_large_traffic_scenarios.csv"
)

ROUTE_FILE = (
    PROJECT_DIR
    / "sumo"
    / "routes"
    / "scenario_1.rou.xml"
)

# ============================================================
# LOAD DATASET
# ============================================================

print("Loading dataset...")

df = pd.read_csv(DATASET)

print("Total scenarios:", len(df))

# ============================================================
# SELECT ONE SCENARIO
# ============================================================

scenario = df.iloc[0]

print("\n==========================================")
print("SELECTED TRAFFIC SCENARIO")
print("==========================================")

print("Scenario ID:", scenario["Scenario_ID"])
print("Road:", scenario["Road_Name"])
print("Scenario Level:", scenario["Scenario_Level"])
print("Traffic Volume:", scenario["Traffic_Volume"])
print("Peak Hour Volume:", scenario["Peak_Hour_Volume"])
print("V/C Ratio:", scenario["VC_Ratio"])
print("Congestion:", scenario["Congestion_Level"])

# ============================================================
# TRAFFIC DEMAND
# ============================================================

peak_hour_volume = float(scenario["Peak_Hour_Volume"])

# Convert vehicles/hour to vehicles/second
vehicles_per_second = peak_hour_volume / 3600

# Simulation duration
simulation_time = 100

# Number of vehicles during simulation
number_of_vehicles = math.ceil(
    vehicles_per_second * simulation_time
)

print("\n==========================================")
print("SUMO TRAFFIC DEMAND")
print("==========================================")

print("Peak hour vehicles/hour:", peak_hour_volume)
print("Vehicles/second:", round(vehicles_per_second, 3))
print("Simulation time:", simulation_time, "seconds")
print("Vehicles to generate:", number_of_vehicles)

# ============================================================
# CREATE SUMO ROUTE FILE
# ============================================================

print("\nCreating SUMO route file...")

with open(ROUTE_FILE, "w") as f:

    f.write('<?xml version="1.0" encoding="UTF-8"?>\n\n')

    f.write("<routes>\n\n")

    # Vehicle type
    f.write("""
    <vType
        id="car"
        accel="2.6"
        decel="4.5"
        sigma="0.5"
        length="5"
        minGap="2.5"
        maxSpeed="13.89"
    />

""")

    # Routes
    f.write("""
    <route
        id="north_to_south"
        edges="north_to_center center_to_south"
    />

    <route
        id="south_to_north"
        edges="south_to_center center_to_north"
    />

    <route
        id="east_to_west"
        edges="east_to_center center_to_west"
    />

    <route
        id="west_to_east"
        edges="west_to_center center_to_east"
    />

""")

    # Generate vehicles
    routes = [
        "north_to_south",
        "south_to_north",
        "east_to_west",
        "west_to_east"
    ]

    for i in range(number_of_vehicles):

        depart_time = i / vehicles_per_second

        route = routes[i % len(routes)]

        f.write(
            f'    <vehicle id="vehicle_{i+1}" '
            f'type="car" '
            f'route="{route}" '
            f'depart="{depart_time:.2f}"/>\n'
        )

    f.write("\n</routes>\n")

print("\n==========================================")
print("ROUTE FILE CREATED")
print("==========================================")

print("File:")
print(ROUTE_FILE)

print("Vehicles:", number_of_vehicles)