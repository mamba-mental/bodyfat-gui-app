
import sys
import os
from pathlib import Path

# Add the PRIME code to Python path
current_dir = Path(__file__).parent.absolute()
gui_app_dir = current_dir.parent
sys.path.insert(0, str(gui_app_dir))

print(f"Current dir: {current_dir}")
print(f"GUI app dir: {gui_app_dir}")
print(f"Sys path: {sys.path}")

try:
    print("Attempting to import PRIME_Report_Generator_v3_Fast...")
    from new_prime_python_code.PRIME_Report_Generator_v3_Fast import generate_prime_report_terminal_fast
    print("SUCCESS: Imported PRIME_Report_Generator_v3_Fast")
except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()
