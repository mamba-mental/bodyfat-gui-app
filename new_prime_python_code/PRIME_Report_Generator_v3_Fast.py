
"""
Fast version of PRIME Report Generator that skips AI analysis for quick report generation.
This is a standalone implementation that doesn't depend on AI components.

Performance optimizations:
- Parallel chart generation using ThreadPoolExecutor
- Reduced matplotlib rendering overhead
"""

import os
import glob
import datetime
import re
import matplotlib
matplotlib.use('Agg')  # Set headless backend BEFORE importing pyplot
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
import seaborn as sns
import pandas as pd
import numpy as np
import base64
from io import BytesIO
from jinja2 import Template
from concurrent.futures import ThreadPoolExecutor, as_completed


def sanitize_filename(name: str) -> str:
    """Sanitize a string to be safe for use in filenames on all platforms."""
    # Replace spaces with underscores
    sanitized = name.replace(' ', '_')
    # Remove characters that are invalid on Windows: \ / : * ? " < > |
    sanitized = re.sub(r'[\\/:*?"<>|]', '', sanitized)
    # Remove any other non-alphanumeric characters except underscore and hyphen
    sanitized = re.sub(r'[^\w\-]', '', sanitized)
    # Ensure we have at least something
    return sanitized if sanitized else 'User'

# Import only the non-AI dependent modules
from .PRIME_Utils import calculate_age, DIET_MULTIPLIERS, EXERCISE_ADJUSTMENTS
from .PRIME_Calculations import calculate_lean_mass_preservation_scores
from .PRIME_Date_Utils import parse_date


def _generate_weight_chart(dates, weights, images_dir, timestamp):
    """Generate weight progress chart in a separate thread."""
    try:
        import sys
        print(f"[CHART] _generate_weight_chart START", flush=True)
        print(f"[CHART] dates count={len(dates)}, weights count={len(weights)}", flush=True)
        print(f"[CHART] dates type={type(dates[0]) if dates else 'empty'}", flush=True)
        print(f"[CHART] first 3 dates: {dates[:3]}", flush=True)
        print(f"[CHART] first 3 weights: {weights[:3]}", flush=True)
        print(f"[CHART] last 3 dates: {dates[-3:]}", flush=True)
        print(f"[CHART] last 3 weights: {weights[-3:]}", flush=True)
        sys.stdout.flush()

        fig, ax = plt.subplots(figsize=(10, 5))

        # Convert dates to matplotlib date numbers for proper plotting
        date_nums = mdates.date2num(dates)
        ax.plot(date_nums, weights, marker='o', linewidth=3, markersize=8, label='Weight', color='#2E86AB')

        # Set up date formatting on x-axis
        ax.xaxis.set_major_formatter(mdates.DateFormatter('%m/%d'))
        ax.xaxis.set_major_locator(mdates.AutoDateLocator())

        print(f"[DEBUG] _generate_weight_chart: Plot created, x_lim={ax.get_xlim()}, y_lim={ax.get_ylim()}")
        ax.set_title('Predicted Weight Changes', fontsize=14, fontweight='bold', pad=15)
        ax.set_xlabel('Date', fontsize=12, fontweight='bold')
        ax.set_ylabel('Weight (lbs)', fontsize=12, fontweight='bold')
        ax.grid(True, alpha=0.3)
        ax.legend(fontsize=10)
        ax.tick_params(axis='x', rotation=45)

        # Force the figure to draw before saving
        fig.canvas.draw()
        print(f"[DEBUG] _generate_weight_chart: Canvas drawn, figure size={fig.get_size_inches()}")

        # Save to file for markdown - use fig.savefig() not plt.savefig() to be explicit
        weight_chart_filename = f"weight_progress_{timestamp}.png"
        weight_chart_path = os.path.normpath(os.path.join(images_dir, weight_chart_filename))
        fig.savefig(weight_chart_path, format='png', dpi=100, bbox_inches='tight', facecolor='white')
        file_size = os.path.getsize(weight_chart_path)
        print(f"[CHART] Saved weight chart to {weight_chart_path}, size={file_size} bytes", flush=True)
        if file_size < 10000:
            print(f"[CHART] WARNING: Weight chart file size is small, may be blank!", flush=True)

        # Save to base64 for HTML - use fig.savefig() for explicit figure reference
        buffer = BytesIO()
        fig.savefig(buffer, format='png', dpi=100, bbox_inches='tight', facecolor='white')
        buffer.seek(0)
        base64_data = base64.b64encode(buffer.getvalue()).decode()
        buffer.close()
        plt.close(fig)

        return {
            'weight_progress_chart': base64_data,
            'weight_progress_path': f"images/{weight_chart_filename}"
        }
    except Exception as e:
        print(f"[WARNING] Weight chart creation failed: {e}")
        return {'weight_progress_chart': '', 'weight_progress_path': ''}


