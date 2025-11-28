#!/usr/bin/env python3
"""
Simplified test for PRIME Report Generator core functionality.

This test focuses on:
1. Template path verification
2. Basic report generation without AI components
3. Section validation in generated HTML
4. Chart generation testing
"""

import os
import sys
import json
import datetime
import re
from pathlib import Path

# Add the parent directory to Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def create_sample_data():
    """Create sample data for testing."""
    user_data = {
        'name': 'Test User',
        'age': 30,
        'gender': 'Male',
        'height_feet': 6,
        'height_inches': 0,
        'height_cm': 182.88,
        'current_weight': 200.0,
        'current_bf': 20.0,
        'goal_weight': 180.0,
        'goal_bf': 12.0,
        'activity_level': 'Moderately Active',
        'activity_level_description': 'Moderate exercise/sports 3-5 days/week',
        'experience_level': 'Intermediate',
        'workout_type': 'Bodybuilding',
        'workout_days': 4,
        'is_athlete': True,
        'resistance_training': True,
        'ped_use': False,
        'protein_intake': 160,
        'diet_type': 'balanced',
        'sleep_quality': 'good',
    }
    
    # Create simple progression data (12 weeks)
    progression_data = []
    start_date = datetime.datetime.now()
    
    for week in range(13):  # 0-12 weeks
        week_date = start_date + datetime.timedelta(weeks=week)
        weight = 200.0 - (week * 1.5)  # 1.5 lbs per week
        bf_percent = 20.0 - (week * 0.6)  # 0.6% per week
        lean_mass = weight * (1 - bf_percent/100)
        fat_mass = weight - lean_mass
        
        progression_data.append({
            'date': week_date.strftime('%m%d%y'),
            'weight': weight,
            'body_fat_percentage': max(bf_percent, user_data['goal_bf']),
            'lean_mass': lean_mass,
            'fat_mass': fat_mass,
            'rmr': 1800 - (week * 3),
            'tdee': (1800 - (week * 3)) * 1.55,
            'daily_calorie_intake': (1800 - (week * 3)) * 1.55 - 500,
            'weekly_caloric_output': ((1800 - (week * 3)) * 1.55 - 500) * 7,
            'total_weight_lost': week * 1.5,
            'muscle_gain': max(0, week * 0.1),
            'week': week
        })
    
    return user_data, progression_data

def test_template_exists():
    """Test if template file exists."""
    template_path = os.path.join(
        os.path.dirname(os.path.dirname(__file__)),
        'templates',
        'report_template.html'
    )
    
    print(f"🔍 Checking template at: {template_path}")
    
    if os.path.exists(template_path):
        print("✅ Template file found")
        return True
    else:
        print("❌ Template file not found")
        return False

