#!/usr/bin/env python3
"""
Comprehensive test script to validate PRIME Report Generator functionality.

This test validates:
1. Complete sample user data creation
2. Report generation using the fixed generator
3. All 14 required sections are present in HTML output
4. Template path fix is working correctly
5. Charts are being generated and embedded properly
"""

import os
import sys
import json
import datetime
import re
from pathlib import Path

# Add the parent directory to Python path to import modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import the PRIME modules
try:
    # Add necessary stub functions to avoid import errors
    import types
    
    # Create a mock module to avoid anthropic dependency issues
    mock_ai = types.ModuleType('mock_ai')
    mock_ai.AIConfidenceAnalyzer = None
    mock_ai.ConfidenceScore = None
    sys.modules['anthropic'] = types.ModuleType('anthropic')
    
    from new_prime_python_code.PRIME_Report_Generator_v3_Fast import generate_prime_report_terminal_fast
    from new_prime_python_code.PRIME_Utils import DIET_MULTIPLIERS, EXERCISE_ADJUSTMENTS
    from new_prime_python_code.PRIME_Calculations import calculate_lean_mass_preservation_scores
except ImportError as e:
    print(f"ERROR: Failed to import PRIME modules: {e}")
    print("This might be due to missing dependencies. The test will continue without AI analysis features.")
    print(f"Specific error: {e}")
    sys.exit(1)

