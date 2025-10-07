"""
Fast version of PRIME Report Generator that skips AI analysis for quick report generation.
This is a standalone implementation that doesn't depend on AI components.
"""

import os
import glob
import datetime
import matplotlib.pyplot as plt
import matplotlib
matplotlib.use('Agg')  # Set headless backend
import seaborn as sns
import pandas as pd
import numpy as np
import base64
from io import BytesIO
from jinja2 import Template

# Import only the non-AI dependent modules
from .PRIME_Utils import calculate_age, DIET_MULTIPLIERS, EXERCISE_ADJUSTMENTS
from .PRIME_Calculations import calculate_lean_mass_preservation_scores

def create_professional_charts(progression_data, output_dir):
    """
    Create professional charts for the report with proper styling.
    
    Args:
        progression_data (list): Weekly progression data
        output_dir (str): Directory to save charts
        
    Returns:
        dict: Base64 encoded chart data for embedding in HTML
    """
    os.makedirs(output_dir, exist_ok=True)
    chart_data = {}
    
    # Set professional style
    plt.style.use('default')
    sns.set_palette("Set2")
    
    # Extract data for plotting
    dates = []
    for d in progression_data:
        try:
            dates.append(datetime.datetime.strptime(d['date'], "%m%d%y"))
        except (ValueError, KeyError):
            # Fallback to current date if parsing fails
            dates.append(datetime.datetime.now())
            print(f"[WARNING] Could not parse date: {d.get('date', 'missing')}")
    
    weights = [d['weight'] for d in progression_data]
    body_fat_pcts = [d['body_fat_percentage'] for d in progression_data]
    lean_mass = [d['lean_mass'] for d in progression_data]
    fat_mass = [d['fat_mass'] for d in progression_data]
    
    # Create weight progress chart
    try:
        fig, ax = plt.subplots(figsize=(12, 8))
        ax.plot(dates, weights, marker='o', linewidth=3, markersize=8, label='Weight', color='#2E86AB')
        ax.set_title('Weight Progress Over Time', fontsize=16, fontweight='bold', pad=20)
        ax.set_xlabel('Date', fontsize=12, fontweight='bold')
        ax.set_ylabel('Weight (lbs)', fontsize=12, fontweight='bold')
        ax.grid(True, alpha=0.3)
        ax.legend(fontsize=12)
        
        # Format dates on x-axis
        ax.tick_params(axis='x', rotation=45)
        
        # Save to base64
        buffer = BytesIO()
        plt.savefig(buffer, format='png', dpi=100, bbox_inches='tight', facecolor='white')
        buffer.seek(0)
        chart_data['weight_progress_chart'] = base64.b64encode(buffer.getvalue()).decode()
        buffer.close()
        plt.close()
        
    except Exception as e:
        print(f"[WARNING] Weight chart creation failed: {e}")
        chart_data['weight_progress_chart'] = ""
    
    # Create body composition chart
    try:
        fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(12, 10))
        
        # Body fat percentage
        ax1.plot(dates, body_fat_pcts, marker='s', linewidth=3, markersize=8, label='Body Fat %', color='#A23B72')
        ax1.set_title('Body Fat Percentage Over Time', fontsize=14, fontweight='bold')
        ax1.set_ylabel('Body Fat %', fontsize=12, fontweight='bold')
        ax1.grid(True, alpha=0.3)
        ax1.legend(fontsize=12)
        
        # Lean vs Fat mass
        ax2.plot(dates, lean_mass, marker='^', linewidth=3, markersize=8, label='Lean Mass', color='#F18F01')
        ax2.plot(dates, fat_mass, marker='v', linewidth=3, markersize=8, label='Fat Mass', color='#C73E1D')
        ax2.set_title('Body Composition Over Time', fontsize=14, fontweight='bold')
        ax2.set_xlabel('Date', fontsize=12, fontweight='bold')
        ax2.set_ylabel('Mass (lbs)', fontsize=12, fontweight='bold')
        ax2.grid(True, alpha=0.3)
        ax2.legend(fontsize=12)
        
        # Format dates
        for ax in [ax1, ax2]:
            ax.tick_params(axis='x', rotation=45)
        
        plt.tight_layout()
        
        # Save to base64
        buffer = BytesIO()
        plt.savefig(buffer, format='png', dpi=100, bbox_inches='tight', facecolor='white')
        buffer.seek(0)
        chart_data['body_composition_chart'] = base64.b64encode(buffer.getvalue()).decode()
        buffer.close()
        plt.close()
        
    except Exception as e:
        print(f"[WARNING] Body composition chart creation failed: {e}")
        chart_data['body_composition_chart'] = ""
    
    return chart_data