def test_basic_report_generation():
    """Test basic report generation functionality."""
    print("🔍 Testing basic report generation...")
    
    try:
        # Import required modules step by step
        print("  📦 Importing matplotlib...")
        import matplotlib
        matplotlib.use('Agg')  # Set headless backend
        import matplotlib.pyplot as plt
        
        print("  📦 Importing other dependencies...")
        import numpy as np
        import pandas as pd
        from jinja2 import Template
        
        print("  📊 Creating sample charts...")
        # Create a simple chart to test functionality
        fig, ax = plt.subplots(figsize=(10, 6))
        weeks = list(range(13))
        weights = [200 - (w * 1.5) for w in weeks]
        ax.plot(weeks, weights, marker='o')
        ax.set_title('Weight Progress')
        ax.set_xlabel('Week')
        ax.set_ylabel('Weight (lbs)')
        
        # Save chart to test output
        test_output_dir = os.path.join(os.path.dirname(__file__), "test_output")
        os.makedirs(test_output_dir, exist_ok=True)
        
        chart_path = os.path.join(test_output_dir, "test_chart.png")
        plt.savefig(chart_path, dpi=100, bbox_inches='tight')
        plt.close()
        
        if os.path.exists(chart_path):
            print("✅ Chart generation successful")
        else:
            print("❌ Chart generation failed")
            return False
        
        print("  🌐 Testing template rendering...")
        # Test basic template functionality
        template_path = os.path.join(
            os.path.dirname(os.path.dirname(__file__)),
            'templates',
            'report_template.html'
        )
        
        if not os.path.exists(template_path):
            print("❌ Template file not found for rendering test")
            return False
        
        # Read template and test basic substitution
        with open(template_path, 'r', encoding='utf-8') as f:
            template_content = f.read()
        
        template = Template(template_content)
        
        # Create minimal test data
        test_context = {
            'name': 'Test User',
            'report_date': datetime.datetime.now().strftime('%B %d, %Y'),
            'age': 30,
            'gender': 'Male',
            'height': "6'0\"",
            'current_weight': '200.0',
            'current_bf': '20.0',
            'goal_weight': '180.0',
            'goal_bf': '12.0',
            'activity_level': 'Moderately Active',
            'experience_level': 'Intermediate',
            'workout_type': 'Bodybuilding',
            'workout_days': 4,
            'is_athlete': 'Yes',
            'resistance_training': 'Yes',
            'ped_use': 'No',
            'protein_intake': 160,
            'diet_type': 'Balanced',
            'sleep_quality': 'Good',
            'input_parameters': [],
            'input_analysis': {
                'anthropometric_reliability': 85.0,
                'activity_reliability': 80.0,
                'goal_reliability': 75.0,
                'data_completeness': 90.0
            },
            'confidence_analysis': None,
            'charts': {'weight_progress_chart': '', 'body_composition_chart': ''},
            'progression_data': []
        }
        
        # Test template rendering
        try:
            html_content = template.render(**test_context)
            print("✅ Template rendering successful")
            
            # Save test HTML
            html_path = os.path.join(test_output_dir, "test_report.html")
            with open(html_path, 'w', encoding='utf-8') as f:
                f.write(html_content)
            
            print(f"  💾 Test HTML saved to: {html_path}")
            return True
            
        except Exception as e:
            print(f"❌ Template rendering failed: {e}")
            return False
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

def test_html_sections():
    """Test if generated HTML contains expected sections."""
    print("🔍 Testing HTML sections...")
    
    html_path = os.path.join(os.path.dirname(__file__), "test_output", "test_report.html")
    
    if not os.path.exists(html_path):
        print("❌ Test HTML file not found")
        return False
    
    try:
        with open(html_path, 'r', encoding='utf-8') as f:
            html_content = f.read()
        
        # Expected sections (subset of the full template)
        expected_sections = [
            "1. Current Profile",
            "2. Target Goals",
            "3. Current Activity Profile", 
            "4. Current Metabolic Profile",
            "Additional Lifestyle Factors",
            "12. Input Parameter Analysis"
        ]
        
        sections_found = []
        sections_missing = []
        
        for section in expected_sections:
            if section in html_content:
                sections_found.append(section)
            else:
                sections_missing.append(section)
        
        print(f"  ✅ Sections found: {len(sections_found)}/{len(expected_sections)}")
        
        if sections_missing:
            print("  ⚠️  Missing sections:")
            for section in sections_missing:
                print(f"    - {section}")
        
        return len(sections_missing) == 0
        
    except Exception as e:
        print(f"❌ Error checking HTML sections: {e}")
        return False

def main():
    """Run the simplified test suite."""
    print("🚀 PRIME Report Generator - Simplified Test")
    print("=" * 50)
    
    tests_passed = 0
    tests_total = 0
    
    # Test 1: Template exists
    tests_total += 1
    if test_template_exists():
        tests_passed += 1
    
    # Test 2: Basic report generation
    tests_total += 1  
    if test_basic_report_generation():
        tests_passed += 1
    
    # Test 3: HTML sections
    tests_total += 1
    if test_html_sections():
        tests_passed += 1
    
    # Summary
    print("\n" + "=" * 50)
    print("📋 TEST SUMMARY")
    print("=" * 50)
    print(f"Tests Passed: {tests_passed}/{tests_total}")
    print(f"Pass Rate: {tests_passed/tests_total*100:.1f}%")
    
    if tests_passed == tests_total:
        print("\n🎉 ALL TESTS PASSED!")
        print("✅ Basic PRIME Report functionality is working!")
        return True
    else:
        print(f"\n⚠️  {tests_total - tests_passed} TEST(S) FAILED")
        print("❌ Some issues need to be addressed.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)