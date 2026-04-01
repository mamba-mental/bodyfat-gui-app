"""Direct test of chart generation using actual module."""
import os
import sys
import datetime
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
import base64
from io import BytesIO

# Add new_prime_python_code to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'new_prime_python_code'))

# Import the date parsing utility
from PRIME_Date_Utils import parse_date


def create_test_charts(progression_data, output_dir):
    """Test chart creation function - mimics the actual module's logic."""
    import seaborn as sns

    os.makedirs(output_dir, exist_ok=True)
    images_dir = os.path.join(output_dir, 'images')
    os.makedirs(images_dir, exist_ok=True)

    # Set professional style
    plt.style.use('default')
    sns.set_palette("Set2")

    # Extract data for plotting - exactly as in the real function
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

    # Debug output
    print(f"[CHART] === EXTRACTED DATA FOR CHARTS ===", flush=True)
    print(f"[CHART] First progression_data item: {progression_data[0]}", flush=True)
    print(f"[CHART] Chart dates (first 3): {dates[:3]}", flush=True)
    print(f"[CHART] Chart dates (last 3): {dates[-3:]}", flush=True)
    print(f"[CHART] Chart weights (first 3): {weights[:3]}", flush=True)
    print(f"[CHART] Chart weights (last 3): {weights[-3:]}", flush=True)
    print(f"[CHART] Date range: {dates[0]} to {dates[-1]}", flush=True)
    print(f"[CHART] Weight range: {min(weights)} to {max(weights)}", flush=True)

    timestamp = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')

    # Generate weight chart
    print(f"\n[CHART] Generating weight chart...", flush=True)

    fig, ax = plt.subplots(figsize=(12, 8))
    date_nums = mdates.date2num(dates)
    print(f"[CHART] date_nums: {date_nums[:3]}...{date_nums[-3:]}", flush=True)

    ax.plot(date_nums, weights, marker='o', linewidth=3, markersize=8, label='Weight', color='#2E86AB')
    ax.xaxis.set_major_formatter(mdates.DateFormatter('%Y-%m-%d'))
    ax.xaxis.set_major_locator(mdates.AutoDateLocator())
    ax.set_title('Weight Progress Over Time', fontsize=16, fontweight='bold', pad=20)
    ax.set_xlabel('Date', fontsize=12, fontweight='bold')
    ax.set_ylabel('Weight (lbs)', fontsize=12, fontweight='bold')
    ax.grid(True, alpha=0.3)
    ax.legend(fontsize=12)
    ax.tick_params(axis='x', rotation=45)

    print(f"[CHART] Plot created. X limits: {ax.get_xlim()}, Y limits: {ax.get_ylim()}", flush=True)

    fig.canvas.draw()

    # Save
    weight_chart_filename = f"weight_progress_{timestamp}.png"
    weight_chart_path = os.path.join(images_dir, weight_chart_filename)
    fig.savefig(weight_chart_path, format='png', dpi=100, bbox_inches='tight', facecolor='white')
    file_size = os.path.getsize(weight_chart_path)
    print(f"[CHART] Saved weight chart: {weight_chart_path}, size={file_size} bytes", flush=True)

    # Base64
    buffer = BytesIO()
    fig.savefig(buffer, format='png', dpi=100, bbox_inches='tight', facecolor='white')
    buffer.seek(0)
    weight_base64 = base64.b64encode(buffer.getvalue()).decode()
    buffer.close()
    plt.close(fig)

    return {
        'weight_progress_path': f"images/{weight_chart_filename}",
        'weight_progress_chart': weight_base64,
        'file_size': file_size
    }