def prepare_input_parameters_for_report(user_data):
    """
    Prepare input parameters for the report analysis section.
    
    Args:
        user_data (dict): User profile data
        
    Returns:
        list: List of parameter dictionaries for the report
    """
    parameters = []
    
    # Define parameter mappings
    param_mappings = [
        ('name', 'Name', 'User identification'),
        ('age', 'Age', 'RMR calculation (Mifflin-St Jeor equation)'),
        ('gender', 'Gender', 'RMR calculation gender-specific formula'),
        ('height_feet', 'Height (feet)', 'RMR calculation body surface area'),
        ('height_inches', 'Height (inches)', 'RMR calculation body surface area'),
        ('current_weight', 'Current Weight', 'Primary factor in all metabolic calculations'),
        ('current_bf', 'Current Body Fat %', 'Body composition and lean mass calculations'),
        ('goal_weight', 'Goal Weight', 'Target calculations and timeline planning'),
        ('goal_bf', 'Goal Body Fat %', 'Target body composition planning'),
        ('activity_level', 'Activity Level', 'TDEE multiplier calculation'),
        ('workout_type', 'Workout Type', 'Exercise-specific metabolic adjustments'),
        ('workout_days', 'Workout Frequency', 'Weekly activity and recovery planning'),
        ('resistance_training', 'Resistance Training', 'Muscle preservation calculations'),
        ('is_athlete', 'Athlete Status', 'Enhanced metabolic capacity adjustments'),
        ('ped_use', 'PED Use', 'Muscle gain and fat loss multipliers'),
        ('protein_intake', 'Protein Intake', 'Thermic effect and muscle synthesis'),
        ('diet_type', 'Diet Type', 'Macronutrient distribution and TEF'),
        ('sleep_quality', 'Sleep Quality', 'Recovery and hormone regulation factors')
    ]
    
    for key, name, usage in param_mappings:
        if key in user_data:
            value = user_data[key]
            parameters.append({
                'name': name,
                'value': str(value),
                'used': True,
                'usage_description': usage
            })
    
    return parameters

