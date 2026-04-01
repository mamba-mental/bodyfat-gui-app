"""Quick diagnostic test for matplotlib chart generation."""
import os
import sys
import datetime
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.dates as mdates

# Add parent directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'new_prime_python_code'))

from PRIME_Date_Utils import parse_date

def test_chart():
    """Test chart generation with sample progression data."""

    # Sample progression data matching what we see in HTML report
    progression_data = [
        {"date": "010926", "weight": 273.40, "body_fat_percentage": 36.10, "lean_mass": 174.70, "fat_mass": 98.70},
        {"date": "011626", "weight": 268.68, "body_fat_percentage": 34.36, "lean_mass": 176.35, "fat_mass": 92.32},
        {"date": "012326", "weight": 263.94, "body_fat_percentage": 32.56, "lean_mass": 177.99, "fat_mass": 85.95},
        {"date": "013026", "weight": 259.19, "body_fat_percentage": 30.70, "lean_mass": 179.62, "fat_mass": 79.57},
        {"date": "020626", "weight": 254.44, "body_fat_percentage": 28.77, "lean_mass": 181.25, "fat_mass": 73.19},
        {"date": "021326", "weight": 249.68, "body_fat_percentage": 26.79, "lean_mass": 182.87, "fat_mass": 66.81},
        {"date": "022026", "weight": 244.91, "body_fat_percentage": 24.75, "lean_mass": 184.48, "fat_mass": 60.43},
        {"date": "022726", "weight": 240.14, "body_fat_percentage": 22.64, "lean_mass": 186.09, "fat_mass": 54.05},
        {"date": "030626", "weight": 235.37, "body_fat_percentage": 20.47, "lean_mass": 187.69, "fat_mass": 47.67},
        {"date": "031326", "weight": 230.59, "body_fat_percentage": 18.24, "lean_mass": 189.29, "fat_mass": 41.29},
        {"date": "032026", "weight": 225.80, "body_fat_percentage": 15.96, "lean_mass": 190.89, "fat_mass": 34.91},
        {"date": "032726", "weight": 221.01, "body_fat_percentage": 13.61, "lean_mass": 192.48, "fat_mass": 28.53},
    ]

    print("=" * 60)
    print("CHART GENERATION DIAGNOSTIC TEST")
    print("=" * 60)

    # Parse dates
    dates = []
    for d in progression_data:
        try:
            parsed = parse_date(d['date'])
            dates.append(parsed)
            print(f"Parsed '{d['date']}' -> {parsed} (type: {type(parsed).__name__})")
        except Exception as e:
            print(f"ERROR parsing '{d['date']}': {e}")
            dates.append(datetime.datetime.now().date())

    weights = [d['weight'] for d in progression_data]

    print(f"\nDate range: {dates[0]} to {dates[-1]}")
    print(f"Weight range: {min(weights)} to {max(weights)}")
    print(f"Data points: {len(dates)}")

    # Convert to matplotlib date numbers
    print("\nConverting dates to matplotlib numbers...")
    date_nums = mdates.date2num(dates)
    print(f"Date num range: {min(date_nums):.2f} to {max(date_nums):.2f}")
    print(f"Date nums: {[f'{n:.1f}' for n in date_nums]}")

    # Create plot
    print("\nCreating figure...")
    fig, ax = plt.subplots(figsize=(12, 8))

    # Plot with explicit date numbers
    ax.plot(date_nums, weights, marker='o', linewidth=3, markersize=8, label='Weight', color='#2E86AB')

    # Set up date formatting
    ax.xaxis.set_major_formatter(mdates.DateFormatter('%Y-%m-%d'))
    ax.xaxis.set_major_locator(mdates.AutoDateLocator())

    ax.set_title('Weight Progress Over Time (TEST)', fontsize=16, fontweight='bold', pad=20)
    ax.set_xlabel('Date', fontsize=12, fontweight='bold')
    ax.set_ylabel('Weight (lbs)', fontsize=12, fontweight='bold')
    ax.grid(True, alpha=0.3)
    ax.legend(fontsize=12)
    ax.tick_params(axis='x', rotation=45)

    print(f"Plot created. X limits: {ax.get_xlim()}, Y limits: {ax.get_ylim()}")

    # Force draw
    fig.canvas.draw()

    # Save
    output_path = os.path.join(os.path.dirname(__file__), 'results', 'images', 'TEST_weight_chart.png')
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    fig.savefig(output_path, format='png', dpi=100, bbox_inches='tight', facecolor='white')
    plt.close(fig)

    # Check file size
    file_size = os.path.getsize(output_path)
    print(f"\nSaved to: {output_path}")
    print(f"File size: {file_size} bytes")

    if file_size < 10000:
        print("WARNING: File size is small - chart may be blank!")
    else:
        print("SUCCESS: File size indicates chart has data!")

    return output_path

if __name__ == "__main__":
    test_chart()
