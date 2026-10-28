import xml.etree.ElementTree as ET
import pandas as pd
from pathlib import Path

# Project paths
BASE_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = BASE_DIR / "output"

tripinfo_file = OUTPUT_DIR / "scenario_1_tripinfo.xml"
emission_file = OUTPUT_DIR / "scenario_1_emission.xml"

print("==========================================")
print("SUMO RESULT EXTRACTION")
print("==========================================")

# -------------------------------------------------
# 1. READ TRIPINFO
# -------------------------------------------------

print("\nReading trip information...")

trip_tree = ET.parse(tripinfo_file)
trip_root = trip_tree.getroot()

trip_data = []

for trip in trip_root.findall("tripinfo"):

    trip_data.append({
        "vehicle_id": trip.get("id"),
        "depart": float(trip.get("depart", 0)),
        "arrival": float(trip.get("arrival", 0)),
        "duration": float(trip.get("duration", 0)),
        "route_length_m": float(trip.get("routeLength", 0)),
        "time_loss_s": float(trip.get("timeLoss", 0)),
        "waiting_time_s": float(trip.get("waitingTime", 0)),
        "depart_delay_s": float(trip.get("departDelay", 0))
    })

trip_df = pd.DataFrame(trip_data)

# -------------------------------------------------
# 2. READ EMISSIONS
# -------------------------------------------------

print("Reading emission information...")

emission_tree = ET.parse(emission_file)
emission_root = emission_tree.getroot()

emission_data = []

for timestep in emission_root.findall("timestep"):

    time = float(timestep.get("time", 0))

    for vehicle in timestep.findall("vehicle"):

        emission_data.append({
            "time": time,
            "vehicle_id": vehicle.get("id"),
            "speed_mps": float(vehicle.get("speed", 0)),
            "CO2_mg": float(vehicle.get("CO2", 0)),
            "CO_mg": float(vehicle.get("CO", 0)),
            "HC_mg": float(vehicle.get("HC", 0)),
            "NOx_mg": float(vehicle.get("NOx", 0)),
            "PMx_mg": float(vehicle.get("PMx", 0)),
            "fuel_ml": float(vehicle.get("fuel", 0))
        })

emission_df = pd.DataFrame(emission_data)

# -------------------------------------------------
# 3. CALCULATE SUMMARY
# -------------------------------------------------

print("\nCalculating summary values...")

if not trip_df.empty:

    average_duration = trip_df["duration"].mean()
    average_waiting = trip_df["waiting_time_s"].mean()
    average_time_loss = trip_df["time_loss_s"].mean()

else:

    average_duration = 0
    average_waiting = 0
    average_time_loss = 0


if not emission_df.empty:

    average_speed_kmph = emission_df["speed_mps"].mean() * 3.6

    total_co2 = emission_df["CO2_mg"].sum()
    total_co = emission_df["CO_mg"].sum()
    total_nox = emission_df["NOx_mg"].sum()
    total_pmx = emission_df["PMx_mg"].sum()
    total_fuel = emission_df["fuel_ml"].sum()

else:

    average_speed_kmph = 0
    total_co2 = 0
    total_co = 0
    total_nox = 0
    total_pmx = 0
    total_fuel = 0


# -------------------------------------------------
# 4. PRINT RESULTS
# -------------------------------------------------

print("\n==========================================")
print("SUMO RESULTS")
print("==========================================")

print(f"Vehicles completed: {len(trip_df)}")

print(f"Average travel time: {average_duration:.2f} seconds")

print(f"Average waiting time: {average_waiting:.2f} seconds")

print(f"Average time loss: {average_time_loss:.2f} seconds")

print(f"Average speed: {average_speed_kmph:.2f} km/h")

print("\nTOTAL EMISSIONS")

print(f"CO2:   {total_co2 / 1_000_000:.4f} kg")

print(f"CO:    {total_co / 1_000_000:.4f} kg")

print(f"NOx:   {total_nox / 1_000_000:.4f} kg")

print(f"PMx:   {total_pmx / 1_000_000:.4f} kg")

print(f"Fuel consumption: {total_fuel:.2f} mg")


# -------------------------------------------------
# 5. SAVE CLEAN CSV FILES
# -------------------------------------------------

trip_output = OUTPUT_DIR / "scenario_1_tripinfo.csv"
emission_output = OUTPUT_DIR / "scenario_1_emission.csv"

trip_df.to_csv(trip_output, index=False)
emission_df.to_csv(emission_output, index=False)

print("\n==========================================")
print("FILES CREATED")
print("==========================================")

print(trip_output)
print(emission_output)

print("\nExtraction completed successfully.")