def generate_prime_report_terminal_fast(user_data, progression_data, output_dir="results"):
    """
    Generate a comprehensive PRIME report WITHOUT AI analysis for fast generation.
    
    This is the same as generate_prime_report_terminal but skips the AI confidence
    analysis which adds 20+ seconds due to external API calls.
    
    Args:
        user_data (dict): User profile data
        progression_data (list): Weekly progression predictions
        output_dir (str): Output directory for files
        
    Returns:
        tuple: (markdown_path, pdf_path) if successful, (markdown_path, None) if PDF fails
    """
    os.makedirs(output_dir, exist_ok=True)
    
    # Generate professional charts
    print(f"[INFO] Generating charts with {len(progression_data)} data points...")
    chart_data = create_professional_charts(progression_data, output_dir)
    print(f"[INFO] Chart data keys: {list(chart_data.keys())}")
    for key, value in chart_data.items():
        print(f"[INFO] {key}: {'SUCCESS' if value else 'EMPTY'} ({len(str(value))} chars)")
    
    # Prepare input parameters for report
    input_parameters = prepare_input_parameters_for_report(user_data)
    
    # Skip AI analysis - use default values for fast generation
    input_analysis = {
        'anthropometric_reliability': 85.0,
        'activity_reliability': 80.0,
        'goal_reliability': 75.0,
        'data_completeness': 90.0
    }
    confidence_analysis = None
    
    # Calculate comprehensive metrics
    initial_data = progression_data[0]
    final_data = progression_data[-1]
    
    # Extract user data with defaults
    name = user_data.get('name', 'User')
    height_ft = user_data.get('height_feet', 5)
    height_in = user_data.get('height_inches', 9)
    height_cm = user_data.get('height_cm', 175.26)
    current_weight = initial_data['weight']
    current_bf = initial_data['body_fat_percentage']
    goal_weight = user_data.get('goal_weight', final_data['weight'])
    goal_bf = user_data.get('goal_bf', final_data['body_fat_percentage'])
    age = user_data.get('age', 30)
    gender = user_data.get('gender', 'Male')
    activity_level = user_data.get('activity_level_description', 'Light exercise/sports 1-3 days/week')
    experience_level = user_data.get('experience_level', 'Intermediate')
    workout_type = user_data.get('workout_type', 'Bodybuilding')
    workout_days = user_data.get('workout_days', 4)
    is_athlete = user_data.get('is_athlete', True)
    resistance_training = user_data.get('resistance_training', True)
    ped_use = user_data.get('ped_use', False)
    protein_intake = user_data.get('protein_intake', 150) # Default to 150g
    diet_type = user_data.get('diet_type', 'balanced') # Default to balanced
    sleep_quality = user_data.get('sleep_quality', 'good') # Default to good
    
    # Calculate timeline
    start_date = progression_data[0]['date']
    end_date = progression_data[-1]['date']
    total_weeks = len(progression_data)
    
    # Calculate key metrics
    total_weight_loss = current_weight - final_data['weight']
    total_fat_loss = initial_data['fat_mass'] - final_data['fat_mass']
    muscle_change = final_data['lean_mass'] - initial_data['lean_mass']
    avg_weekly_weight_loss = total_weight_loss / total_weeks if total_weeks > 0 else 0
    avg_weekly_fat_loss = total_fat_loss / total_weeks if total_weeks > 0 else 0
    muscle_retention_rate = (final_data['lean_mass'] / initial_data['lean_mass'] * 100) if initial_data['lean_mass'] > 0 else 100
    
    # Calculate preservation scores  
    volume_score, intensity_score, frequency_score = calculate_lean_mass_preservation_scores(
        workout_days,
        workout_type
    )
    
    # Create preservation scores dictionary for compatibility
    preservation_scores = {
        'preservation_score': (volume_score + intensity_score + frequency_score) / 3,
        'quality_score': intensity_score,
        'overall_score': (volume_score * 0.4 + intensity_score * 0.4 + frequency_score * 0.2)
    }
    
    # Calculate metabolic adaptation
    initial_tdee = progression_data[0]['tdee']
    final_tdee = progression_data[-1]['tdee']
    metabolic_adaptation = ((initial_tdee - final_tdee) / initial_tdee * 100) if initial_tdee > 0 else 0
    
    # Helper function for template
    def get_score_description(score):
        """Helper function for template to describe scores."""
        if score >= 0.8:
            return "Excellent"
        elif score >= 0.6:
            return "Good"
        elif score >= 0.4:
            return "Fair"
        else:
            return "Needs Improvement"
    
    # Calculate adherence metrics
    avg_deficit = sum(d['weekly_caloric_output'] for d in progression_data) / len(progression_data) if len(progression_data) > 0 else 0
    avg_intake = sum(d['daily_calorie_intake'] for d in progression_data) / len(progression_data) if len(progression_data) > 0 else 0
    
    # Prepare data for HTML template
    context = {
        'name': name,
        'report_date': datetime.datetime.now().strftime('%B %d, %Y'),
        'height': f"{height_ft}'{height_in}\"",
        'height_cm': f"{height_cm:.1f}",
        'age': age,
        'gender': gender.title(),
        'activity_level': activity_level,
        'experience_level': experience_level,
        'workout_type': workout_type,
        'workout_days': workout_days,
        'workout_frequency': workout_days,  # Template expects workout_frequency
        'is_athlete': 'Yes' if is_athlete else 'No',
        'athlete_status': 'Yes' if is_athlete else 'No',  # Template expects athlete_status
        'resistance_training': 'Yes' if resistance_training else 'No',
        'ped_use': 'Yes' if ped_use else 'No',
        'protein_intake': protein_intake,
        'diet_type': diet_type.title(),
        'sleep_quality': sleep_quality.title(),
        
        # Template expects initial_* variables for current values (as numbers for formatting)
        'initial_weight': current_weight,
        'initial_body_fat': current_bf,
        'initial_lean_mass': initial_data['lean_mass'],
        'initial_fat_mass': initial_data['fat_mass'],
        'initial_rmr': initial_data.get('rmr', initial_tdee / user_data.get('activity_multiplier', 1.55)),
        'initial_tdee': initial_tdee,
        'initial_daily_calorie_intake': progression_data[0]['daily_calorie_intake'],
        
        # Keep current_* for compatibility (as strings for direct display)
        'current_weight': f"{current_weight:.1f}",
        'current_bf': f"{current_bf:.1f}",
        'current_lean_mass': f"{initial_data['lean_mass']:.1f}",
        'current_fat_mass': f"{initial_data['fat_mass']:.1f}",
        
        'goal_weight': goal_weight,
        'goal_body_fat': goal_bf,
        'goal_lean_mass': final_data['lean_mass'],
        'goal_fat_mass': final_data['fat_mass'],
        
        'total_weight_loss': total_weight_loss,
        'total_fat_loss': total_fat_loss,
        'muscle_change': muscle_change,
        'muscle_retention_rate': muscle_retention_rate,
        'avg_weekly_weight_loss': avg_weekly_weight_loss,
        'avg_weekly_fat_loss': avg_weekly_fat_loss,
        
        'timeline_weeks': total_weeks,
        'start_date': start_date,
        'end_date': end_date,
        
        'initial_tdee': initial_tdee,
        'final_tdee': final_tdee,
        'metabolic_adaptation': metabolic_adaptation,
        'avg_deficit': avg_deficit,
        'avg_intake': avg_intake,
        
        'preservation_score': preservation_scores['preservation_score'],
        'quality_score': preservation_scores['quality_score'],
        'overall_score': preservation_scores['overall_score'],
        
        # Add missing template variables with calculated values
        'volume_score': volume_score,  # Calculated workout volume score
        'intensity_score': intensity_score,  # Calculated workout intensity score  
        'frequency_score': frequency_score,  # Calculated workout frequency score
        'tef': initial_tdee * 0.1,  # Thermic Effect of Food (~10% of TDEE)
        'neat': initial_tdee * 0.15,  # NEAT (~15% of TDEE)
        
        # Weekly progress data for table
        'weekly_progress': progression_data,
        
        # Body composition changes (simplified for fast generation)
        'body_composition_changes': [
            {
                'category': 'Current',
                'body_fat_percentage': current_bf,
                'date_reached': start_date,
                'description': 'Starting point',
                'time_to_six_pack': f'{max(0, (current_bf - 10) / 0.5):.0f} weeks'
            },
            {
                'category': 'Target', 
                'body_fat_percentage': goal_bf,
                'date_reached': end_date,
                'description': 'Goal achievement',
                'time_to_six_pack': '0 weeks' if goal_bf <= 10 else f'{max(0, (goal_bf - 10) / 0.5):.0f} weeks'
            }
        ],
        
        # Expected results summary
        'total_weight_loss': total_weight_loss,
        'total_bf_loss': current_bf - goal_bf,
        'total_muscle_gain': muscle_change if muscle_change > 0 else 0,
        'avg_weekly_loss': avg_weekly_weight_loss,
        'avg_muscle_gain': muscle_change / total_weeks if total_weeks > 0 and muscle_change > 0 else 0,
        
        # Metabolic adaptation forecast
        'week_1_adaptation': 1.0,
        'final_week_adaptation': 0.85,
        'adaptation_percentage': metabolic_adaptation,
        'lean_mass_preserved': muscle_retention_rate,
        
        # Final phase targets
        'final_weekly_caloric_output': progression_data[-1]['weekly_caloric_output'] if progression_data else 0,
        
        'input_parameters': input_parameters,
        'input_analysis': input_analysis,
        'confidence_analysis': confidence_analysis,
        
        'charts': chart_data,
        
        # Add chart data directly for template access
        'weight_progress_chart': chart_data.get('weight_progress_chart', ''),
        'body_composition_chart': chart_data.get('body_composition_chart', ''),
        'progression_data': progression_data,
        
        # Note about skipped AI analysis
        'ai_analysis_note': 'AI confidence analysis skipped for faster report generation.'
    }
    
    # Generate HTML using template
    # Resolve template path robustly across available report templates
    templates_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'templates')
    candidate_files = [
        'report_template.html',
        'report-template-new-091625.html',
        'report-template-new-091625.md.html',
    ]

    template_path = None
    # Try known candidates first (stable order)
    for fname in candidate_files:
        path = os.path.join(templates_dir, fname)
        if os.path.exists(path):
            template_path = path
            break

    # If still not found, try to pick the first matching report*.html file
    if template_path is None:
        try:
            matches = sorted(glob.glob(os.path.join(templates_dir, 'report*.html')))
            if matches:
                template_path = matches[0]
        except Exception:
            pass

    if template_path is None or not os.path.exists(template_path):
        raise FileNotFoundError(
            f"Report template not found. Looked for {candidate_files} or report*.html in: {templates_dir}"
        )

    # Read template
    with open(template_path, 'r', encoding='utf-8') as f:
        template_content = f.read()

    # Use Jinja2 to render template
    template = Template(template_content)
    # Add helper function to template globals
    template.globals['get_score_description'] = get_score_description
    html_content = template.render(**context)
    
    # Save HTML report
    timestamp = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
    report_filename = f"PRIME_Report_{name.replace(' ', '_')}_{timestamp}"
    html_path = os.path.join(output_dir, f"{report_filename}.html")
    
    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(html_content)
    
    print(f"HTML report saved to: {html_path}")
    
    # Also save as markdown for compatibility
    markdown_path = os.path.join(output_dir, f"{report_filename}.md")
    markdown_content = f"""# PRIME Body Composition Report

**Name:** {name}  
**Date:** {context['report_date']}

## Summary
- Total Weight Loss: {total_weight_loss:.1f} lbs
- Total Fat Loss: {total_fat_loss:.1f} lbs
- Muscle Change: {muscle_change:+.1f} lbs
- Timeline: {total_weeks} weeks

*Note: AI confidence analysis skipped for faster report generation.*

Full HTML report saved to: {html_path}
"""
    
    with open(markdown_path, 'w', encoding='utf-8') as f:
        f.write(markdown_content)
    
    # PDF generation would go here if needed
    pdf_path = None
    
    return markdown_path, pdf_path