import joblib
import pandas as pd
from pathlib import Path
from xgboost import DMatrix

# Project root
PROJECT_ROOT = Path(__file__).resolve().parent.parent

# Model files
MODEL_DIR = PROJECT_ROOT / "ml" / "model"

MODEL_PATH = MODEL_DIR / "xgboost_congestion_model.pkl"
ENCODER_PATH = MODEL_DIR / "congestion_label_encoder.pkl"
FEATURES_PATH = MODEL_DIR / "model_features.pkl"

# Load model files
model = joblib.load(MODEL_PATH)
label_encoder = joblib.load(ENCODER_PATH)
features = joblib.load(FEATURES_PATH)


def predict_congestion(input_data):

    # Convert input into DataFrame
    input_df = pd.DataFrame([input_data])

    # Make sure features are in the correct order
    input_df = input_df[features]

    # Predict class
    prediction = model.predict(input_df)[0]

    # Convert class number to congestion name
    congestion = label_encoder.inverse_transform([prediction])[0]

    # Get prediction probabilities
    probabilities = model.predict_proba(input_df)[0]

    confidence = float(max(probabilities))
    predicted_class = int(prediction)
    class_contributions = model.get_booster().predict(
        DMatrix(input_df, feature_names=features),
        pred_contribs=True,
    )[0, predicted_class]

    return {
        "predicted_congestion": congestion,
        "confidence": round(confidence * 100, 2),
        "class_probabilities": {
            str(label): round(float(probability) * 100, 2)
            for label, probability in zip(label_encoder.classes_, probabilities)
        },
        "explanation": {
            "method": "TreeSHAP (XGBoost pred_contribs)",
            "base_value": round(float(class_contributions[-1]), 6),
            "contribution_scale": "predicted-class raw margin",
            "features": [
                {
                    "feature": feature,
                    "value": float(input_data[feature]),
                    "contribution": round(float(contribution), 6),
                }
                for feature, contribution in zip(features, class_contributions[:-1])
            ],
        },
    }

if __name__ == "__main__":

    sample_input = {
        "Traffic_Volume": 3000,
        "Average_Hourly_Vehicle_Count": 125,
        "PCU": 3200,
        "Peak_Hour_Volume": 3295,
        "Peak_Hour_PCU": 3295,
        "Road_Capacity_PCU": 2685,
        "VC_Ratio": 1.227,
        "Estimated_Speed_kmph": 35.13,
        "Delay_Index": 1.5
    }

    result = predict_congestion(sample_input)

    print("\nPrediction Result:")
    print(result)