def _generate_body_composition_chart(dates, body_fat_pcts, lean_mass, fat_mass, images_dir, timestamp):
    """Generate body composition chart in a separate thread."""
    try:
        import sys
        print(f"[CHART] _generate_body_composition_chart START", flush=True)
        print(f"[CHART] dates count={len(dates)}, bf count={len(body_fat_pcts)}", flush=True)
        print(f"[CHART] bf range={min(body_fat_pcts):.1f} to {max(body_fat_pcts):.1f}", flush=True)
        print(f"[CHART] lean range={min(lean_mass):.1f} to {max(lean_mass):.1f}", flush=True)
        print(f"[CHART] first 3 bf: {body_fat_pcts[:3]}", flush=True)
        print(f"[CHART] first 3 lean: {lean_mass[:3]}", flush=True)
        sys.stdout.flush()

        # Single dual-axis chart matching reference PDF style
        fig, ax1 = plt.subplots(figsize=(10, 5))

        # Convert dates to matplotlib date numbers for proper plotting
        date_nums = mdates.date2num(dates)

        # Body fat percentage on left axis (blue line)
        color_bf = '#2E86AB'
        ax1.set_xlabel('Date', fontsize=12, fontweight='bold')
        ax1.set_ylabel('Body Fat %', fontsize=12, fontweight='bold', color=color_bf)
        line1, = ax1.plot(date_nums, body_fat_pcts, marker='o', linewidth=3, markersize=8, label='Body Fat %', color=color_bf)
        ax1.tick_params(axis='y', labelcolor=color_bf)
        ax1.xaxis.set_major_formatter(mdates.DateFormatter('%m/%d'))
        ax1.xaxis.set_major_locator(mdates.AutoDateLocator())
        ax1.tick_params(axis='x', rotation=45)
        ax1.grid(True, alpha=0.3)

        # Create second y-axis for mass (right side)
        ax2 = ax1.twinx()
        color_lean = '#F18F01'
        color_fat = '#C73E1D'
        ax2.set_ylabel('Mass (lbs)', fontsize=12, fontweight='bold')
        line2, = ax2.plot(date_nums, lean_mass, marker='s', linewidth=3, markersize=8, label='Lean Mass', color=color_lean)
        line3, = ax2.plot(date_nums, fat_mass, marker='s', linewidth=3, markersize=8, label='Fat Mass', color=color_fat)

        # Combined legend
        lines = [line1, line2, line3]
        labels = [l.get_label() for l in lines]
        ax1.legend(lines, labels, loc='upper right', fontsize=10)

        ax1.set_title('Predicted Body Fat and Composition Changes', fontsize=14, fontweight='bold', pad=15)

        fig.tight_layout()
        print(f"[DEBUG] _generate_body_composition_chart: ax1 y_lim={ax1.get_ylim()}, ax2 y_lim={ax2.get_ylim()}")

        # Force the figure to draw before saving
        fig.canvas.draw()

        # Save to file for markdown - use fig.savefig() not plt.savefig()
        body_comp_filename = f"body_composition_{timestamp}.png"
        body_comp_path = os.path.normpath(os.path.join(images_dir, body_comp_filename))
        fig.savefig(body_comp_path, format='png', dpi=100, bbox_inches='tight', facecolor='white')
        file_size = os.path.getsize(body_comp_path)
        print(f"[CHART] Saved body comp chart to {body_comp_path}, size={file_size} bytes", flush=True)
        if file_size < 15000:
            print(f"[CHART] WARNING: Body comp chart file size is small, may be blank!", flush=True)

        # Save to base64 for HTML - use fig.savefig() for explicit figure reference
        buffer = BytesIO()
        fig.savefig(buffer, format='png', dpi=100, bbox_inches='tight', facecolor='white')
        buffer.seek(0)
        base64_data = base64.b64encode(buffer.getvalue()).decode()
        buffer.close()
        plt.close(fig)

        return {
            'body_composition_chart': base64_data,
            'body_composition_path': f"images/{body_comp_filename}"
        }
    except Exception as e:
        print(f"[WARNING] Body composition chart creation failed: {e}")
        return {'body_composition_chart': '', 'body_composition_path': ''}


