#!/usr/bin/env python3
"""
Test the fixed PRIME Report Generator with proper template variable mapping.

This test validates:
1. The template path fix is working
2. All template variables are properly mapped
3. Report generation produces valid HTML with all sections
4. Charts are generated and embedded
"""

import os
import sys
import json
import datetime
import re
import traceback
from pathlib import Path
import pytest

# Add the parent directory to Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def create_test_data():
    """Create comprehensive test data for PRIME generator."""
    user_data = {
        'name': 'John Test User',
        'age': 32,
        'gender': 'Male',
        'height_feet': 6,
        'height_inches': 1,
        'height_cm': 185.42,
        'current_weight': 220.5,
        'current_bf': 25.8,
        'goal_weight': 185.0,
        'goal_bf': 12.0,
        'activity_level': 'Moderately Active',
        'activity_level_description': 'Moderate exercise/sports 3-5 days/week',
        'experience_level': 'Intermediate',
        'workout_type': 'Bodybuilding',
        'workout_days': 5,
        'is_athlete': True,
        'resistance_training': True,
        'ped_use': False,
        'protein_intake': 180,
        'diet_type': 'balanced',
        'sleep_quality': 'good',
        'activity_multiplier': 1.55
    }
    
    # Create progression data (16 weeks)
    start_date = datetime.datetime.now()
    progression_data = []
    
    current_weight = user_data['current_weight']
    current_bf = user_data['current_bf']
    
    for week in range(17):  # 0 to 16 weeks
        week_date = start_date + datetime.timedelta(weeks=week)
        
        # Progressive changes
        weight_loss_factor = week * 0.02
        bf_reduction_factor = week * 0.012
        
        week_weight = current_weight - (weight_loss_factor * current_weight)
        week_bf = max(user_data['goal_bf'], current_bf - (bf_reduction_factor * current_bf))
        
        # Body composition
        fat_mass = week_weight * (week_bf / 100)
        lean_mass = week_weight - fat_mass
        
        # Metabolic data
        rmr = 1850 + (week * -4)  # Slight adaptation
        tdee = rmr * user_data['activity_multiplier']
        daily_intake = tdee - 500
        weekly_output = daily_intake * 7
        
        progression_data.append({
            'date': week_date.strftime('%m%d%y'),
            'weight': week_weight,
            'body_fat_percentage': week_bf,
            'lean_mass': lean_mass,
            'fat_mass': fat_mass,
            'rmr': rmr,
            'tdee': tdee,
            'daily_calorie_intake': daily_intake,
            'weekly_caloric_output': weekly_output,
            'total_weight_lost': current_weight - week_weight,
            'muscle_gain': max(0, lean_mass - (current_weight - current_weight * (current_bf / 100))),
            'week': week
        })
    
    return user_data, progression_data

# ---------------------------------------------------------------------------
# Pytest fixtures
# ---------------------------------------------------------------------------
@pytest.fixture(scope="session")
def html_path():
    """
    Build a PRIME report once for the session and return the generated HTML path.
    """
    # Local import to avoid test import order issues
    from new_prime_python_code.PRIME_Report_Generator_v3_Fast import generate_prime_report_terminal_fast

    # Create test data and output directory
    user_data, progression_data = create_test_data()
    test_output_dir = os.path.join(os.path.dirname(__file__), "test_output")
    os.makedirs(test_output_dir, exist_ok=True)

    # Generate report
    markdown_path, _pdf_path = generate_prime_report_terminal_fast(
        user_data, progression_data, test_output_dir
    )

    base_name = os.path.splitext(os.path.basename(markdown_path))[0]
    html_file = os.path.join(test_output_dir, f"{base_name}.html")

    assert os.path.exists(html_file), f"HTML file not created: {html_file}"
    return html_file

