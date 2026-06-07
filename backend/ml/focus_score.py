def calculate_focus_score(data: dict) -> int:
    """
    Calculates a student's focus score (0-100) using a weighted formula.
    
    Expected keys in data:
      - avg_time_per_question (float): average seconds spent per question.
      - idle_ratio (float): ratio of idle time to total study time (0.0 to 1.0).
      - completion_rate (float): ratio of completed tasks/questions to total (0.0 to 1.0).
      - study_streak_days (int): consecutive days of study sessions.
    """
    avg_time = float(data.get("avg_time_per_question", 60.0))
    idle_ratio = float(data.get("idle_ratio", 0.0))
    completion_rate = float(data.get("completion_rate", 1.0))
    streak_days = int(data.get("study_streak_days", 0))
    
    # 1. Time Score: penalize deviations from an ideal 60 seconds per question
    time_diff = abs(avg_time - 60.0)
    time_score = max(0.0, 100.0 - time_diff * 1.5)
    
    # 2. Idle Score: penalize higher idle ratios
    idle_score = max(0.0, (1.0 - idle_ratio) * 100.0)
    
    # 3. Completion Score: directly proportional to completion rate
    completion_score = max(0.0, min(100.0, completion_rate * 100.0))
    
    # 4. Streak Score: reward continuous daily study
    streak_score = min(100.0, streak_days * 20.0)
    
    # Weighted average:
    # 20% Time Score, 40% Idle Score, 25% Completion Score, 15% Streak Score
    raw_focus = (time_score * 0.20) + (idle_score * 0.40) + (completion_score * 0.25) + (streak_score * 0.15)
    
    return int(max(0, min(100, round(raw_focus))))