class PRIMEReportTester:
    """Test class for PRIME Report Generator validation."""
    
    def __init__(self):
        self.test_results = {
            'test_name': 'PRIME Report Generator Comprehensive Test',
            'timestamp': datetime.datetime.now().isoformat(),
            'passed_tests': 0,
            'failed_tests': 0,
            'sections_found': [],
            'sections_missing': [],
            'errors': []
        }
        
        # Expected sections from the template
        self.expected_sections = [
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
            "12. Input Parameter Analysis",
            "13. Comprehensive Parameter Reference Guide",
            "14. Comprehensive Reference Guide"  # This could be numbered 13 or 14 depending on AI analysis
        ]
    
    def create_comprehensive_sample_data(self):
        """Create comprehensive sample user data with all required parameters."""
        
        # Create user profile data
        user_data = {
            'name': 'John Doe Test User',
            'age': 32,
            'gender': 'Male',
            'height_feet': 6,
            'height_inches': 1,
            'height_cm': 185.42,
            'current_weight': 220.5,
            'current_bf': 25.8,
            'goal_weight': 185.0,
            'goal_bf': 12.0,
            
            # Activity and training data
            'activity_level': 'Moderately Active',
            'activity_level_description': 'Moderate exercise/sports 3-5 days/week',
            'experience_level': 'Intermediate',
            'workout_type': 'Bodybuilding',
            'workout_days': 5,
            'is_athlete': True,
            'resistance_training': True,
            'ped_use': False,
            
            # Nutrition and lifestyle
            'protein_intake': 180,
            'diet_type': 'balanced',
            'sleep_quality': 'good',
            
            # Calculated values that would normally come from other calculations
            'activity_multiplier': 1.55
        }
        
        # Create progression data (simulating 20 weeks)
        start_date = datetime.datetime.now()
        progression_data = []
        
        # Initial values
        current_weight = user_data['current_weight']
        current_bf = user_data['current_bf']
        
        for week in range(21):  # 0 to 20 weeks
            week_date = start_date + datetime.timedelta(weeks=week)
            
            # Simulate progressive weight loss and body composition changes
            weight_loss_factor = week * 0.025  # Gradual weight loss
            bf_reduction_factor = week * 0.015  # Gradual BF reduction
            
            current_week_weight = current_weight - (weight_loss_factor * current_weight)
            current_week_bf = max(user_data['goal_bf'], current_bf - (bf_reduction_factor * current_bf))
            
            # Calculate body composition
            current_fat_mass = current_week_weight * (current_week_bf / 100)
            current_lean_mass = current_week_weight - current_fat_mass
            
            # Simulate metabolic calculations
            base_rmr = 1800 + (week * -5)  # Slight metabolic adaptation
            tdee = base_rmr * user_data['activity_multiplier']
            daily_intake = tdee - 500  # 500 cal deficit
            weekly_output = daily_intake * 7
            
            progression_data.append({
                'date': week_date.strftime('%m%d%y'),
                'weight': current_week_weight,
                'body_fat_percentage': current_week_bf,
                'lean_mass': current_lean_mass,
                'fat_mass': current_fat_mass,
                'rmr': base_rmr,
                'tdee': tdee,
                'daily_calorie_intake': daily_intake,
                'weekly_caloric_output': weekly_output,
                'total_weight_lost': current_weight - current_week_weight,
                'muscle_gain': max(0, (current_lean_mass - (user_data['current_weight'] - user_data['current_weight'] * (user_data['current_bf'] / 100)))),
                'week': week
            })
        
        return user_data, progression_data
    
    def run_test(self, test_name, test_func, *args, **kwargs):
        """Run a single test and track results."""
        try:
            print(f"\n🔍 Running: {test_name}")
            result = test_func(*args, **kwargs)
            if result:
                print(f"✅ PASSED: {test_name}")
                self.test_results['passed_tests'] += 1
                return True
            else:
                print(f"❌ FAILED: {test_name}")
                self.test_results['failed_tests'] += 1
                return False
        except Exception as e:
            error_msg = f"{test_name}: {str(e)}"
            print(f"💥 ERROR: {error_msg}")
            self.test_results['errors'].append(error_msg)
            self.test_results['failed_tests'] += 1
            return False
    
    def test_sample_data_creation(self, user_data, progression_data):
        """Test if sample data was created correctly."""
        
        # Check user data completeness
        required_fields = ['name', 'age', 'gender', 'height_feet', 'height_inches', 
                          'current_weight', 'current_bf', 'goal_weight', 'goal_bf',
                          'activity_level', 'experience_level', 'workout_type', 'workout_days']
        
        for field in required_fields:
            if field not in user_data or user_data[field] is None:
                print(f"❌ Missing required field: {field}")
                return False
        
        # Check progression data
        if not progression_data or len(progression_data) < 10:
            print(f"❌ Insufficient progression data: {len(progression_data)} weeks")
            return False
            
        # Check progression data structure
        first_week = progression_data[0]
        required_prog_fields = ['date', 'weight', 'body_fat_percentage', 'lean_mass', 
                               'fat_mass', 'tdee', 'daily_calorie_intake']
        
        for field in required_prog_fields:
            if field not in first_week:
                print(f"❌ Missing progression field: {field}")
                return False
        
        print(f"✅ Sample data created: {len(progression_data)} weeks of progression")
        return True
    
    def test_template_path_exists(self):
        """Test if the template file exists at the expected path."""
        # Get the template path as used in the generator
        template_path = os.path.join(
            os.path.dirname(os.path.dirname(__file__)), 
            'templates', 
            'report_template.html'
        )
        
        exists = os.path.exists(template_path)
        if exists:
            print(f"✅ Template found at: {template_path}")
        else:
            print(f"❌ Template not found at: {template_path}")
            
        return exists
    
    def test_css_file_exists(self):
        """Test if the CSS file exists."""
        css_path = os.path.join(
            os.path.dirname(os.path.dirname(__file__)), 
            'styles', 
            'report_style.css'
        )
        
        exists = os.path.exists(css_path)
        if exists:
            print(f"✅ CSS file found at: {css_path}")
        else:
            print(f"❌ CSS file not found at: {css_path}")
            
        return exists
    
    def test_report_generation(self, user_data, progression_data):
        """Test the actual report generation."""
        
        # Create output directory for test
        test_output_dir = os.path.join(os.path.dirname(__file__), "test_output")
        os.makedirs(test_output_dir, exist_ok=True)
        
        try:
            # Generate the report
            markdown_path, pdf_path = generate_prime_report_terminal_fast(
                user_data, progression_data, test_output_dir
            )
            
            # Check if files were created
            if not os.path.exists(markdown_path):
                print(f"❌ Markdown file not created: {markdown_path}")
                return False
                
            # Find the HTML file (should be in same directory with same base name)
            base_name = os.path.splitext(os.path.basename(markdown_path))[0]
            html_path = os.path.join(test_output_dir, f"{base_name}.html")
            
            if not os.path.exists(html_path):
                print(f"❌ HTML file not created: {html_path}")
                return False
            
            print(f"✅ Report files created:")
            print(f"   📄 Markdown: {markdown_path}")
            print(f"   🌐 HTML: {html_path}")
            
            # Store HTML path for further testing
            self.html_path = html_path
            return True
            
        except Exception as e:
            print(f"❌ Report generation failed: {str(e)}")
            raise e
    
    def test_html_sections(self):
        """Test if all required sections are present in the HTML output."""
        
        if not hasattr(self, 'html_path'):
            print("❌ No HTML path available for testing")
            return False
            
        try:
            with open(self.html_path, 'r', encoding='utf-8') as f:
                html_content = f.read()
                
            # Check for each expected section
            sections_found = []
            sections_missing = []
            
            for section in self.expected_sections:
                # Look for section headers in HTML
                section_patterns = [
                    f"<h2>{section}</h2>",
                    f"<h2>{re.escape(section)}</h2>",
                    f">{section}<",
                    f">{re.escape(section)}<"
                ]
                
                found = False
                for pattern in section_patterns:
                    if re.search(pattern, html_content, re.IGNORECASE):
                        found = True
                        break
                
                if found:
                    sections_found.append(section)
                else:
                    sections_missing.append(section)
            
            # Update test results
            self.test_results['sections_found'] = sections_found
            self.test_results['sections_missing'] = sections_missing
            
            print(f"✅ Sections found: {len(sections_found)}/{len(self.expected_sections)}")
            
            if sections_missing:
                print("❌ Missing sections:")
                for section in sections_missing:
                    print(f"   - {section}")
                return False
            else:
                print("✅ All expected sections found!")
                return True
                
        except Exception as e:
            print(f"❌ Error reading HTML file: {str(e)}")
            return False
    
    def test_chart_generation(self):
        """Test if charts are generated and embedded in HTML."""
        
        if not hasattr(self, 'html_path'):
            print("❌ No HTML path available for testing")
            return False
            
        try:
            with open(self.html_path, 'r', encoding='utf-8') as f:
                html_content = f.read()
            
            # Look for base64 encoded chart data
            chart_patterns = [
                r'data:image/png;base64,[A-Za-z0-9+/]+=*',
                r'<img[^>]+src="data:image/png;base64'
            ]
            
            charts_found = 0
            for pattern in chart_patterns:
                matches = re.findall(pattern, html_content)
                charts_found += len(matches)
            
            if charts_found > 0:
                print(f"✅ Charts found: {charts_found} chart references")
                return True
            else:
                print("❌ No charts found in HTML content")
                return False
                
        except Exception as e:
            print(f"❌ Error checking charts: {str(e)}")
            return False
    
    def test_data_integrity(self, user_data, progression_data):
        """Test if user data appears correctly in the generated HTML."""
        
        if not hasattr(self, 'html_path'):
            print("❌ No HTML path available for testing")
            return False
            
        try:
            with open(self.html_path, 'r', encoding='utf-8') as f:
                html_content = f.read()
            
            # Check for key data points
            checks = [
                (user_data['name'], "User name"),
                (str(user_data['age']), "User age"),
                (user_data['gender'], "User gender"),
                (user_data['workout_type'], "Workout type"),
                (str(user_data['workout_days']), "Workout days")
            ]
            
            failed_checks = []
            for value, description in checks:
                if value not in html_content:
                    failed_checks.append(f"{description}: {value}")
            
            if failed_checks:
                print("❌ Data integrity check failed:")
                for check in failed_checks:
                    print(f"   - {check}")
                return False
            else:
                print("✅ Data integrity verified - all key data points found")
                return True
                
        except Exception as e:
            print(f"❌ Error checking data integrity: {str(e)}")
            return False
    
    def run_comprehensive_test(self):
        """Run the complete test suite."""
        print("🚀 Starting PRIME Report Generator Comprehensive Test")
        print("=" * 60)
        
        # Test 1: Create sample data
        print("\n📊 Creating comprehensive sample data...")
        user_data, progression_data = self.create_comprehensive_sample_data()
        
        # Test 2: Validate sample data
        self.run_test("Sample Data Creation", self.test_sample_data_creation, user_data, progression_data)
        
        # Test 3: Check template path
        self.run_test("Template File Exists", self.test_template_path_exists)
        
        # Test 4: Check CSS file
        self.run_test("CSS File Exists", self.test_css_file_exists)
        
        # Test 5: Generate report
        self.run_test("Report Generation", self.test_report_generation, user_data, progression_data)
        
        # Test 6: Validate HTML sections
        self.run_test("HTML Sections Validation", self.test_html_sections)
        
        # Test 7: Chart generation
        self.run_test("Chart Generation", self.test_chart_generation)
        
        # Test 8: Data integrity
        self.run_test("Data Integrity", self.test_data_integrity, user_data, progression_data)
        
        return self.generate_test_report()
    
    def generate_test_report(self):
        """Generate and display the final test report."""
        print("\n" + "=" * 60)
        print("📋 COMPREHENSIVE TEST REPORT")
        print("=" * 60)
        
        total_tests = self.test_results['passed_tests'] + self.test_results['failed_tests']
        pass_rate = (self.test_results['passed_tests'] / total_tests * 100) if total_tests > 0 else 0
        
        print(f"📊 Test Summary:")
        print(f"   Total Tests: {total_tests}")
        print(f"   ✅ Passed: {self.test_results['passed_tests']}")
        print(f"   ❌ Failed: {self.test_results['failed_tests']}")
        print(f"   📈 Pass Rate: {pass_rate:.1f}%")
        
        if self.test_results['sections_found']:
            print(f"\n✅ Sections Found ({len(self.test_results['sections_found'])}):")
            for section in self.test_results['sections_found']:
                print(f"   - {section}")
        
        if self.test_results['sections_missing']:
            print(f"\n❌ Sections Missing ({len(self.test_results['sections_missing'])}):")
            for section in self.test_results['sections_missing']:
                print(f"   - {section}")
        
        if self.test_results['errors']:
            print(f"\n💥 Errors Encountered:")
            for error in self.test_results['errors']:
                print(f"   - {error}")
        
        # Save detailed report to file
        test_output_dir = os.path.join(os.path.dirname(__file__), "test_output")
        report_path = os.path.join(test_output_dir, "test_report.json")
        os.makedirs(test_output_dir, exist_ok=True)
        
        with open(report_path, 'w') as f:
            json.dump(self.test_results, f, indent=2)
        
        print(f"\n📄 Detailed report saved to: {report_path}")
        
        # Determine overall result
        overall_success = (self.test_results['failed_tests'] == 0 and 
                          len(self.test_results['sections_missing']) == 0)
        
        if overall_success:
            print("\n🎉 OVERALL RESULT: ALL TESTS PASSED!")
            print("✅ The PRIME Report Generator is working correctly!")
        else:
            print("\n⚠️  OVERALL RESULT: SOME TESTS FAILED")
            print("❌ The PRIME Report Generator needs attention.")
        
        return overall_success

def main():
    """Main function to run the comprehensive test."""
    try:
        # Initialize tester
        tester = PRIMEReportTester()
        
        # Run comprehensive test
        success = tester.run_comprehensive_test()
        
        # Exit with appropriate code
        sys.exit(0 if success else 1)
        
    except Exception as e:
        print(f"\n💥 CRITICAL ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(2)

if __name__ == "__main__":
    main()