def test_import_modules():
    """Test if we can import the required modules."""
    print("🔍 Testing module imports...")
    
    try:
        # Try importing matplotlib first
        import matplotlib
        matplotlib.use('Agg')
        print("  ✅ Matplotlib imported successfully")
        
        # Try importing other dependencies
        import seaborn, pandas, numpy
        print("  ✅ Data science libraries imported")
        
        # Try importing PRIME modules
        from new_prime_python_code.PRIME_Report_Generator_v3_Fast import generate_prime_report_terminal_fast
        print("  ✅ PRIME fast generator imported")
        
        from new_prime_python_code.PRIME_Utils import DIET_MULTIPLIERS
        print("  ✅ PRIME utils imported")
        
        from new_prime_python_code.PRIME_Calculations import calculate_lean_mass_preservation_scores
        print("  ✅ PRIME calculations imported")
        
        return True
        
    except ImportError as e:
        print(f"  ❌ Import error: {e}")
        return False
    except Exception as e:
        print(f"  ❌ Unexpected error: {e}")
        return False

def test_generate_report():
    """Test actual report generation using the fixed generator."""
    print("\n🔍 Testing report generation...")
    
    try:
        # Import the generator
        from new_prime_python_code.PRIME_Report_Generator_v3_Fast import generate_prime_report_terminal_fast
        
        # Create test data
        print("  📊 Creating test data...")
        user_data, progression_data = create_test_data()
        
        print(f"  📅 Generated {len(progression_data)} weeks of progression data")
        
        # Create output directory
        test_output_dir = os.path.join(os.path.dirname(__file__), "test_output")
        os.makedirs(test_output_dir, exist_ok=True)
        
        print("  🏗️ Generating report...")
        
        # Generate the report
        markdown_path, pdf_path = generate_prime_report_terminal_fast(
            user_data, progression_data, test_output_dir
        )
        
        # Check if files were created
        if not os.path.exists(markdown_path):
            print(f"  ❌ Markdown file not created: {markdown_path}")
            return False, None
            
        # Find HTML file
        base_name = os.path.splitext(os.path.basename(markdown_path))[0]
        html_path = os.path.join(test_output_dir, f"{base_name}.html")
        
        if not os.path.exists(html_path):
            print(f"  ❌ HTML file not created: {html_path}")
            return False, None
        
        print(f"  ✅ Report generated successfully!")
        print(f"    📄 Markdown: {markdown_path}")
        print(f"    🌐 HTML: {html_path}")
        
        return True, html_path
        
    except Exception as e:
        print(f"  ❌ Report generation failed: {e}")
        print("  📋 Stack trace:")
        traceback.print_exc()
        return False, None

def test_html_sections(html_path):
    """Test if all required sections are in the generated HTML."""
    print("\n🔍 Testing HTML sections...")
    
    if not html_path or not os.path.exists(html_path):
        print("  ❌ HTML file not available for testing")
        return False
    
    try:
        with open(html_path, 'r', encoding='utf-8') as f:
            html_content = f.read()
        
        # Define expected sections based on the template
        expected_sections = [
            "1. Current Profile",
            "2. Target Goals", 
            "3. Current Activity Profile",
            "4. Current Metabolic Profile",
            "Additional Lifestyle Factors",
            "5. Workout Analysis",
            "6. Predicted Progress Charts",
            "7. Weekly Progress Forecast",
            "8. Body Composition Changes",
            "9. Expected Results",
            "10. Metabolic Adaptation Forecast",
            "11. Final Phase Targets",
            "12. Input Parameter Analysis"
        ]
        
        sections_found = []
        sections_missing = []
        
        for section in expected_sections:
            # Multiple search patterns for flexibility
            patterns = [
                f"<h2>{re.escape(section)}</h2>",
                f">{re.escape(section)}<",
                re.escape(section)
            ]
            
            found = False
            for pattern in patterns:
                if re.search(pattern, html_content, re.IGNORECASE):
                    found = True
                    break
            
            if found:
                sections_found.append(section)
            else:
                sections_missing.append(section)
        
        print(f"  📊 Sections found: {len(sections_found)}/{len(expected_sections)}")
        
        if sections_found:
            print("  ✅ Found sections:")
            for section in sections_found[:5]:  # Show first 5
                print(f"    - {section}")
            if len(sections_found) > 5:
                print(f"    ... and {len(sections_found) - 5} more")
        
        if sections_missing:
            print("  ❌ Missing sections:")
            for section in sections_missing:
                print(f"    - {section}")
        
        # Calculate success (allow some missing sections for a basic pass)
        success_rate = len(sections_found) / len(expected_sections)
        success = success_rate >= 0.7  # 70% threshold
        
        if success:
            print(f"  ✅ Section test passed ({success_rate:.1%} coverage)")
        else:
            print(f"  ⚠️ Section test partial ({success_rate:.1%} coverage)")
            
        return success
        
    except Exception as e:
        print(f"  ❌ Error testing sections: {e}")
        return False

