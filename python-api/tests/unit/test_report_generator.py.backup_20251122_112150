import unittest
import os
import shutil
import sys
from unittest.mock import MagicMock, patch

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..')))

from new_prime_python_code.PRIME_Report_Generator_v3 import generate_prime_report_terminal

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
    def test_generate_report_creates_pngs_and_links(self, mock_plt):
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
            {'date': '010123', 'weight': 200, 'body_fat_percentage': 20, 'lean_mass': 160, 'fat_mass': 40, 'rmr': 2000, 'tdee': 2500, 'daily_calorie_intake': 2000, 'weekly_caloric_output': 17500, 'total_weight_lost': 0, 'muscle_gain': 0},
            {'date': '010823', 'weight': 198, 'body_fat_percentage': 19.5, 'lean_mass': 160.5, 'fat_mass': 37.5, 'rmr': 1990, 'tdee': 2490, 'daily_calorie_intake': 2000, 'weekly_caloric_output': 17500, 'total_weight_lost': 2, 'muscle_gain': 0.5}
        ]

        # Run generator
        # We need to mock AIConfidenceAnalyzer to avoid API calls or errors if missing
        with patch('new_prime_python_code.PRIME_Report_Generator_v3.AIConfidenceAnalyzer') as MockAnalyzer:
            mock_analyzer_instance = MockAnalyzer.return_value
            mock_analyzer_instance.analyze_input_parameters.return_value = {
                'anthropometric_reliability': 90,
                'activity_reliability': 90,
                'goal_reliability': 90,
                'data_completeness': 100
            }
            mock_analyzer_instance.generate_ai_confidence_analysis.return_value = None
            
            # Configure mock_plt.subplots
            mock_fig = MagicMock()
            mock_ax = MagicMock()
            mock_plt.subplots.return_value = (mock_fig, mock_ax)
            mock_ax.twinx.return_value = mock_ax
            
            # Configure legend handles
            mock_ax.get_legend_handles_labels.return_value = ([], [])

            md_path, pdf_path = generate_prime_report_terminal(user_data, progression_data, self.test_dir)

        # Verify images directory created
        self.assertTrue(os.path.exists(os.path.join(self.test_dir, 'images')))
        
        # Verify plt.savefig calls
        self.assertTrue(mock_plt.savefig.called)
        
        # Verify Markdown content
        with open(md_path, 'r', encoding='utf-8') as f:
            content = f.read()
            self.assertIn('![Weight Progress Chart](images/weight_progress.png)', content)
            self.assertIn('![Body Composition Chart](images/body_composition.png)', content)

        # Verify HTML content
        html_files = [f for f in os.listdir(self.test_dir) if f.endswith('.html')]
        self.assertTrue(len(html_files) > 0)
        with open(os.path.join(self.test_dir, html_files[0]), 'r', encoding='utf-8') as f:
            html_content = f.read()
            self.assertIn('src="images/weight_progress.png"', html_content)
            self.assertIn('src="images/body_composition.png"', html_content)

if __name__ == '__main__':
    unittest.main()