# Sample progression data in EXACTLY the same format as predict_weight_loss returns
# Based on actual HTML report data
progression_data = [
    {"week_number": 0, "date": "010926", "weight": 273.40, "body_fat_percentage": 36.10, "daily_calorie_intake": 951.88, "tdee": 3596.00, "weekly_caloric_output": 0.00, "total_weight_lost": 0.00, "lean_mass": 174.70, "fat_mass": 98.70, "muscle_gain": 0.00, "rmr": 2105.00, "tef": 50.0, "neat": 500.0},
    {"week_number": 1, "date": "011626", "weight": 268.68, "body_fat_percentage": 34.36, "daily_calorie_intake": 951.88, "tdee": 3596.00, "weekly_caloric_output": 18508.85, "total_weight_lost": 4.72, "lean_mass": 176.35, "fat_mass": 92.32, "muscle_gain": 0.13, "rmr": 2105.00, "tef": 50.0, "neat": 500.0},
    {"week_number": 2, "date": "012326", "weight": 263.94, "body_fat_percentage": 32.56, "daily_calorie_intake": 914.13, "tdee": 3563.00, "weekly_caloric_output": 18542.08, "total_weight_lost": 9.46, "lean_mass": 177.99, "fat_mass": 85.95, "muscle_gain": 0.13, "rmr": 2105.00, "tef": 50.0, "neat": 500.0},
    {"week_number": 3, "date": "013026", "weight": 259.19, "body_fat_percentage": 30.70, "daily_calorie_intake": 876.38, "tdee": 3530.00, "weekly_caloric_output": 18575.31, "total_weight_lost": 14.21, "lean_mass": 179.62, "fat_mass": 79.57, "muscle_gain": 0.13, "rmr": 2105.00, "tef": 50.0, "neat": 500.0},
    {"week_number": 4, "date": "020626", "weight": 254.44, "body_fat_percentage": 28.77, "daily_calorie_intake": 838.63, "tdee": 3497.00, "weekly_caloric_output": 18608.54, "total_weight_lost": 18.96, "lean_mass": 181.25, "fat_mass": 73.19, "muscle_gain": 0.13, "rmr": 2105.00, "tef": 50.0, "neat": 500.0},
    {"week_number": 5, "date": "021326", "weight": 249.68, "body_fat_percentage": 26.79, "daily_calorie_intake": 800.88, "tdee": 3464.00, "weekly_caloric_output": 18641.77, "total_weight_lost": 23.72, "lean_mass": 182.87, "fat_mass": 66.81, "muscle_gain": 0.13, "rmr": 2105.00, "tef": 50.0, "neat": 500.0},
    {"week_number": 6, "date": "022026", "weight": 244.91, "body_fat_percentage": 24.75, "daily_calorie_intake": 763.13, "tdee": 3431.00, "weekly_caloric_output": 18675.00, "total_weight_lost": 28.49, "lean_mass": 184.48, "fat_mass": 60.43, "muscle_gain": 0.13, "rmr": 2105.00, "tef": 50.0, "neat": 500.0},
    {"week_number": 7, "date": "022726", "weight": 240.14, "body_fat_percentage": 22.64, "daily_calorie_intake": 725.38, "tdee": 3398.00, "weekly_caloric_output": 18708.23, "total_weight_lost": 33.26, "lean_mass": 186.09, "fat_mass": 54.05, "muscle_gain": 0.13, "rmr": 2105.00, "tef": 50.0, "neat": 500.0},
    {"week_number": 8, "date": "030626", "weight": 235.37, "body_fat_percentage": 20.47, "daily_calorie_intake": 687.63, "tdee": 3365.00, "weekly_caloric_output": 18741.46, "total_weight_lost": 38.03, "lean_mass": 187.69, "fat_mass": 47.67, "muscle_gain": 0.13, "rmr": 2105.00, "tef": 50.0, "neat": 500.0},
    {"week_number": 9, "date": "031326", "weight": 230.59, "body_fat_percentage": 18.24, "daily_calorie_intake": 649.88, "tdee": 3332.00, "weekly_caloric_output": 18774.69, "total_weight_lost": 42.81, "lean_mass": 189.29, "fat_mass": 41.29, "muscle_gain": 0.13, "rmr": 2105.00, "tef": 50.0, "neat": 500.0},
    {"week_number": 10, "date": "032026", "weight": 225.80, "body_fat_percentage": 15.96, "daily_calorie_intake": 612.13, "tdee": 3299.00, "weekly_caloric_output": 18807.92, "total_weight_lost": 47.60, "lean_mass": 190.89, "fat_mass": 34.91, "muscle_gain": 0.13, "rmr": 2105.00, "tef": 50.0, "neat": 500.0},
    {"week_number": 11, "date": "032726", "weight": 221.01, "body_fat_percentage": 13.61, "daily_calorie_intake": 574.38, "tdee": 3266.00, "weekly_caloric_output": 18841.15, "total_weight_lost": 52.39, "lean_mass": 192.48, "fat_mass": 28.53, "muscle_gain": 0.13, "rmr": 2105.00, "tef": 50.0, "neat": 500.0},
]

if __name__ == "__main__":
    print("=" * 70)
    print("DIRECT CHART GENERATION TEST")
    print("=" * 70)

    # Call the test chart generation function
    output_dir = os.path.join(os.path.dirname(__file__), "results_test")
    os.makedirs(output_dir, exist_ok=True)

    print(f"\nCalling create_test_charts with {len(progression_data)} data points...")
    print(f"Output directory: {output_dir}")
    print()

    chart_data = create_test_charts(progression_data, output_dir)

    print("\n" + "=" * 70)
    print("RESULTS:")
    print("=" * 70)

    for key, value in chart_data.items():
        if 'chart' in key.lower():
            print(f"{key}: {len(value)} chars of base64")
        else:
            print(f"{key}: {value}")

    # Check generated files
    images_dir = os.path.join(output_dir, 'images')
    if os.path.exists(images_dir):
        for f in os.listdir(images_dir):
            filepath = os.path.join(images_dir, f)
            size = os.path.getsize(filepath)
            status = "OK - has data" if size > 10000 else "BLANK - problem!"
            print(f"\nFile: {f}")
            print(f"  Size: {size} bytes")
            print(f"  Status: {status}")
