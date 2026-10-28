import pandas as pd
import subprocess
import math
import xml.etree.ElementTree as ET
from pathlib import Path
import shutil

# ============================================================
# PROJECT PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parent
PROJECT_DIR = BASE_DIR.parent

DATASET = PROJECT_DIR / "data" / "processed" / "mangaluru_large_traffic_scenarios.csv"

SUMO_BIN = Path(r"C:\Program Files (x86)\Eclipse\Sumo\bin")

SUMO = SUMO_BIN / "sumo.exe"

NETWORK_FILE = BASE_DIR / "network" / "test_network.net.xml"

ROUTE_DIR = BASE_DIR / "routes"
CONFIG_DIR = BASE_DIR / "configs"
OUTPUT_DIR = BASE_DIR / "output"

ROUTE_DIR.mkdir(exist_ok=True)
CONFIG_DIR.mkdir(exist_ok=True)
OUTPUT_DIR.mkdir(exist_ok=True)


# ============================================================
# SETTINGS
# ============================================================

NUMBER_OF_SCENARIOS = 10

SIMULATION_TIME = 300

# ============================================================
# LOAD DATASET
# ============================================================

print("==========================================")
print("MULTI-SCENARIO SUMO SIMULATION")
print("==========================================")

print("\nLoading dataset...")

df = pd.read_csv(DATASET)

print(f"Total scenarios available: {len(df)}")

# Take first 10 scenarios
scenarios = df.head(NUMBER_OF_SCENARIOS).copy()

print(f"Scenarios selected for testing: {len(scenarios)}")


# ============================================================
# FUNCTION: CREATE ROUTE FILE
# ============================================================

def create_route_file(scenario_id, peak_hour_volume):

    route_file = ROUTE_DIR / f"scenario_{scenario_id}.rou.xml"

    vehicles_per_second = peak_hour_volume / 3600

    number_of_vehicles = math.ceil(
        vehicles_per_second * SIMULATION_TIME
    )

    # Vehicle type
    xml = """<?xml version="1.0" encoding="UTF-8"?>

<routes>

    <vType id="car"
           accel="2.6"
           decel="4.5"
           sigma="0.5"
           length="5"
           minGap="2.5"
           maxSpeed="13.89"/>

    <route id="north_to_south"
           edges="north_to_center center_to_south"/>

    <route id="south_to_north"
           edges="south_to_center center_to_north"/>

    <route id="east_to_west"
           edges="east_to_center center_to_west"/>

    <route id="west_to_east"
           edges="west_to_center center_to_east"/>

"""

    routes = [
        "north_to_south",
        "south_to_north",
        "east_to_west",
        "west_to_east"
    ]

    for i in range(number_of_vehicles):

        departure_time = i / vehicles_per_second

        route = routes[i % len(routes)]

        xml += f"""
    <vehicle id="scenario_{scenario_id}_vehicle_{i+1}"
             type="car"
             route="{route}"
             depart="{departure_time:.2f}"/>
"""

    xml += """

</routes>
"""

    route_file.write_text(xml, encoding="utf-8")

    return route_file, number_of_vehicles


# ============================================================
# FUNCTION: CREATE SUMO CONFIG
# ============================================================

def create_config(scenario_id, route_file):

    config_file = CONFIG_DIR / f"scenario_{scenario_id}.sumocfg"

    output_tripinfo = OUTPUT_DIR / f"scenario_{scenario_id}_tripinfo.xml"
    output_emission = OUTPUT_DIR / f"scenario_{scenario_id}_emission.xml"
    output_summary = OUTPUT_DIR / f"scenario_{scenario_id}_summary.xml"

    config = f"""<?xml version="1.0" encoding="UTF-8"?>

<configuration>

    <input>

        <net-file value="{NETWORK_FILE}"/>

        <route-files value="{route_file}"/>

    </input>

    <output>

        <tripinfo-output value="{output_tripinfo}"/>

        <emission-output value="{output_emission}"/>

        <summary-output value="{output_summary}"/>

    </output>

    <time>

        <begin value="0"/>

        <end value="{SIMULATION_TIME}"/>

    </time>

</configuration>
"""

    config_file.write_text(config, encoding="utf-8")

    return config_file


# ============================================================
# FUNCTION: READ TRIPINFO
# ============================================================