def create_professional_charts(progression_data, output_dir):
    """
    Create professional charts for the report with proper styling.
    Uses parallel generation for improved performance.

    Args:
        progression_data (list): Weekly progression data
        output_dir (str): Directory to save charts

    Returns:
        dict: Base64 encoded chart data for embedding in HTML, plus file paths for markdown
    """
    os.makedirs(output_dir, exist_ok=True)
    images_dir = os.path.normpath(os.path.join(output_dir, 'images'))
    os.makedirs(images_dir, exist_ok=True)
    chart_data = {
        'weight_progress_path': '',
        'body_composition_path': '',
        'weight_progress_chart': '',
        'body_composition_chart': ''
    }

    # Set professional style (must be done before parallel generation)
    plt.style.use('default')
    sns.set_palette("Set2")

    # Extract data for plotting
    dates = []
    for d in progression_data:
        try:
            dates.append(parse_date(d['date']))
        except (ValueError, KeyError) as e:
            dates.append(datetime.datetime.now().date())
            print(f"[WARNING] Could not parse date: {d.get('date', 'missing')} - {e}")

    weights = [d['weight'] for d in progression_data]
    body_fat_pcts = [d['body_fat_percentage'] for d in progression_data]
    lean_mass = [d['lean_mass'] for d in progression_data]
    fat_mass = [d['fat_mass'] for d in progression_data]

    # Debug: Print chart data to verify correct values
    import sys
    print(f"[CHART] === EXTRACTED DATA FOR CHARTS ===", flush=True)
    print(f"[CHART] First progression_data item: {progression_data[0]}", flush=True)
    print(f"[CHART] Chart dates (first 3): {dates[:3]}", flush=True)
    print(f"[CHART] Chart dates (last 3): {dates[-3:]}", flush=True)
    print(f"[CHART] Chart weights (first 3): {weights[:3]}", flush=True)
    print(f"[CHART] Chart weights (last 3): {weights[-3:]}", flush=True)
    print(f"[CHART] Chart body_fat_pcts (first 3): {body_fat_pcts[:3]}", flush=True)
    print(f"[CHART] Date range: {dates[0]} to {dates[-1]}", flush=True)
    print(f"[CHART] Weight range: {min(weights)} to {max(weights)}", flush=True)
    sys.stdout.flush()

    # Generate shared timestamp for both charts
    timestamp = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')

    # Generate charts SEQUENTIALLY to avoid matplotlib threading issues
    # ThreadPoolExecutor can cause issues with matplotlib state
    print(f"[DEBUG] Generating weight chart sequentially...")
    try:
        weight_result = _generate_weight_chart(dates, weights, images_dir, timestamp)
        chart_data.update(weight_result)
        print(f"[DEBUG] Weight chart complete: {weight_result.get('weight_progress_path', 'N/A')}")
    except Exception as e:
        print(f"[WARNING] Weight chart generation failed: {e}")
        import traceback
        traceback.print_exc()

    print(f"[DEBUG] Generating body composition chart sequentially...")
    try:
        body_result = _generate_body_composition_chart(dates, body_fat_pcts, lean_mass, fat_mass, images_dir, timestamp)
        chart_data.update(body_result)
        print(f"[DEBUG] Body composition chart complete: {body_result.get('body_composition_path', 'N/A')}")
    except Exception as e:
        print(f"[WARNING] Body composition chart generation failed: {e}")
        import traceback
        traceback.print_exc()

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
    # BUG #12 fix — make the "Daily Cal Intake" column TAPER per week.
    # The cut-mode solver holds daily_calorie_intake ~flat across weeks, so the
    # legacy table showed one constant number for every row. The engine also emits
    # `reference_training_calories` — the phase-varying calibrated training-day
    # intake from RECOMP_REF_CURVE (RESET->ADAPT->CYCLE->PEAK taper) — which is the
    # value the Living Report's phase narrative reflects. Build immutable per-week
    # copies whose daily_calorie_intake shows that real taper, falling back to the
    # original field when the new one is absent (older engine / gain/maintain mode).
    # Source progression_data is NOT mutated (other consumers keep the solver value).
    weekly_progress_display = [
        {**d, 'daily_calorie_intake': d.get('reference_training_calories', d['daily_calorie_intake'])}
        for d in progression_data
    ]
    avg_intake = sum(d['daily_calorie_intake'] for d in weekly_progress_display) / len(weekly_progress_display) if len(weekly_progress_display) > 0 else 0
    
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
        'total_weeks': total_weeks,  # Template expects total_weeks
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
        
        # Weekly progress data for table (BUG #12: per-week tapered intake)
        'weekly_progress': weekly_progress_display,
        
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
    safe_name = sanitize_filename(name)
    report_filename = f"PRIME_Report_{safe_name}_{timestamp}"
    html_path = os.path.normpath(os.path.join(output_dir, f"{report_filename}.html"))
    
    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(html_content)
    
    print(f"HTML report saved to: {html_path}")

    # Generate markdown content with relative image paths
    weight_chart_md = f"![Weight Progress]({chart_data.get('weight_progress_path', '')})" if chart_data.get('weight_progress_path') else "*Chart not available*"
    body_comp_chart_md = f"![Body Composition]({chart_data.get('body_composition_path', '')})" if chart_data.get('body_composition_path') else "*Chart not available*"
    markdown_content = f"""# PRIME Body Composition Report

**Name:** {name}
**Date:** {context['report_date']}

## Projected Summary
*These are PREDICTED outcomes of the plan over the timeline below — not results already achieved.*

- Timeline: {total_weeks} weeks
- Projected Total Weight Loss: {total_weight_loss:.1f} lbs
- Projected Total Fat Loss: {total_fat_loss:.1f} lbs
- Projected Muscle Change: {muscle_change:+.1f} lbs

## Charts

### Weight Progress
{weight_chart_md}

### Body Composition
{body_comp_chart_md}

Full HTML report saved to: {html_path}
"""

    # Save as markdown for compatibility
    markdown_path = os.path.normpath(os.path.join(output_dir, f"{report_filename}.md"))

    with open(markdown_path, 'w', encoding='utf-8') as f:
        f.write(markdown_content)

    # PDF generation would go here if needed
    pdf_path = None

    return markdown_path, pdf_path