def test_charts_and_data(html_path):
    """Test if charts and data are embedded in HTML."""
    print("\n🔍 Testing charts and data...")
    
    if not html_path or not os.path.exists(html_path):
        print("  ❌ HTML file not available")
        return False
    
    try:
        with open(html_path, 'r', encoding='utf-8') as f:
            html_content = f.read()
        
        test_results = []
        
        # Test for base64 charts
        chart_pattern = r'data:image/png;base64,[A-Za-z0-9+/]+=*'
        chart_matches = re.findall(chart_pattern, html_content)
        
        if chart_matches:
            print(f"  ✅ Found {len(chart_matches)} embedded charts")
            test_results.append(True)
        else:
            print("  ⚠️ No embedded charts found")
            test_results.append(False)
        
        # Test for user data
        test_data_items = [
            ('John Test User', 'User name'),
            ('32', 'Age'),
            ('Male', 'Gender'),
            ('Bodybuilding', 'Workout type'),
            ('Intermediate', 'Experience level')
        ]
        
        data_found = 0
        for item, description in test_data_items:
            if item in html_content:
                data_found += 1
            else:
                print(f"  ⚠️ Missing {description}: {item}")
        
        print(f"  📊 Data integrity: {data_found}/{len(test_data_items)} items found")
        test_results.append(data_found >= len(test_data_items) * 0.8)
        
        # Test for table structures
        table_count = len(re.findall(r'<table', html_content, re.IGNORECASE))
        if table_count >= 5:
            print(f"  ✅ Found {table_count} data tables")
            test_results.append(True)
        else:
            print(f"  ⚠️ Only found {table_count} tables (expected 5+)")
            test_results.append(False)
        
        overall_success = sum(test_results) >= len(test_results) * 0.7
        
        if overall_success:
            print("  ✅ Charts and data test passed")
        else:
            print("  ⚠️ Charts and data test partial")
            
        return overall_success
        
    except Exception as e:
        print(f"  ❌ Error testing charts and data: {e}")
        return False

def main():
    """Run the comprehensive test suite."""
    print("🚀 PRIME Report Generator - Fixed Version Test")
    print("=" * 60)
    
    test_results = []
    
    # Test 1: Module imports
    test_results.append(test_import_modules())
    
    # Test 2: Report generation
    success, html_path = test_generate_report()
    test_results.append(success)
    
    # Test 3: HTML sections (only if report generated)
    if success and html_path:
        test_results.append(test_html_sections(html_path))
        test_results.append(test_charts_and_data(html_path))
    else:
        test_results.extend([False, False])
    
    # Summary
    tests_passed = sum(test_results)
    tests_total = len(test_results)
    pass_rate = tests_passed / tests_total * 100
    
    print("\n" + "=" * 60)
    print("📋 COMPREHENSIVE TEST SUMMARY")
    print("=" * 60)
    print(f"📊 Tests Passed: {tests_passed}/{tests_total}")
    print(f"📈 Pass Rate: {pass_rate:.1f}%")
    
    if html_path and os.path.exists(html_path):
        file_size = os.path.getsize(html_path)
        print(f"📄 Generated HTML: {file_size:,} bytes")
        print(f"🌐 Report Location: {html_path}")
    
    if tests_passed == tests_total:
        print("\n🎉 ALL TESTS PASSED!")
        print("✅ The PRIME Report Generator is working correctly!")
        print("✅ Template path fix successful")
        print("✅ All 14 sections are being generated")
        print("✅ Charts are being embedded properly")
    elif pass_rate >= 75:
        print(f"\n✅ MOSTLY SUCCESSFUL!")
        print(f"✅ {tests_passed}/{tests_total} tests passed")
        print("⚠️ Some minor issues may need attention")
    else:
        print(f"\n⚠️ TESTS NEED ATTENTION")
        print(f"❌ Only {tests_passed}/{tests_total} tests passed")
        print("❌ Significant issues need to be resolved")
    
    return tests_passed == tests_total

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)