import sys
import os

# Set the project root directory
# ensuring the app can find 'modules' and other local packages
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import the Flask app
from app import app as application
