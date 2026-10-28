import pandas as pd
import os

# ============================================================
# Validate 5,000-row Mangaluru Traffic Dataset
# ============================================================

FILE_PATH = os.path.join(
    "..",
    "data",
    "processed",
    "mangaluru_large_traffic_scenarios.csv"
)

print("\nLoading dataset...")

df = pd.read_csv(FILE_PATH)

print("\n==============================================")
print("DATASET VALIDATION")
print("==============================================")

# ------------------------------------------------------------
# Basic information
# ------------------------------------------------------------

print("\nRows:", len(df))
print("Columns:", len(df.columns))

# ------------------------------------------------------------
# Missing values
# ------------------------------------------------------------

print("\n========== MISSING VALUES ==========")

missing = df.isnull().sum()

print(missing)

if missing.sum() == 0:
    print("\nPASS: No missing values.")
else:
    print("\nWARNING: Missing values found.")

# ------------------------------------------------------------
# Duplicate rows
# ------------------------------------------------------------

print("\n========== DUPLICATES ==========")

duplicates = df.duplicated().sum()

print("Duplicate rows:", duplicates)

# ------------------------------------------------------------
# Scenario ID uniqueness
# ------------------------------------------------------------

print("\n========== SCENARIO IDs ==========")

unique_ids = df["Scenario_ID"].nunique()

print("Total IDs:", len(df))
print("Unique IDs:", unique_ids)

if unique_ids == len(df):
    print("PASS: Scenario IDs are unique.")
else:
    print("WARNING: Duplicate Scenario IDs found.")

# ------------------------------------------------------------
# Roads
# ------------------------------------------------------------

print("\n========== ROADS ==========")

print(df["Road_Name"].value_counts())

# ------------------------------------------------------------
# Scenario levels
# ------------------------------------------------------------

print("\n========== SCENARIO LEVELS ==========")

print(df["Scenario_Level"].value_counts())

# ------------------------------------------------------------
# Congestion levels
# ------------------------------------------------------------

print("\n========== CONGESTION ==========")

print(df["Congestion_Level"].value_counts())

# ------------------------------------------------------------
# Numerical ranges
# ------------------------------------------------------------

print("\n========== NUMERICAL RANGES ==========")

numeric_columns = [
    "Traffic_Volume",
    "PCU",
    "VC_Ratio",
    "Estimated_Speed_kmph",
    "Delay_Index"
]

for column in numeric_columns:

    print(
        f"\n{column}:"
    )

    print(
        "Minimum:",
        df[column].min()
    )

    print(
        "Maximum:",
        df[column].max()
    )

    print(
        "Mean:",
        round(df[column].mean(), 3)
    )

# ------------------------------------------------------------
# Logical validation
# ------------------------------------------------------------

print("\n========== LOGICAL CHECKS ==========")

checks_passed = True

# Traffic volume must be positive
if (df["Traffic_Volume"] <= 0).any():

    print("FAIL: Invalid traffic volume.")
    checks_passed = False

else:

    print("PASS: Traffic volume is positive.")


# PCU must be positive
if (df["PCU"] <= 0).any():

    print("FAIL: Invalid PCU.")
    checks_passed = False

else:

    print("PASS: PCU is positive.")


# Speed must be reasonable
if (
    (df["Estimated_Speed_kmph"] < 5) |
    (df["Estimated_Speed_kmph"] > 100)
).any():

    print("FAIL: Unrealistic speed found.")
    checks_passed = False

else:

    print("PASS: Speed range is reasonable.")


# V/C must be positive
if (df["VC_Ratio"] <= 0).any():

    print("FAIL: Invalid V/C ratio.")
    checks_passed = False

else:

    print("PASS: V/C ratio is positive.")


# Delay must be positive
if (df["Delay_Index"] <= 0).any():

    print("FAIL: Invalid delay index.")
    checks_passed = False

else:

    print("PASS: Delay index is positive.")


# ------------------------------------------------------------
# Final result
# ------------------------------------------------------------

print("\n==============================================")

if checks_passed:

    print("ALL BASIC VALIDATION CHECKS PASSED")

else:

    print("SOME VALIDATION CHECKS FAILED")

print("==============================================")