#!/usr/bin/env python
# PRIME_Analysis_Generator.py - Ultimate analysis generator
# Created: October 2023
# Updated: 04/08/25 - Aligned with utils.py and calculations.py

import sqlite3
import datetime
import numpy as np
import math
import os
import json
import requests
from collections import defaultdict

MIN_DATA_POINTS = 4
PLATEAU_THRESHOLD = 0.5
PLATEAU_DURATION_WEEKS = 3
HEALTHY_WEIGHT_LOSS_RATE = 1.0  # Default, adjusted in bodybuilding mode
HEALTHY_BF_LOSS_RATE = 0.5

GEMINI_PRO_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent"

class PRIMEAnalysisGenerator:
    def __init__(self, db_file='history.db', api_key=None):
        self.db_file = db_file
        self.api_key = api_key or os.environ.get("GEMINI_API_KEY")
        self.api_working = self.test_api_connection()

    def test_api_connection(self):
        if not self.api_key:
            return False
        try:
            response = requests.post(
                f"{GEMINI_PRO_API_URL}?key={self.api_key}",
                json={"contents": [{"parts": [{"text": "Test"}]}]},
                headers={"Content-Type": "application/json"}
            )
            return response.status_code == 200
        except Exception:
            return False

    def get_user_data(self, user_id):
        """Retrieve user profile and progress with new fields."""
        conn = sqlite3.connect(self.db_file)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("SELECT *, diet_type, ped_use, exercise_type, is_bodybuilder FROM user_profiles WHERE user_id = ?", (user_id,))
        profile = cursor.fetchone()
        
        cursor.execute("SELECT date, weight, body_fat_percentage FROM weekly_progress WHERE user_id = ? ORDER BY date ASC", (user_id,))
        progress = [dict(row) for row in cursor.fetchall()]
        
        conn.close()
        return dict(profile) if profile else None, progress

    def analyze_weight_trend(self, progress_data, user_data):
        weights = [entry["weight"] for entry in progress_data]
        dates = [datetime.datetime.strptime(entry["date"], "%Y-%m-%d").date() for entry in progress_data]
        
        if len(weights) < MIN_DATA_POINTS:
            return None
        
        total_change = weights[-1] - weights[0]
        weeks_diff = max(1, (dates[-1] - dates[0]).days / 7)
        avg_weekly_change = total_change / weeks_diff
        
        weekly_changes = [(weights[i] - weights[i-1]) / max(0.1, (dates[i] - dates[i-1]).days / 7) for i in range(1, len(weights))]
        consistency = np.std(weekly_changes) if weekly_changes else 0
        
        goal_alignment = None
        if user_data.get("goal_weight"):
            goal_weight = user_data["goal_weight"]
            if (weights[0] > goal_weight and avg_weekly_change < 0) or (weights[0] < goal_weight and avg_weekly_change > 0):
                goal_alignment = "aligned"
            elif (weights[0] > goal_weight and avg_weekly_change > 0) or (weights[0] < goal_weight and avg_weekly_change < 0):
                goal_alignment = "opposite"
        
        weeks_to_goal = None
        if goal_alignment == "aligned" and abs(avg_weekly_change) > 0.1:
            remaining_change = user_data["goal_weight"] - weights[-1]
            weeks_to_goal = abs(remaining_change / avg_weekly_change)
        
        healthy_rate = 2.5 if user_data.get("is_bodybuilder", False) else HEALTHY_WEIGHT_LOSS_RATE
        is_healthy = abs(avg_weekly_change) <= healthy_rate if avg_weekly_change < 0 else True
        
        return {
            "total_change": total_change,
            "avg_weekly_change": avg_weekly_change,
            "consistency": consistency,
            "goal_alignment": goal_alignment,
            "weeks_to_goal": weeks_to_goal,
            "is_healthy": is_healthy
        }

    def analyze_body_fat_trend(self, progress_data, user_data):
        body_fats = [entry["body_fat_percentage"] for entry in progress_data if entry.get("body_fat_percentage") is not None]
        dates = [datetime.datetime.strptime(entry["date"], "%Y-%m-%d").date() for entry in progress_data if entry.get("body_fat_percentage") is not None]
        
        if len(body_fats) < MIN_DATA_POINTS:
            return None
        
        total_change = body_fats[-1] - body_fats[0]
        weeks_diff = max(1, (dates[-1] - dates[0]).days / 7)
        avg_weekly_change = total_change / weeks_diff
        
        weekly_changes = [(body_fats[i] - body_fats[i-1]) / max(0.1, (dates[i] - dates[i-1]).days / 7) for i in range(1, len(body_fats))]
        consistency = np.std(weekly_changes) if weekly_changes else 0
        
        goal_alignment = None
        if user_data.get("goal_bf"):
            goal_bf = user_data["goal_bf"]
            if (body_fats[0] > goal_bf and avg_weekly_change < 0) or (body_fats[0] < goal_bf and avg_weekly_change > 0):
                goal_alignment = "aligned"
            elif (body_fats[0] > goal_bf and avg_weekly_change > 0) or (body_fats[0] < goal_bf and avg_weekly_change < 0):
                goal_alignment = "opposite"
        
        weeks_to_goal = None
        if goal_alignment == "aligned" and abs(avg_weekly_change) > 0.05:
            remaining_change = user_data["goal_bf"] - body_fats[-1]
            weeks_to_goal = abs(remaining_change / avg_weekly_change)
        
        return {
            "total_change": total_change,
            "avg_weekly_change": avg_weekly_change,
            "consistency": consistency,
            "goal_alignment": goal_alignment,
            "weeks_to_goal": weeks_to_goal
        }

    def detect_plateaus(self, progress_data):
        weights = [(datetime.datetime.strptime(entry["date"], "%Y-%m-%d").date(), entry["weight"]) for entry in progress_data]
        body_fats = [(datetime.datetime.strptime(entry["date"], "%Y-%m-%d").date(), entry["body_fat_percentage"]) for entry in progress_data if entry.get("body_fat_percentage") is not None]
        
        plateaus = {}
        if len(weights) >= PLATEAU_DURATION_WEEKS + 1:
            weight_plateau = self._check_plateau_sequence(weights)
            if weight_plateau:
                plateaus["weight"] = weight_plateau
        if len(body_fats) >= PLATEAU_DURATION_WEEKS + 1:
            bf_plateau = self._check_plateau_sequence(body_fats)
            if bf_plateau:
                plateaus["body_fat"] = bf_plateau
        return plateaus if plateaus else None

    def _check_plateau_sequence(self, data_points):
        recent_points = data_points[-PLATEAU_DURATION_WEEKS-1:]
        changes = []
        for i in range(1, len(recent_points)):
            prev_date, prev_value = recent_points[i-1]
            curr_date, curr_value = recent_points[i]
            weeks_between = max(0.1, (curr_date - prev_date).days / 7)
            pct_change = abs((curr_value - prev_value) * 100 / (prev_value * weeks_between))
            changes.append(pct_change)
        if all(change < PLATEAU_THRESHOLD for change in changes):
            start_date = recent_points[0][0]
            end_date = recent_points[-1][0]
            duration_days = (end_date - start_date).days
            return {
                "start_date": start_date,
                "end_date": end_date,
                "duration_days": duration_days,
                "avg_value": sum(point[1] for point in recent_points) / len(recent_points)
            }
        return None

    def analyze_body_composition(self, progress_data):
        if len(progress_data) < 2:
            return None
        
        first_entry = progress_data[0]
        last_entry = progress_data[-1]
        
        initial_weight = first_entry["weight"]
        initial_bf = first_entry.get("body_fat_percentage", 0) / 100
        current_weight = last_entry["weight"]
        current_bf = last_entry.get("body_fat_percentage", 0) / 100
        
        initial_fat_mass = initial_weight * initial_bf
        initial_lean_mass = initial_weight * (1 - initial_bf)
        current_fat_mass = current_weight * current_bf
        current_lean_mass = current_weight * (1 - current_bf)
        
        fat_mass_change = current_fat_mass - initial_fat_mass
        lean_mass_change = current_lean_mass - initial_lean_mass
        
        if fat_mass_change < 0 and lean_mass_change >= 0:
            rating = "Excellent"
        elif fat_mass_change < 0 and lean_mass_change < 0 and abs(fat_mass_change) > abs(lean_mass_change):
            rating = "Good"
        else:
            rating = "Mixed"
        
        return {
            "fat_mass_change": fat_mass_change,
            "lean_mass_change": lean_mass_change,
            "rating": rating
        }

    def generate_ai_insights(self, algorithmic_analysis, user_data, progress_data):
        if not self.api_working:
            return "AI analysis unavailable."
        
        algo_summary = json.dumps(algorithmic_analysis, indent=2)
        progress_summary = "\n".join([f"Date: {entry['date']}, Weight: {entry['weight']}, BF: {entry.get('body_fat_percentage', 'N/A')}%" for entry in progress_data])
        
        prompt = f"""
        Review the algorithmic analysis and progress data:
        ALGORITHMIC ANALYSIS: {algo_summary}
        PROGRESS DATA: {progress_summary}
        USER INFO: Diet: {user_data.get('diet_type', 'N/A')}, PEDs: {user_data.get('ped_use', False)}, Exercise: {user_data.get('exercise_type', 'N/A')}, Bodybuilder: {user_data.get('is_bodybuilder', False)}
        GOALS: Weight: {user_data.get('goal_weight', 'N/A')} lbs, BF: {user_data.get('goal_bf', 'N/A')}%
        Provide:
        1. Confirmation/correction of findings
        2. Additional insights
        3. Actionable recommendations
        """
        
        try:
            response = requests.post(
                f"{GEMINI_PRO_API_URL}?key={self.api_key}",
                json={"contents": [{"parts": [{"text": prompt}]}]},
                headers={"Content-Type": "application/json"}
            )
            if response.status_code == 200:
                return response.json()["candidates"][0]["content"]["parts"][0]["text"]
            return f"AI failed: {response.status_code}"
        except Exception as e:
            return f"AI error: {str(e)}"

    def generate_prime_analysis(self, user_id=1):
        user_data, progress_data = self.get_user_data(user_id)
        if not user_data or len(progress_data) < MIN_DATA_POINTS:
            return "Insufficient data."
        
        weight_analysis = self.analyze_weight_trend(progress_data, user_data)
        bf_analysis = self.analyze_body_fat_trend(progress_data, user_data)
        plateaus = self.detect_plateaus(progress_data)
        body_comp = self.analyze_body_composition(progress_data)
        
        algorithmic_analysis = {"weight": weight_analysis, "body_fat": bf_analysis, "plateaus": plateaus, "body_composition": body_comp}
        ai_insights = self.generate_ai_insights(algorithmic_analysis, user_data, progress_data)
        
        report = f"PRIME Analysis Report for {user_data['name']}\n\n"
        report += "Algorithmic Analysis:\n" + json.dumps(algorithmic_analysis, indent=2) + "\n\n"
        report += "AI-Enhanced Insights:\n" + ai_insights + "\n"
        return report

if __name__ == "__main__":
    analyzer = PRIMEAnalysisGenerator()
    print(analyzer.generate_prime_analysis())