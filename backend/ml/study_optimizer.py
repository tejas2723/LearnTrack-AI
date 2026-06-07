import pandas as pd
from datetime import datetime

def map_hour_to_slot(hour: int) -> str:
    """
    Maps a 24-hour hour integer to a student-friendly 2-hour block.
    """
    if 6 <= hour < 10:
        return "8AM – 10AM"
    elif 10 <= hour < 13:
        return "10AM – 12PM"
    elif 13 <= hour < 15:
        return "12PM – 2PM"
    elif 15 <= hour < 17:
        return "2PM – 4PM"
    elif 17 <= hour < 19:
        return "4PM – 6PM"
    elif 19 <= hour < 21:
        return "7PM – 9PM"
    elif 21 <= hour < 23:
        return "9PM – 11PM"
    else:
        return "11PM – 1AM"

def optimize_study_time_ml(score_time_pairs: list) -> dict:
    """
    Groups the student's study or quiz results by hour of day and returns
    the time block (best_time) that has the highest average performance score.
    
    Inputs:
      - score_time_pairs: list of tuples (timestamp, score)
        where timestamp can be datetime or string, and score is float (0-100).
    """
    if not score_time_pairs or len(score_time_pairs) < 3:
        return {
            "best_time": "7PM – 9PM",
            "confidence": "low"
        }
        
    data = []
    for ts, score in score_time_pairs:
        try:
            if isinstance(ts, str):
                dt = pd.to_datetime(ts)
            elif isinstance(ts, datetime):
                dt = ts
            else:
                dt = pd.to_datetime(ts)
            
            # Localize or drop timezone to avoid comparisons issues
            if hasattr(dt, "tz_localize") and dt.tzinfo is not None:
                dt = dt.tz_localize(None)
                
            data.append({
                "slot": map_hour_to_slot(dt.hour),
                "score": float(score)
            })
        except Exception:
            continue
            
    if not data:
        return {
            "best_time": "7PM – 9PM",
            "confidence": "low"
        }
        
    df = pd.DataFrame(data)
    grouped = df.groupby("slot")["score"].mean()
    
    best_time = grouped.idxmax()
    
    # Calculate confidence based on data quantity
    n_samples = len(data)
    if n_samples >= 10:
        confidence = "high"
    elif n_samples >= 5:
        confidence = "medium"
    else:
        confidence = "low"
        
    return {
        "best_time": best_time,
        "confidence": confidence
    }
