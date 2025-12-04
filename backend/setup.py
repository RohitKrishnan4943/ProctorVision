#!/usr/bin/env python3
"""
Setup script for the Exam System Backend
"""
import os
import sys
import subprocess

def check_python_version():
    """Check Python version"""
    if sys.version_info < (3, 8):
        print("Error: Python 3.8 or higher is required")
        sys.exit(1)
    print(f"✓ Python {sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro} detected")

def install_requirements():
    """Install Python dependencies"""
    print("Installing requirements...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        print("✓ Requirements installed successfully!")
    except subprocess.CalledProcessError as e:
        print(f"✗ Error installing requirements: {e}")
        sys.exit(1)

def create_env_file():
    """Create .env file if it doesn't exist"""
    if not os.path.exists(".env"):
        print("Creating .env file...")
        with open(".env", "w") as f:
            f.write("""# Database
DATABASE_URL=sqlite:///./exam_system.db

# Security
SECRET_KEY=your-super-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Server
HOST=0.0.0.0
PORT=8000
DEBUG=True

# AI Monitoring (simulated)
AI_MONITORING_ENABLED=True
FACE_DETECTION_THRESHOLD=0.5
MAX_ALLOWED_FACES=1
GAZE_AWAY_THRESHOLD=2.0
AUDIO_THRESHOLD=0.1
""")
        print("✓ .env file created!")

def create_directories():
    """Create necessary directories"""
    dirs = ["static", "logs", "database_backups"]
    for dir_name in dirs:
        if not os.path.exists(dir_name):
            os.makedirs(dir_name)
            print(f"✓ Created directory: {dir_name}")

def check_structure():
    """Check if all required directories exist"""
    required_dirs = [
        "database",
        "api/routes",
        "services",
        "utils"
    ]
    
    for dir_path in required_dirs:
        if not os.path.exists(dir_path):
            os.makedirs(dir_path, exist_ok=True)
            print(f"✓ Created directory: {dir_path}")

def create_init_files():
    """Create __init__.py files if missing"""
    init_files = [
        "database/__init__.py",
        "api/__init__.py",
        "api/routes/__init__.py",
        "services/__init__.py",
        "utils/__init__.py"
    ]
    
    for init_file in init_files:
        if not os.path.exists(init_file):
            with open(init_file, "w") as f:
                f.write("# Package initialization\n")
            print(f"✓ Created: {init_file}")

def print_instructions():
    """Print setup instructions"""
    print("\n" + "="*50)
    print("SETUP COMPLETE!")
    print("="*50)
    print("\nTo start the server, run:")
    print("  python main.py")
    print("\nOr with uvicorn:")
    print("  uvicorn main:app --reload --host 0.0.0.0 --port 8000")
    print("\nThe API will be available at: http://localhost:8000")
    print("API documentation: http://localhost:8000/docs")
    print("\nTo create an admin user, use the registration endpoint:")
    print("  POST /api/auth/register")
    print('  Body: {"email": "admin@example.com", "password": "password", "name": "Admin", "role": "admin"}')
    print("\n" + "="*50)

def main():
    """Main setup function"""
    print("="*50)
    print("EXAM SYSTEM BACKEND SETUP")
    print("="*50)
    print()
    
    check_python_version()
    check_structure()
    create_init_files()
    install_requirements()
    create_env_file()
    create_directories()
    
    print_instructions()

if __name__ == "__main__":
    main()