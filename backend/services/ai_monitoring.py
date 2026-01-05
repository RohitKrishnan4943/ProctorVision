"""
SIMULATED AI Monitoring System
No OpenCV, No MediaPipe, No YOLO - Just simulation for demo
"""

import base64
import random
import json
from datetime import datetime
from PIL import Image
import io
import numpy as np

class AIMonitoringSystem:
    def __init__(self):
        print("🚀 Starting SIMULATED AI Monitoring System")
        print("✅ Running in DEMO MODE - Simulating cheating detection")
        
        # Track violations per student
        self.violation_history = {}
        
        # Simulation settings
        self.violation_chances = {
            "face_not_visible": 0.15,      # 15% chance
            "multiple_faces": 0.08,        # 8% chance
            "looking_away": 0.20,          # 20% chance
            "prohibited_object": 0.05,     # 5% chance
            "talking_detected": 0.10,      # 10% chance
            "tab_switch": 1.0              # 100% if tab switched
        }
        
        print("✅ AI Monitoring ready (Simulation Mode)")
    
    def _get_student_seed(self, student_id):
        """Create consistent random seed based on student ID"""
        return hash(student_id) % 1000
    
    def process_frame(self, frame_base64: str, student_id: str):
        """
        Simulate frame processing - NO OPENCV REQUIRED
        """
        try:
            violations = []
            
            # Set seed for consistent randomness per student
            seed = self._get_student_seed(student_id) + int(datetime.now().timestamp() / 30)
            random.seed(seed)
            
            # Try to decode base64 for realism (but not required)
            try:
                # Just decode to verify it's valid base64
                image_data = base64.b64decode(frame_base64)
                # You could use PIL here if needed, but not required
                # image = Image.open(io.BytesIO(image_data))
                frame_valid = True
            except:
                frame_valid = False
            
            # SIMULATE FACE DETECTION
            if random.random() < self.violation_chances["face_not_visible"]:
                violations.append({
                    "type": "face_not_visible",
                    "severity": "medium",
                    "confidence": round(random.uniform(0.6, 0.9), 2),
                    "timestamp": datetime.now().isoformat(),
                    "message": "No face detected. Please keep your face visible."
                })
            
            # SIMULATE MULTIPLE FACES
            elif random.random() < self.violation_chances["multiple_faces"]:
                violations.append({
                    "type": "multiple_faces",
                    "severity": "high",
                    "confidence": round(random.uniform(0.7, 0.95), 2),
                    "timestamp": datetime.now().isoformat(),
                    "message": f"Multiple faces detected ({random.randint(2, 4)} faces)."
                })
            
            # SIMULATE LOOKING AWAY
            elif random.random() < self.violation_chances["looking_away"]:
                directions = ["left", "right", "down", "up"]
                violations.append({
                    "type": "looking_away",
                    "severity": "low",
                    "confidence": round(random.uniform(0.5, 0.8), 2),
                    "timestamp": datetime.now().isoformat(),
                    "message": f"Looking {random.choice(directions)}. Please focus on screen."
                })
            
            # SIMULATE PROHIBITED OBJECTS
            elif random.random() < self.violation_chances["prohibited_object"]:
                objects = ["mobile phone", "book", "notes", "earphones", "second device"]
                violations.append({
                    "type": "prohibited_object",
                    "severity": "high",
                    "confidence": round(random.uniform(0.65, 0.9), 2),
                    "timestamp": datetime.now().isoformat(),
                    "message": f"Prohibited item detected: {random.choice(objects)}"
                })
            
            # Track for this student
            if student_id not in self.violation_history:
                self.violation_history[student_id] = []
            
            self.violation_history[student_id].extend(violations)
            
            return {
                "status": "success",
                "timestamp": datetime.now().isoformat(),
                "violations": violations,
                "face_count": 0 if violations and violations[0]["type"] == "face_not_visible" else 1,
                "frame_valid": frame_valid,
                "total_violations": len(self.violation_history.get(student_id, [])),
                "message": "Frame processed in simulation mode"
            }
            
        except Exception as e:
            return {
                "status": "error",
                "timestamp": datetime.now().isoformat(),
                "violations": [],
                "error": str(e),
                "message": "Using fallback simulation"
            }
    
    def process_audio(self, audio_base64: str, student_id: str):
        """
        Simulate audio processing
        """
        try:
            violations = []
            
            # Set seed
            seed = self._get_student_seed(student_id) + int(datetime.now().timestamp() / 20)
            random.seed(seed)
            
            # SIMULATE TALKING DETECTION
            if random.random() < self.violation_chances["talking_detected"]:
                violations.append({
                    "type": "talking_detected",
                    "severity": "medium",
                    "confidence": round(random.uniform(0.4, 0.8), 2),
                    "timestamp": datetime.now().isoformat(),
                    "message": "Talking or audio detected. Please maintain silence."
                })
            
            # SIMULATE BACKGROUND NOISE
            elif random.random() < 0.05:  # 5% chance
                violations.append({
                    "type": "background_noise",
                    "severity": "low",
                    "confidence": round(random.uniform(0.3, 0.6), 2),
                    "timestamp": datetime.now().isoformat(),
                    "message": "Unusual background noise detected."
                })
            
            return {
                "status": "success",
                "timestamp": datetime.now().isoformat(),
                "violations": violations,
                "audio_level": round(random.uniform(0.1, 0.9), 2),
                "message": "Audio processed in simulation mode"
            }
            
        except Exception as e:
            return {
                "status": "error",
                "timestamp": datetime.now().isoformat(),
                "violations": [],
                "error": str(e)
            }
    
    def check_tab_switch(self, student_id: str, is_focused: bool):
        """
        Check tab switching (real detection, not simulated)
        """
        violations = []
        
        if not is_focused:
            violations.append({
                "type": "tab_switch",
                "severity": "medium",
                "confidence": 1.0,
                "timestamp": datetime.now().isoformat(),
                "message": "Tab switching detected. Please stay on exam page."
            })
        
        return {
            "status": "success",
            "timestamp": datetime.now().isoformat(),
            "violations": violations
        }
    
    def get_student_report(self, student_id: str):
        """Get violation report for student"""
        violations = self.violation_history.get(student_id, [])
        
        # Count by type
        counts = {}
        for v in violations:
            counts[v["type"]] = counts.get(v["type"], 0) + 1
        
        return {
            "student_id": student_id,
            "total_violations": len(violations),
            "violations_by_type": counts,
            "latest_violations": violations[-10:] if len(violations) > 10 else violations,
            "auto_submit_warning": len(violations) >= 3  # Warn if close to auto-submit
        }

# Create global instance
ai_monitor = AIMonitoringSystem()