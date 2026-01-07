import unittest
import os
import shutil
import sys
from unittest.mock import MagicMock, patch

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..')))

# Mock seaborn before importing module to avoid hang
sys.modules['seaborn'] = MagicMock()

# Import the new function name
from new_prime_python_code.PRIME_Report_Generator_v3 import generate_prime_report_terminal_fast

class TestReportGenerator(unittest.TestCase):
    def setUp(self):
        self.test_dir = 'test_results_unit'
        if os.path.exists(self.test_dir):
            shutil.rmtree(self.test_dir)
        os.makedirs(self.test_dir)

    def tearDown(self):
        if os.path.exists(self.test_dir):
            shutil.rmtree(self.test_dir)

    @patch('new_prime_python_code.PRIME_Report_Generator_v3.plt')
    @patch('new_prime_python_code.PRIME_Report_Generator_v3.create_ai_analyzer_sync')
    def test_generate_report_creates_pngs_and_links(self, mock_create_analyzer, mock_plt):
        # Mock data
        user_data = {
            'name': 'Test User', 
            'current_weight': 200, 
            'goal_weight': 180,
            'height_feet': 5,
            'height_inches': 10,
            'age': 30,
            'gender': 'Male',
            'activity_level_description': 'Moderate',
            'experience_level': 'Intermediate',
            'workout_type': 'Bodybuilding',
            'workout_days': 4
        }
        progression_data = [
            {'week_number': 0, 'date': '010123', 'weight': 200, 'body_fat_percentage': 20, 'lean_mass': 160, 'fat_mass': 40, 'rmr': 2000, 'tdee': 2500, 'daily_calorie_intake': 2000, 'weekly_caloric_output': 17500, 'total_weight_lost': 0, 'muscle_gain': 0},
            {'week_number': 1, 'date': '010823', 'weight': 198, 'body_fat_percentage': 19.5, 'lean_mass': 160.5, 'fat_mass': 37.5, 'rmr': 1990, 'tdee': 2490, 'daily_calorie_intake': 2000, 'weekly_caloric_output': 17500, 'total_weight_lost': 2, 'muscle_gain': 0.5}
        ]

        # Configure mock analyzer
        mock_analyzer_instance = MagicMock()
        mock_create_analyzer.return_value = mock_analyzer_instance
        
        mock_analyzer_instance.analyze_input_parameters.return_value = {
            'anthropometric_reliability': 90,
            'activity_reliability': 90,
            'goal_reliability': 90,
            'data_completeness': 100
        }
        # Mock async method
        async def mock_generate(*args, **kwargs):
            mock_result = MagicMock()
            mock_result.overall_score = 85.0
            mock_result.input_reliability = 90.0
            mock_result.calculation_accuracy = 95.0
            mock_result.goal_feasibility = 80.0
            mock_result.overall_confidence_explanation = "Good plan"
            mock_result.input_reliability_explanation = "Reliable inputs"
            mock_result.calculation_accuracy_explanation = "Accurate calcs"
            mock_result.goal_feasibility_explanation = "Feasible goal"
            mock_result.warnings = []
            mock_result.suggestions = []
            mock_result.confidence_factors = {}
            mock_result.detailed_analysis = "Detailed analysis"
            return mock_result
        
        mock_analyzer_instance.generate_ai_confidence_analysis.side_effect = mock_generate
        
        # Configure mock_plt.subplots
        mock_fig = MagicMock()
        mock_ax = MagicMock()
        
        def subplots_side_effect(*args, **kwargs):
            # Check if nrows=2 (either as first arg or kwarg)
            nrows = kwargs.get('nrows', 1)
            if args and len(args) > 0:
                nrows = args[0]
            
            if nrows == 2:
                return mock_fig, (mock_ax, mock_ax)
            return mock_fig, mock_ax
            
        mock_plt.subplots.side_effect = subplots_side_effect
        
        mock_ax.twinx.return_value = mock_ax
        
        # Configure legend handles
        mock_ax.get_legend_handles_labels.return_value = ([], [])

        # Run generator
        md_path, pdf_path = generate_prime_report_terminal_fast(user_data, progression_data, self.test_dir)

        # Verify images directory created
        self.assertTrue(os.path.exists(os.path.join(self.test_dir, 'images')))
        
        # Verify plt.savefig calls
        self.assertTrue(mock_plt.savefig.called)
        
        # Verify Markdown content
        with open(md_path, 'r', encoding='utf-8') as f:
            content = f.read()
            # Check for image links with images/ prefix
            self.assertRegex(content, r'!\[Weight Progress\]\(images/weight_progress_.*\.png\)')
            self.assertRegex(content, r'!\[Body Composition\]\(images/body_composition_.*\.png\)')

        # Verify HTML content
        html_files = [f for f in os.listdir(self.test_dir) if f.endswith('.html')]
        self.assertTrue(len(html_files) > 0)
        with open(os.path.join(self.test_dir, html_files[0]), 'r', encoding='utf-8') as f:
            html_content = f.read()
            # HTML still uses base64, so we check for that
            self.assertIn('data:image/png;base64,', html_content)

if __name__ == '__main__':
    unittest.main()
