import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    ConfusionMatrixDisplay
)

from xgboost import XGBClassifier


# ==========================================
# 1. LOAD DATASET
# ==========================================

file_path = "../data/processed/mangaluru_large_traffic_scenarios.csv"

df = pd.read_csv(file_path)

print("Dataset shape:", df.shape)
print("\nColumns:")
print(df.columns.tolist())


# ==========================================
# 2. SELECT FEATURES
# ==========================================

features = [
    "Traffic_Volume",
    "Average_Hourly_Vehicle_Count",
    "PCU",
    "Peak_Hour_Volume",
    "Peak_Hour_PCU",
    "Road_Capacity_PCU",
    "VC_Ratio",
    "Estimated_Speed_kmph",
    "Delay_Index"
]

target = "Congestion_Level"

X = df[features]
y = df[target]


# ==========================================
# 3. CHECK MISSING VALUES
# ==========================================

print("\nMissing values:")
print(X.isnull().sum())

print("\nTarget classes:")
print(y.value_counts())


# ==========================================
# 4. ENCODE TARGET
# ==========================================

label_encoder = LabelEncoder()

y_encoded = label_encoder.fit_transform(y)

print("\nClass mapping:")

for number, label in enumerate(label_encoder.classes_):
    print(number, "=", label)


# ==========================================
# 5. TRAIN-TEST SPLIT
# ==========================================

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y_encoded,
    test_size=0.20,
    random_state=42,
    stratify=y_encoded
)

print("\nTraining samples:", len(X_train))
print("Testing samples:", len(X_test))


# ==========================================
# 6. TRAIN XGBOOST MODEL
# ==========================================

model = XGBClassifier(
    n_estimators=200,
    max_depth=6,
    learning_rate=0.05,
    subsample=0.8,
    colsample_bytree=0.8,
    objective="multi:softmax",
    eval_metric="mlogloss",
    random_state=42
)

model.fit(X_train, y_train)

print("\nXGBoost training completed!")


# ==========================================
# 7. PREDICTION
# ==========================================

y_pred = model.predict(X_test)


# ==========================================
# 8. ACCURACY
# ==========================================

accuracy = accuracy_score(y_test, y_pred)

print("\n================================")
print("MODEL ACCURACY")
print("================================")

print(f"Accuracy: {accuracy * 100:.2f}%")


# ==========================================
# 9. CLASSIFICATION REPORT
# ==========================================

print("\n================================")
print("CLASSIFICATION REPORT")
print("================================")

print(
    classification_report(
        y_test,
        y_pred,
        target_names=label_encoder.classes_
    )
)

# ==========================================
# SAVE TRAINED MODEL IMMEDIATELY
# ==========================================

import joblib
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
MODEL_DIR = BASE_DIR / "model"
MODEL_DIR.mkdir(parents=True, exist_ok=True)

model_path = MODEL_DIR / "xgboost_congestion_model.pkl"
encoder_path = MODEL_DIR / "congestion_label_encoder.pkl"
features_path = MODEL_DIR / "model_features.pkl"

joblib.dump(model, model_path)
joblib.dump(label_encoder, encoder_path)
joblib.dump(features, features_path)

print("\n================================")
print("MODEL SAVED SUCCESSFULLY")
print("================================")
print("Model:", model_path)
print("Encoder:", encoder_path)
print("Features:", features_path)

# ==========================================
# 10. CONFUSION MATRIX
# ==========================================

cm = confusion_matrix(y_test, y_pred)

disp = ConfusionMatrixDisplay(
    confusion_matrix=cm,
    display_labels=label_encoder.classes_
)

disp.plot()

plt.title("XGBoost Congestion Classification - Confusion Matrix")
plt.tight_layout()

plt.savefig(
    "xgboost_confusion_matrix.png",
    dpi=300
)

plt.show()


# ==========================================
# 11. FEATURE IMPORTANCE
# ==========================================

importance = pd.DataFrame({
    "Feature": features,
    "Importance": model.feature_importances_
})

importance = importance.sort_values(
    by="Importance",
    ascending=False
)

print("\n================================")
print("FEATURE IMPORTANCE")
print("================================")

print(importance)


# ==========================================
# 12. FEATURE IMPORTANCE GRAPH
# ==========================================

plt.figure(figsize=(10, 6))

plt.barh(
    importance["Feature"],
    importance["Importance"]
)

plt.xlabel("Importance")
plt.ylabel("Feature")
plt.title("XGBoost Feature Importance")

plt.gca().invert_yaxis()

plt.tight_layout()

plt.savefig(
    "xgboost_feature_importance.png",
    dpi=300
)

plt.show()