def read_tripinfo(file):

    tree = ET.parse(file)

    root = tree.getroot()

    travel_times = []
    waiting_times = []
    time_losses = []
    speeds = []

    for trip in root.findall("tripinfo"):

        travel_times.append(
            float(trip.get("duration", 0))
        )

        waiting_times.append(
            float(trip.get("waitingTime", 0))
        )

        time_losses.append(
            float(trip.get("timeLoss", 0))
        )

        route_length = float(
            trip.get("routeLength", 0)
        )

        duration = float(
            trip.get("duration", 0)
        )

        if duration > 0:

            speed = route_length / duration

            speeds.append(speed * 3.6)

    if len(travel_times) == 0:

        return {
            "vehicles_completed": 0,
            "average_travel_time": 0,
            "average_waiting_time": 0,
            "average_time_loss": 0,
            "average_speed": 0
        }

    return {
        "vehicles_completed": len(travel_times),

        "average_travel_time":
            sum(travel_times) / len(travel_times),

        "average_waiting_time":
            sum(waiting_times) / len(waiting_times),

        "average_time_loss":
            sum(time_losses) / len(time_losses),

        "average_speed":
            sum(speeds) / len(speeds)
            if speeds else 0
    }


# ============================================================
# FUNCTION: READ EMISSIONS
# ============================================================

def read_emissions(file):

    tree = ET.parse(file)

    root = tree.getroot()

    total_co2 = 0
    total_co = 0
    total_nox = 0
    total_pmx = 0
    total_fuel = 0

    for timestep in root.findall("timestep"):

        for vehicle in timestep.findall("vehicle"):

            total_co2 += float(
                vehicle.get("CO2", 0)
            )

            total_co += float(
                vehicle.get("CO", 0)
            )

            total_nox += float(
                vehicle.get("NOx", 0)
            )

            total_pmx += float(
                vehicle.get("PMx", 0)
            )

            total_fuel += float(
                vehicle.get("fuel", 0)
            )

    return {
        "CO2_mg": total_co2,
        "CO_mg": total_co,
        "NOx_mg": total_nox,
        "PMx_mg": total_pmx,
        "fuel_mg": total_fuel
    }


# ============================================================
# RUN SCENARIOS
# ============================================================

results = []

for index, row in scenarios.iterrows():

    scenario_id = int(row["Scenario_ID"])

    peak_hour_volume = float(
        row["Peak_Hour_Volume"]
    )

    print("\n------------------------------------------")

    print(f"Scenario: {scenario_id}")

    print(f"Road: {row['Road_Name']}")

    print(f"Level: {row['Scenario_Level']}")

    print(f"Peak hour volume: {peak_hour_volume}")

    # --------------------------------------------------------
    # CREATE ROUTE FILE
    # --------------------------------------------------------

    route_file, vehicle_count = create_route_file(
        scenario_id,
        peak_hour_volume
    )

    print(f"Vehicles generated: {vehicle_count}")

    # --------------------------------------------------------
    # CREATE CONFIG
    # --------------------------------------------------------

    config_file = create_config(
        scenario_id,
        route_file
    )

    # --------------------------------------------------------
    # RUN SUMO
    # --------------------------------------------------------

    print("Running SUMO...")

    command = [
        str(SUMO),
        "-c",
        str(config_file),
        "--no-step-log",
        "--no-warnings"
    ]

    process = subprocess.run(
        command,
        capture_output=True,
        text=True
    )

    if process.returncode != 0:

        print("SUMO ERROR:")

        print(process.stderr)

        continue

    print("SUMO completed successfully.")

    # --------------------------------------------------------
    # READ RESULTS
    # --------------------------------------------------------

    tripinfo_file = OUTPUT_DIR / \
        f"scenario_{scenario_id}_tripinfo.xml"

    emission_file = OUTPUT_DIR / \
        f"scenario_{scenario_id}_emission.xml"

    if not tripinfo_file.exists():

        print("Tripinfo file missing.")

        continue

    if not emission_file.exists():

        print("Emission file missing.")

        continue

    traffic = read_tripinfo(
        tripinfo_file
    )

    emissions = read_emissions(
        emission_file
    )

    # --------------------------------------------------------
    # COMBINE RESULTS
    # --------------------------------------------------------

    result = row.to_dict()

    result.update(traffic)

    result.update(emissions)

    results.append(result)

    print(
        f"Completed vehicles: "
        f"{traffic['vehicles_completed']}"
    )

    print(
        f"Average speed: "
        f"{traffic['average_speed']:.2f} km/h"
    )

    print(
        f"Average waiting time: "
        f"{traffic['average_waiting_time']:.2f} sec"
    )

    print(
        f"CO2: "
        f"{emissions['CO2_mg'] / 1_000_000:.4f} kg"
    )


# ============================================================
# SAVE FINAL RESULTS
# ============================================================

print("\n==========================================")
print("SAVING RESULTS")
print("==========================================")

if results:

    results_df = pd.DataFrame(results)

    output_file = (
        PROJECT_DIR
        / "data"
        / "processed"
        / "sumo_test_results_10.csv"
    )

    results_df.to_csv(
        output_file,
        index=False
    )

    print(
        f"\nResults saved to:\n{output_file}"
    )

    print(
        f"\nTotal successful scenarios: "
        f"{len(results_df)}"
    )

else:

    print("\nNo successful scenarios.")

print("\n==========================================")
print("SIMULATION FINISHED")
print("==========================================")