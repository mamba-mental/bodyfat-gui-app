
import sys
import os
import datetime
import unittest
from unittest.mock import MagicMock, patch

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Mock matplotlib before importing the module under test
with patch.dict('sys.modules', {'matplotlib': MagicMock(), 'matplotlib.pyplot': MagicMock(), 'seaborn': MagicMock()}):
    from new_prime_python_code.PRIME_Report_Generator_v3_Fast import create_professional_charts

class TestPrimeGeneratorDates(unittest.TestCase):
    def test_date_parsing_mmddyy(self):
        """Test that MMDDYY dates are parsed correctly."""
        data = [
            {'date': '010125', 'weight': 180, 'body_fat_percentage': 20, 'lean_mass': 144, 'fat_mass': 36},
            {'date': '010825', 'weight': 179, 'body_fat_percentage': 19.8, 'lean_mass': 144.2, 'fat_mass': 34.8}
        ]
        # Should not raise exception
        try:
            create_professional_charts(data, 'test_output')
        except Exception as e:
            self.fail(f"create_professional_charts raised Exception with MMDDYY dates: {e}")

    def test_date_parsing_iso(self):
        """Test that ISO dates are parsed correctly."""
        data = [
            {'date': '2025-01-01', 'weight': 180, 'body_fat_percentage': 20, 'lean_mass': 144, 'fat_mass': 36},
            {'date': '2025-01-08', 'weight': 179, 'body_fat_percentage': 19.8, 'lean_mass': 144.2, 'fat_mass': 34.8}
        ]
        # Should not raise exception
        try:
            create_professional_charts(data, 'test_output')
        except Exception as e:
            self.fail(f"create_professional_charts raised Exception with ISO dates: {e}")

if __name__ == '__main__':
    unittest.main()

