"""
DEPRECATED: This file violates Constitution Article I - Python Module Integrity
DO NOT USE: This file uses custom calculation implementations instead of PRIME modules
USE INSTEAD: python-api/main.py with PRIME_Report_Generator_v3_Fast from new_prime_python_code/
CONSTITUTIONAL REQUIREMENT: All body fat calculations MUST use new_prime_python_code/ modules
Last maintained: 2025-07-21 (v1.3.0)
Scheduled for removal: v2.0.0
"""

import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend
import matplotlib.pyplot as plt
import seaborn as sns
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import base64
from io import BytesIO
from typing import Dict, List, Any, Optional
import json

class ReportGenerator:
    def __init__(self):
        # Set up default style
        plt.style.use('seaborn-v0_8-darkgrid')
        sns.set_palette("husl")
        
    def generate_comprehensive_report(self, user_data: Dict[str, Any], 
                                    progression_data: List[Dict[str, Any]],
                                    entries: List[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Generate a comprehensive HTML report with all charts and analytics"""
        
        # Generate all charts
        charts = {
            'weight_progress': self._create_weight_progress_chart(progression_data, entries),
            'body_composition': self._create_body_composition_chart(progression_data, entries),
            'calorie_tracking': self._create_calorie_tracking_chart(progression_data),
            'muscle_vs_fat': self._create_muscle_vs_fat_chart(progression_data),
            'progress_summary': self._create_progress_summary_chart(user_data, progression_data),
            'weekly_changes': self._create_weekly_changes_chart(progression_data),
            'goal_projection': self._create_goal_projection_chart(user_data, progression_data, entries),
            'body_measurements': self._create_body_measurements_chart(user_data, progression_data)
        }
        
        # Calculate analytics
        analytics = self._calculate_analytics(user_data, progression_data, entries)
        
        # Generate HTML report
        html_content = self._generate_html_report(user_data, progression_data, charts, analytics, entries)
        
        return {
            'html_content': html_content,
            'analytics': analytics,
            'charts': charts,
            'markdown_path': '',
            'pdf_path': ''
        }
    
    def _create_weight_progress_chart(self, progression: List[Dict], entries: List[Dict] = None) -> str:
        """Create weight progress chart with actual vs predicted"""
        fig, ax = plt.subplots(figsize=(12, 6))
        
        # Predicted progression
        dates = [datetime.fromisoformat(p['date'].replace('Z', '+00:00')) if 'T' in p['date'] else datetime.strptime(p['date'], '%Y-%m-%d') for p in progression]
        weights = [p['weight'] for p in progression]
        
        ax.plot(dates, weights, 'b-', linewidth=2, label='Predicted', alpha=0.7)
        
        # Actual entries
        if entries:
            actual_dates = []
            actual_weights = []
            for entry in entries:
                try:
                    if 'T' in entry['date']:
                        date = datetime.fromisoformat(entry['date'].replace('Z', '+00:00'))
                    else:
                        date = datetime.strptime(entry['date'], '%Y-%m-%d')
                    actual_dates.append(date)
                    actual_weights.append(entry['weight'])
                except:
                    continue
            
            if actual_dates:
                ax.scatter(actual_dates, actual_weights, color='red', s=100, label='Actual', zorder=5)
        
        # Goal weight line
        if progression:
            goal_weight = progression[0].get('goal_weight', 0)
            if goal_weight:
                ax.axhline(y=goal_weight, color='green', linestyle='--', label=f'Goal: {goal_weight} lbs')
        
        ax.set_xlabel('Date', fontsize=12)
        ax.set_ylabel('Weight (lbs)', fontsize=12)
        ax.set_title('Weight Progress: Predicted vs Actual', fontsize=14, fontweight='bold')
        ax.legend()
        ax.grid(True, alpha=0.3)
        
        # Format x-axis
        plt.xticks(rotation=45)
        plt.tight_layout()
        
        return self._fig_to_base64(fig)
    
    def _create_body_composition_chart(self, progression: List[Dict], entries: List[Dict] = None) -> str:
        """Create body composition chart showing fat mass vs lean mass"""
        fig, ax = plt.subplots(figsize=(12, 6))
        
        dates = [datetime.fromisoformat(p['date'].replace('Z', '+00:00')) if 'T' in p['date'] else datetime.strptime(p['date'], '%Y-%m-%d') for p in progression]
        lean_mass = [p.get('lean_mass', p['weight'] * (1 - p['body_fat_percentage']/100)) for p in progression]
        fat_mass = [p.get('fat_mass', p['weight'] * p['body_fat_percentage']/100) for p in progression]
        
        ax.fill_between(dates, 0, lean_mass, alpha=0.7, color='blue', label='Lean Mass')
        ax.fill_between(dates, lean_mass, [l+f for l,f in zip(lean_mass, fat_mass)], 
                       alpha=0.7, color='red', label='Fat Mass')
        
        # Add actual data points if available
        if entries:
            actual_dates = []
            actual_lean = []
            actual_fat = []
            for entry in entries:
                try:
                    if 'T' in entry['date']:
                        date = datetime.fromisoformat(entry['date'].replace('Z', '+00:00'))
                    else:
                        date = datetime.strptime(entry['date'], '%Y-%m-%d')
                    weight = entry['weight']
                    bf_pct = entry['body_fat_percentage']
                    actual_dates.append(date)
                    actual_lean.append(weight * (1 - bf_pct/100))
                    actual_fat.append(weight * bf_pct/100)
                except:
                    continue
            
            if actual_dates:
                # Plot actual total weight as dots
                actual_total = [l+f for l,f in zip(actual_lean, actual_fat)]
                ax.scatter(actual_dates, actual_total, color='black', s=50, label='Actual Measurements', zorder=5)
        
        ax.set_xlabel('Date', fontsize=12)
        ax.set_ylabel('Weight (lbs)', fontsize=12)
        ax.set_title('Body Composition Over Time', fontsize=14, fontweight='bold')
        ax.legend()
        ax.grid(True, alpha=0.3)
        
        plt.xticks(rotation=45)
        plt.tight_layout()
        
        return self._fig_to_base64(fig)
    
    def _create_calorie_tracking_chart(self, progression: List[Dict]) -> str:
        """Create calorie intake and TDEE chart"""
        fig, ax = plt.subplots(figsize=(12, 6))
        
        dates = [datetime.fromisoformat(p['date'].replace('Z', '+00:00')) if 'T' in p['date'] else datetime.strptime(p['date'], '%Y-%m-%d') for p in progression]
        calories = [p.get('daily_calorie_intake', 2000) for p in progression]
        tdee = [p.get('tdee', 2500) for p in progression]
        
        ax.plot(dates, tdee, 'r-', linewidth=2, label='TDEE (Maintenance)')
        ax.plot(dates, calories, 'b-', linewidth=2, label='Daily Intake')
        ax.fill_between(dates, calories, tdee, alpha=0.3, color='green', label='Deficit')
        
        ax.set_xlabel('Date', fontsize=12)
        ax.set_ylabel('Calories', fontsize=12)
        ax.set_title('Calorie Tracking: Intake vs TDEE', fontsize=14, fontweight='bold')
        ax.legend()
        ax.grid(True, alpha=0.3)
        
        plt.xticks(rotation=45)
        plt.tight_layout()
        
        return self._fig_to_base64(fig)
    
    def _create_muscle_vs_fat_chart(self, progression: List[Dict]) -> str:
        """Create muscle gain vs fat loss chart"""
        fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(12, 8), sharex=True)
        
        dates = [datetime.fromisoformat(p['date'].replace('Z', '+00:00')) if 'T' in p['date'] else datetime.strptime(p['date'], '%Y-%m-%d') for p in progression]
        
        # Calculate changes from baseline
        baseline_lean = progression[0]['weight'] * (1 - progression[0]['body_fat_percentage']/100)
        baseline_fat = progression[0]['weight'] * progression[0]['body_fat_percentage']/100
        
        lean_changes = [(p['weight'] * (1 - p['body_fat_percentage']/100)) - baseline_lean for p in progression]
        fat_changes = [(p['weight'] * p['body_fat_percentage']/100) - baseline_fat for p in progression]
        
        # Muscle changes
        ax1.plot(dates, lean_changes, 'b-', linewidth=2)
        ax1.fill_between(dates, 0, lean_changes, alpha=0.3, color='blue')
        ax1.set_ylabel('Lean Mass Change (lbs)', fontsize=12)
        ax1.set_title('Muscle Gain Progress', fontsize=12)
        ax1.grid(True, alpha=0.3)
        ax1.axhline(y=0, color='black', linestyle='-', alpha=0.3)
        
        # Fat changes
        ax2.plot(dates, fat_changes, 'r-', linewidth=2)
        ax2.fill_between(dates, 0, fat_changes, alpha=0.3, color='red')
        ax2.set_xlabel('Date', fontsize=12)
        ax2.set_ylabel('Fat Mass Change (lbs)', fontsize=12)
        ax2.set_title('Fat Loss Progress', fontsize=12)
        ax2.grid(True, alpha=0.3)
        ax2.axhline(y=0, color='black', linestyle='-', alpha=0.3)
        
        plt.xticks(rotation=45)
        plt.tight_layout()
        
        return self._fig_to_base64(fig)
    
    def _create_progress_summary_chart(self, user_data: Dict, progression: List[Dict]) -> str:
        """Create progress summary dashboard"""
        fig = plt.figure(figsize=(12, 8))
        
        # Calculate key metrics
        start_weight = progression[0]['weight']
        current_weight = progression[-1]['weight']
        start_bf = progression[0]['body_fat_percentage']
        current_bf = progression[-1]['body_fat_percentage']
        
        weight_loss = start_weight - current_weight
        bf_reduction = start_bf - current_bf
        
        start_lean = start_weight * (1 - start_bf/100)
        current_lean = current_weight * (1 - current_bf/100)
        muscle_change = current_lean - start_lean
        
        # Create grid
        gs = fig.add_gridspec(2, 3, hspace=0.3, wspace=0.3)
        
        # Weight Loss
        ax1 = fig.add_subplot(gs[0, 0])
        ax1.text(0.5, 0.7, f'{weight_loss:.1f} lbs', fontsize=36, ha='center', va='center', fontweight='bold')
        ax1.text(0.5, 0.3, 'Total Weight Loss', fontsize=14, ha='center', va='center')
        ax1.set_xlim(0, 1)
        ax1.set_ylim(0, 1)
        ax1.axis('off')
        
        # Body Fat Reduction
        ax2 = fig.add_subplot(gs[0, 1])
        ax2.text(0.5, 0.7, f'{bf_reduction:.1f}%', fontsize=36, ha='center', va='center', fontweight='bold')
        ax2.text(0.5, 0.3, 'Body Fat Reduction', fontsize=14, ha='center', va='center')
        ax2.set_xlim(0, 1)
        ax2.set_ylim(0, 1)
        ax2.axis('off')
        
        # Muscle Change
        ax3 = fig.add_subplot(gs[0, 2])
        color = 'green' if muscle_change >= 0 else 'red'
        sign = '+' if muscle_change >= 0 else ''
        ax3.text(0.5, 0.7, f'{sign}{muscle_change:.1f} lbs', fontsize=36, ha='center', va='center', fontweight='bold', color=color)
        ax3.text(0.5, 0.3, 'Muscle Change', fontsize=14, ha='center', va='center')
        ax3.set_xlim(0, 1)
        ax3.set_ylim(0, 1)
        ax3.axis('off')
        
        # Progress to Goal
        ax4 = fig.add_subplot(gs[1, :])
        goal_weight = user_data.get('goal_weight', current_weight)
        progress_pct = (start_weight - current_weight) / (start_weight - goal_weight) * 100 if start_weight != goal_weight else 100
        progress_pct = max(0, min(100, progress_pct))
        
        ax4.barh([0], [progress_pct], height=0.5, color='green', alpha=0.7)
        ax4.barh([0], [100-progress_pct], height=0.5, left=[progress_pct], color='lightgray', alpha=0.3)
        ax4.text(50, 0, f'{progress_pct:.1f}% to Goal', fontsize=16, ha='center', va='center', fontweight='bold')
        ax4.set_xlim(0, 100)
        ax4.set_ylim(-0.5, 0.5)
        ax4.axis('off')
        
        plt.suptitle('Progress Summary Dashboard', fontsize=16, fontweight='bold')
        plt.tight_layout()
        
        return self._fig_to_base64(fig)
    
    def _create_weekly_changes_chart(self, progression: List[Dict]) -> str:
        """Create weekly changes bar chart"""
        fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(12, 8), sharex=True)
        
        # Calculate weekly changes
        weeks = []
        weight_changes = []
        bf_changes = []
        
        for i in range(1, len(progression)):
            if i % 7 == 0:  # Weekly data
                week_num = i // 7
                weeks.append(f'Week {week_num}')
                weight_changes.append(progression[i-7]['weight'] - progression[i]['weight'])
                bf_changes.append(progression[i-7]['body_fat_percentage'] - progression[i]['body_fat_percentage'])
        
        x = np.arange(len(weeks))
        
        # Weight changes
        colors1 = ['green' if w > 0 else 'red' for w in weight_changes]
        ax1.bar(x, weight_changes, color=colors1, alpha=0.7)
        ax1.set_ylabel('Weight Change (lbs)', fontsize=12)
        ax1.set_title('Weekly Weight Changes', fontsize=12)
        ax1.grid(True, alpha=0.3, axis='y')
        ax1.axhline(y=0, color='black', linestyle='-', alpha=0.3)
        
        # Body fat changes
        colors2 = ['green' if b > 0 else 'red' for b in bf_changes]
        ax2.bar(x, bf_changes, color=colors2, alpha=0.7)
        ax2.set_xlabel('Week', fontsize=12)
        ax2.set_ylabel('Body Fat Change (%)', fontsize=12)
        ax2.set_title('Weekly Body Fat Changes', fontsize=12)
        ax2.set_xticks(x)
        ax2.set_xticklabels(weeks, rotation=45)
        ax2.grid(True, alpha=0.3, axis='y')
        ax2.axhline(y=0, color='black', linestyle='-', alpha=0.3)
        
        plt.tight_layout()
        
        return self._fig_to_base64(fig)
    
    def _create_goal_projection_chart(self, user_data: Dict, progression: List[Dict], entries: List[Dict] = None) -> str:
        """Create goal projection with confidence intervals"""
        fig, ax = plt.subplots(figsize=(12, 6))
        
        # Current progression
        dates = [datetime.fromisoformat(p['date'].replace('Z', '+00:00')) if 'T' in p['date'] else datetime.strptime(p['date'], '%Y-%m-%d') for p in progression]
        weights = [p['weight'] for p in progression]
        
        # Plot main projection
        ax.plot(dates, weights, 'b-', linewidth=2, label='Projected Path')
        
        # Add confidence interval (simplified - just ±5% variance)
        upper_bound = [w * 1.05 for w in weights]
        lower_bound = [w * 0.95 for w in weights]
        ax.fill_between(dates, lower_bound, upper_bound, alpha=0.2, color='blue', label='Confidence Interval')
        
        # Add actual data
        if entries:
            actual_dates = []
            actual_weights = []
            for entry in entries:
                try:
                    if 'T' in entry['date']:
                        date = datetime.fromisoformat(entry['date'].replace('Z', '+00:00'))
                    else:
                        date = datetime.strptime(entry['date'], '%Y-%m-%d')
                    actual_dates.append(date)
                    actual_weights.append(entry['weight'])
                except:
                    continue
            
            if actual_dates:
                ax.scatter(actual_dates, actual_weights, color='red', s=100, label='Actual', zorder=5)
        
        # Goal markers
        goal_weight = user_data.get('goal_weight', weights[-1])
        ax.axhline(y=goal_weight, color='green', linestyle='--', label=f'Goal: {goal_weight} lbs')
        
        # Add goal date marker
        if dates:
            ax.axvline(x=dates[-1], color='orange', linestyle='--', alpha=0.5, label='Target Date')
        
        ax.set_xlabel('Date', fontsize=12)
        ax.set_ylabel('Weight (lbs)', fontsize=12)
        ax.set_title('Goal Projection with Confidence Intervals', fontsize=14, fontweight='bold')
        ax.legend()
        ax.grid(True, alpha=0.3)
        
        plt.xticks(rotation=45)
        plt.tight_layout()
        
        return self._fig_to_base64(fig)
    
    def _create_body_measurements_chart(self, user_data: Dict, progression: List[Dict]) -> str:
        """Create body measurements radar chart"""
        fig, ax = plt.subplots(figsize=(10, 10), subplot_kw=dict(projection='polar'))
        
        # Measurements
        categories = ['Waist', 'Hip', 'Neck', 'Body Fat %', 'Muscle Mass']
        
        # Starting values (normalized to 0-100 scale)
        start_values = [
            user_data.get('waist', 40),
            user_data.get('hip', 44),
            user_data.get('neck', 17),
            progression[0]['body_fat_percentage'],
            50  # Placeholder for muscle mass percentage
        ]
        
        # Current/projected values
        current_values = [
            user_data.get('waist', 40) * 0.9,  # Assuming 10% reduction
            user_data.get('hip', 44) * 0.95,   # Assuming 5% reduction
            user_data.get('neck', 17) * 0.95,  # Assuming 5% reduction
            progression[-1]['body_fat_percentage'],
            55  # Placeholder for increased muscle mass percentage
        ]
        
        # Normalize values to 0-100 scale for better visualization
        max_vals = [50, 50, 20, 40, 70]  # Max expected values for each measurement
        start_normalized = [(v/m)*100 for v, m in zip(start_values, max_vals)]
        current_normalized = [(v/m)*100 for v, m in zip(current_values, max_vals)]
        
        # Number of variables
        N = len(categories)
        angles = [n / float(N) * 2 * np.pi for n in range(N)]
        angles += angles[:1]
        
        start_normalized += start_normalized[:1]
        current_normalized += current_normalized[:1]
        
        # Plot
        ax.plot(angles, start_normalized, 'o-', linewidth=2, label='Starting', color='red')
        ax.fill(angles, start_normalized, alpha=0.25, color='red')
        ax.plot(angles, current_normalized, 'o-', linewidth=2, label='Current/Goal', color='green')
        ax.fill(angles, current_normalized, alpha=0.25, color='green')
        
        ax.set_xticks(angles[:-1])
        ax.set_xticklabels(categories)
        ax.set_ylim(0, 100)
        ax.set_title('Body Measurements Comparison', fontsize=14, fontweight='bold', pad=20)
        ax.legend(loc='upper right', bbox_to_anchor=(1.1, 1.1))
        ax.grid(True)
        
        plt.tight_layout()
        
        return self._fig_to_base64(fig)
    
    def _calculate_analytics(self, user_data: Dict, progression: List[Dict], entries: List[Dict] = None) -> Dict[str, Any]:
        """Calculate comprehensive analytics"""
        start = progression[0]
        current = progression[-1]
        
        # Basic metrics
        total_weight_loss = start['weight'] - current['weight']
        bf_reduction = start['body_fat_percentage'] - current['body_fat_percentage']
        
        # Body composition
        start_lean = start['weight'] * (1 - start['body_fat_percentage']/100)
        current_lean = current['weight'] * (1 - current['body_fat_percentage']/100)
        muscle_change = current_lean - start_lean
        
        start_fat = start['weight'] * start['body_fat_percentage']/100
        current_fat = current['weight'] * current['body_fat_percentage']/100
        fat_loss = start_fat - current_fat
        
        # Rate calculations
        weeks = len(progression) / 7
        weekly_weight_loss = total_weight_loss / weeks if weeks > 0 else 0
        weekly_bf_reduction = bf_reduction / weeks if weeks > 0 else 0
        
        # Goal progress
        goal_weight = user_data.get('goal_weight', current['weight'])
        goal_bf = user_data.get('goal_bf', current['body_fat_percentage'])
        
        weight_progress = (start['weight'] - current['weight']) / (start['weight'] - goal_weight) * 100 if start['weight'] != goal_weight else 100
        bf_progress = (start['body_fat_percentage'] - current['body_fat_percentage']) / (start['body_fat_percentage'] - goal_bf) * 100 if start['body_fat_percentage'] != goal_bf else 100
        
        # Adherence tracking (if we have actual entries)
        adherence_rate = 100.0
        if entries and len(entries) > 1:
            expected_entries = weeks * 2  # Assuming 2 entries per week
            adherence_rate = (len(entries) / expected_entries * 100) if expected_entries > 0 else 100
        
        return {
            'total_weight_loss': round(total_weight_loss, 1),
            'bf_reduction': round(bf_reduction, 1),
            'muscle_change': round(muscle_change, 1),
            'fat_loss': round(fat_loss, 1),
            'weekly_weight_loss': round(weekly_weight_loss, 2),
            'weekly_bf_reduction': round(weekly_bf_reduction, 2),
            'weight_progress_pct': round(weight_progress, 1),
            'bf_progress_pct': round(bf_progress, 1),
            'adherence_rate': round(adherence_rate, 1),
            'weeks_completed': round(weeks, 1),
            'current_weight': round(current['weight'], 1),
            'current_bf': round(current['body_fat_percentage'], 1),
            'current_lean_mass': round(current_lean, 1),
            'current_fat_mass': round(current_fat, 1),
            'goal_weight': goal_weight,
            'goal_bf': goal_bf
        }
    
    def _fig_to_base64(self, fig) -> str:
        """Convert matplotlib figure to base64 string"""
        buffer = BytesIO()
        fig.savefig(buffer, format='png', bbox_inches='tight', dpi=100)
        buffer.seek(0)
        image_png = buffer.getvalue()
        buffer.close()
        plt.close(fig)
        
        return base64.b64encode(image_png).decode()
    
    def _generate_html_report(self, user_data: Dict, progression: List[Dict], 
                             charts: Dict[str, str], analytics: Dict[str, Any],
                             entries: List[Dict] = None) -> str:
        """Generate comprehensive HTML report"""
        
        # Format current date
        now = datetime.now()
        report_date = now.strftime("%B %d, %Y at %I:%M %p")
        
        # Build entries table if available
        entries_html = ""
        if entries:
            entries_rows = ""
            for entry in sorted(entries, key=lambda x: x['date'], reverse=True)[:10]:  # Last 10 entries
                try:
                    if 'T' in entry['date']:
                        date = datetime.fromisoformat(entry['date'].replace('Z', '+00:00'))
                    else:
                        date = datetime.strptime(entry['date'], '%Y-%m-%d')
                    date_str = date.strftime("%Y-%m-%d")
                except:
                    date_str = entry['date']
                
                entries_rows += f"""
                <tr>
                    <td>{date_str}</td>
                    <td>{entry['weight']:.1f}</td>
                    <td>{entry['body_fat_percentage']:.1f}%</td>
                    <td>{entry['weight'] * (1 - entry['body_fat_percentage']/100):.1f}</td>
                    <td>{entry['weight'] * entry['body_fat_percentage']/100:.1f}</td>
                </tr>
                """
            
            entries_html = f"""
            <div class="section">
                <h2>Recent Measurements</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Weight (lbs)</th>
                            <th>Body Fat %</th>
                            <th>Lean Mass (lbs)</th>
                            <th>Fat Mass (lbs)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {entries_rows}
                    </tbody>
                </table>
            </div>
            """
        
        html = f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Comprehensive Body Composition Report - {user_data.get('name', 'User')}</title>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f5f5f5;
        }}
        
        .container {{
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }}
        
        .header {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
            border-radius: 10px;
            margin-bottom: 30px;
            text-align: center;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }}
        
        .header h1 {{
            font-size: 2.5em;
            margin-bottom: 10px;
            font-weight: 700;
        }}
        
        .header p {{
            font-size: 1.1em;
            opacity: 0.9;
        }}
        
        .summary-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }}
        
        .summary-card {{
            background: white;
            padding: 25px;
            border-radius: 10px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            text-align: center;
            transition: transform 0.2s;
        }}
        
        .summary-card:hover {{
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0,0,0,0.15);
        }}
        
        .summary-card .value {{
            font-size: 2.5em;
            font-weight: bold;
            margin: 10px 0;
        }}
        
        .summary-card.positive .value {{
            background: linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }}
        
        .summary-card.negative .value {{
            background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }}
        
        .summary-card .label {{
            font-size: 0.9em;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 1px;
        }}
        
        .section {{
            background: white;
            padding: 30px;
            border-radius: 10px;
            margin-bottom: 30px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }}
        
        .section h2 {{
            font-size: 1.8em;
            margin-bottom: 20px;
            color: #333;
            border-bottom: 3px solid #667eea;
            padding-bottom: 10px;
            display: inline-block;
        }}
        
        .chart {{
            margin: 20px 0;
            text-align: center;
        }}
        
        .chart img {{
            max-width: 100%;
            height: auto;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }}
        
        .progress-bar {{
            width: 100%;
            height: 30px;
            background-color: #e9ecef;
            border-radius: 15px;
            overflow: hidden;
            margin: 20px 0;
            position: relative;
        }}
        
        .progress-fill {{
            height: 100%;
            background: linear-gradient(90deg, #667eea, #764ba2);
            transition: width 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
        }}
        
        table {{
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }}
        
        th, td {{
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }}
        
        th {{
            background-color: #f8f9fa;
            font-weight: 600;
            color: #495057;
        }}
        
        tr:hover {{
            background-color: #f8f9fa;
        }}
        
        .insights {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 10px;
            margin: 30px 0;
        }}
        
        .insights h3 {{
            font-size: 1.5em;
            margin-bottom: 15px;
        }}
        
        .insights ul {{
            list-style: none;
            padding: 0;
        }}
        
        .insights li {{
            padding: 10px 0;
            border-bottom: 1px solid rgba(255,255,255,0.2);
        }}
        
        .insights li:last-child {{
            border-bottom: none;
        }}
        
        .footer {{
            text-align: center;
            padding: 40px 20px;
            color: #666;
            font-size: 0.9em;
        }}
        
        .footer strong {{
            color: #667eea;
        }}
        
        @media print {{
            .container {{
                max-width: 100%;
            }}
            .summary-card {{
                break-inside: avoid;
            }}
            .section {{
                break-inside: avoid;
            }}
        }}
        
        @media (max-width: 768px) {{
            .header h1 {{
                font-size: 2em;
            }}
            .summary-grid {{
                grid-template-columns: 1fr;
            }}
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Comprehensive Body Composition Report</h1>
            <p>{user_data.get('name', 'User')} | Generated on {report_date}</p>
        </div>
        
        <div class="summary-grid">
            <div class="summary-card positive">
                <div class="label">Total Weight Loss</div>
                <div class="value">{analytics['total_weight_loss']} lbs</div>
            </div>
            
            <div class="summary-card positive">
                <div class="label">Body Fat Reduction</div>
                <div class="value">{analytics['bf_reduction']}%</div>
            </div>
            
            <div class="summary-card {'positive' if analytics['muscle_change'] >= 0 else 'negative'}">
                <div class="label">Muscle Change</div>
                <div class="value">{'+'  if analytics['muscle_change'] >= 0 else ''}{analytics['muscle_change']} lbs</div>
            </div>
            
            <div class="summary-card positive">
                <div class="label">Fat Loss</div>
                <div class="value">{analytics['fat_loss']} lbs</div>
            </div>
        </div>
        
        <div class="section">
            <h2>Progress Overview</h2>
            <div style="margin: 20px 0;">
                <h3>Weight Progress to Goal</h3>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: {min(100, analytics['weight_progress_pct'])}%">
                        {analytics['weight_progress_pct']:.1f}%
                    </div>
                </div>
                <p>Current: {analytics['current_weight']} lbs | Goal: {analytics['goal_weight']} lbs</p>
            </div>
            
            <div style="margin: 20px 0;">
                <h3>Body Fat Progress to Goal</h3>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: {min(100, analytics['bf_progress_pct'])}%">
                        {analytics['bf_progress_pct']:.1f}%
                    </div>
                </div>
                <p>Current: {analytics['current_bf']}% | Goal: {analytics['goal_bf']}%</p>
            </div>
        </div>
        
        <div class="section">
            <h2>Weight Progress Analysis</h2>
            <div class="chart">
                <img src="data:image/png;base64,{charts['weight_progress']}" alt="Weight Progress Chart">
            </div>
        </div>
        
        <div class="section">
            <h2>Body Composition Changes</h2>
            <div class="chart">
                <img src="data:image/png;base64,{charts['body_composition']}" alt="Body Composition Chart">
            </div>
        </div>
        
        <div class="section">
            <h2>Calorie Management</h2>
            <div class="chart">
                <img src="data:image/png;base64,{charts['calorie_tracking']}" alt="Calorie Tracking Chart">
            </div>
        </div>
        
        <div class="section">
            <h2>Muscle vs Fat Changes</h2>
            <div class="chart">
                <img src="data:image/png;base64,{charts['muscle_vs_fat']}" alt="Muscle vs Fat Chart">
            </div>
        </div>
        
        <div class="section">
            <h2>Progress Summary Dashboard</h2>
            <div class="chart">
                <img src="data:image/png;base64,{charts['progress_summary']}" alt="Progress Summary">
            </div>
        </div>
        
        <div class="section">
            <h2>Weekly Changes</h2>
            <div class="chart">
                <img src="data:image/png;base64,{charts['weekly_changes']}" alt="Weekly Changes Chart">
            </div>
        </div>
        
        <div class="section">
            <h2>Goal Projection</h2>
            <div class="chart">
                <img src="data:image/png;base64,{charts['goal_projection']}" alt="Goal Projection Chart">
            </div>
        </div>
        
        <div class="section">
            <h2>Body Measurements Overview</h2>
            <div class="chart">
                <img src="data:image/png;base64,{charts['body_measurements']}" alt="Body Measurements Chart">
            </div>
        </div>
        
        {entries_html}
        
        <div class="insights">
            <h3>Key Insights</h3>
            <ul>
                <li>Average weekly weight loss: {analytics['weekly_weight_loss']} lbs</li>
                <li>Average weekly body fat reduction: {analytics['weekly_bf_reduction']}%</li>
                <li>Program adherence rate: {analytics['adherence_rate']}%</li>
                <li>Total program duration: {analytics['weeks_completed']} weeks</li>
                <li>Current lean mass: {analytics['current_lean_mass']} lbs</li>
                <li>Current fat mass: {analytics['current_fat_mass']} lbs</li>
            </ul>
        </div>
        
        <div class="footer">
            <p><strong>Ap³𝘹Fit.ai</strong> – Advanced AI-Powered Fitness Analytics</p>
            <p>This report provides comprehensive body composition analysis and progress tracking.</p>
            <p>Continue monitoring your progress regularly for optimal results.</p>
        </div>
    </div>
</body>
</html>
"""
        
        return html