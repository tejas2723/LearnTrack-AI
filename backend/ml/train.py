import os
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier, GradientBoostingRegressor
from sklearn.model_selection import train_test_split

MODEL_PATH = os.path.join(os.path.dirname(__file__), "model.pkl")

# Define features list
FEATURES = [
    "avg_score_last_5",
    "avg_score_all_time",
    "weak_topic_count",
    "strong_topic_count",
    "avg_time_per_question",
    "difficulty_distribution_score",
    "study_consistency_score",
    "confidence_accuracy_gap",
    "quiz_attempt_frequency",
    "previous_cgpa",
    "attendance_percentage"
]

def generate_synthetic_data(n_samples: int = 500) -> pd.DataFrame:
    """
    Generates a realistic synthetic training dataset for the improved features.
    """
    np.random.seed(42)
    
    # 1. Generate features
    avg_score_all_time = np.random.uniform(40.0, 100.0, n_samples)
    
    # avg_score_last_5 correlates strongly with avg_score_all_time with some noise
    avg_score_last_5 = np.clip(avg_score_all_time + np.random.normal(0, 5.0, n_samples), 30.0, 100.0)
    
    # topic counts correlate with scores
    weak_topic_count = np.clip((100.0 - avg_score_all_time) // 12.0 + np.random.randint(-1, 2, n_samples), 0.0, 6.0)
    strong_topic_count = np.clip((avg_score_all_time - 50.0) // 10.0 + np.random.randint(-1, 2, n_samples), 0.0, 6.0)
    
    avg_time_per_question = np.random.uniform(20.0, 90.0, n_samples)
    
    # difficulty_distribution_score correlates with overall performance
    difficulty_distribution_score = np.clip(avg_score_all_time * np.random.uniform(0.8, 1.15, n_samples), 10.0, 100.0)
    
    study_consistency_score = np.random.uniform(0.1, 1.0, n_samples)
    
    # confidence_accuracy_gap: wrong but confident (negative correlation with avg_score)
    confidence_accuracy_gap = np.clip((100.0 - avg_score_all_time) * np.random.uniform(0.0, 0.4, n_samples), 0.0, 50.0)
    
    quiz_attempt_frequency = np.random.uniform(0.2, 4.0, n_samples)
    
    # New Academic Features
    previous_cgpa = np.random.uniform(4.0, 10.0, n_samples)
    attendance_percentage = np.random.uniform(40.0, 100.0, n_samples)
    
    # 2. Formulate target exam score (0-100) using a realistic weighted formula with noise
    noise = np.random.normal(0, 2.0, n_samples)
    
    # Base calculation (Heavily weighted by academic baseline to make it perfectly accurate to core academic profile)
    # CGPA normalized to 100 scale: previous_cgpa * 10
    predicted_score = (
        (previous_cgpa * 10.0 * 0.40) +          # 40% weight on CGPA
        (attendance_percentage * 0.10) +         # 10% weight on attendance
        (avg_score_all_time * 0.20) +            # 20% weight on all-time quiz average
        (avg_score_last_5 * 0.15) +              # 15% weight on recent quiz average
        (study_consistency_score * 5.0) +        # 5% max on consistency
        (difficulty_distribution_score * 0.05) -
        (weak_topic_count * 1.5) +
        (strong_topic_count * 1.0) -
        (confidence_accuracy_gap * 0.10) -
        (np.abs(avg_time_per_question - 55.0) * 0.05) +
        (quiz_attempt_frequency * 0.5)
    )
    predicted_score = np.clip(predicted_score + noise, 30.0, 100.0)
    
    # 3. Formulate target risk level (High / Medium / Low) based on final score
    risk_level = []
    for s in predicted_score:
        if s < 60.0:
            risk_level.append("High")
        elif s < 75.0:
            risk_level.append("Medium")
        else:
            risk_level.append("Low")
            
    df = pd.DataFrame({
        "avg_score_last_5": avg_score_last_5,
        "avg_score_all_time": avg_score_all_time,
        "weak_topic_count": weak_topic_count,
        "strong_topic_count": strong_topic_count,
        "avg_time_per_question": avg_time_per_question,
        "difficulty_distribution_score": difficulty_distribution_score,
        "study_consistency_score": study_consistency_score,
        "confidence_accuracy_gap": confidence_accuracy_gap,
        "quiz_attempt_frequency": quiz_attempt_frequency,
        "previous_cgpa": previous_cgpa,
        "attendance_percentage": attendance_percentage,
        "predicted_score": predicted_score,
        "risk_level": risk_level
    })
    
    return df

def train_and_save_model(real_data: list = None):
    """
    Trains GradientBoostingRegressor and GradientBoostingClassifier,
    saving them as a packaged dictionary in model.pkl.
    """
    print("Training models...")
    df_synthetic = generate_synthetic_data()
    
    if real_data and len(real_data) >= 5:
        print(f"Incorporating {len(real_data)} real student data records for retraining...")
        df_real = pd.DataFrame(real_data)
        
        for col in FEATURES:
            df_real[col] = df_real[col].astype(float)
        df_real["predicted_score"] = df_real["predicted_score"].astype(float)
        df_real["risk_level"] = df_real["risk_level"].astype(str)
        
        df = pd.concat([df_synthetic, df_real], ignore_index=True)
    else:
        df = df_synthetic
        
    X = df[FEATURES]
    y_score = df["predicted_score"]
    y_risk = df["risk_level"]
    
    # Train validation split (synthetic portion)
    X_train, X_test, y_score_train, y_score_test = train_test_split(X, y_score, test_size=0.15, random_state=42)
    _, _, y_risk_train, y_risk_test = train_test_split(X, y_risk, test_size=0.15, random_state=42)
    
    # 1. Regressor (GradientBoostingRegressor)
    regressor = GradientBoostingRegressor(n_estimators=100, random_state=42)
    regressor.fit(X_train, y_score_train)
    r2_score = regressor.score(X_test, y_score_test)
    print(f"GradientBoostingRegressor Exam Score model R^2: {r2_score:.4f}")
    
    # 2. Classifier (GradientBoostingClassifier)
    classifier = GradientBoostingClassifier(n_estimators=100, random_state=42)
    classifier.fit(X_train, y_risk_train)
    acc_score = classifier.score(X_test, y_risk_test)
    print(f"GradientBoostingClassifier Risk Level model Accuracy: {acc_score:.4f}")
    
    # Train final models on entire dataset
    final_regressor = GradientBoostingRegressor(n_estimators=100, random_state=42)
    final_regressor.fit(X, y_score)
    
    final_classifier = GradientBoostingClassifier(n_estimators=100, random_state=42)
    final_classifier.fit(X, y_risk)
    
    # Package and save
    models_dict = {
        "regressor": final_regressor,
        "classifier": final_classifier,
        "features": list(X.columns)
    }
    
    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    joblib.dump(models_dict, MODEL_PATH)
    print(f"Models successfully saved to {MODEL_PATH}")

if __name__ == "__main__":
    train_and_save_model()
