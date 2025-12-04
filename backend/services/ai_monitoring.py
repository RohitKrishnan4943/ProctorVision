import cv2
import numpy as np
import base64
import json
from datetime import datetime
from typing import Dict, List, Optional, Tuple
import asyncio
from collections import deque

class AIMonitoringService:
    def __init__(self):
        # Initialize face detection (using OpenCV Haar Cascades as fallback)
        self.face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        )
        
        # In production, you would load YOLOv8 model here
        # self.yolo_model = YOLO('yolov8n.pt')
        
        # Tracking variables
        self.face_history = {}
        self.gaze_history = {}
        self.audio_history = {}
        
        # Thresholds
        self.FACE_CONFIDENCE_THRESHOLD = 0.5
        self.MAX_FACES = 1
        self.GAZE_AWAY_THRESHOLD = 2.0  # seconds
        self.AUDIO_THRESHOLD = 0.1
        
    def process_frame(self, frame_data: str, student_id: str) -> Dict:
        """
        Process a single frame for cheating detection
        Returns: Dict with detected violations
        """
        try:
            # Decode base64 frame
            frame_bytes = base64.b64decode(frame_data)
            nparr = np.frombuffer(frame_bytes, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if frame is None:
                return {"error": "Could not decode frame"}
            
            violations = []
            
            # 1. Face detection using Haar Cascade
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            faces = self.face_cascade.detectMultiScale(
                gray, 
                scaleFactor=1.1, 
                minNeighbors=5, 
                minSize=(30, 30)
            )
            
            # Initialize face history for student
            if student_id not in self.face_history:
                self.face_history[student_id] = deque(maxlen=30)
            
            # Record face detection
            face_detected = len(faces) > 0
            self.face_history[student_id].append({
                "timestamp": datetime.now().isoformat(),
                "face_detected": face_detected,
                "face_count": len(faces)
            })
            
            # Check for violations
            if not face_detected:
                violations.append({
                    "type": "face_not_visible",
                    "severity": "high",
                    "confidence": 0.9,
                    "message": "Face not detected. Please ensure your face is visible.",
                    "timestamp": datetime.now().isoformat()
                })
            
            if len(faces) > self.MAX_FACES:
                violations.append({
                    "type": "multiple_faces",
                    "severity": "high",
                    "confidence": 0.8,
                    "message": f"Multiple faces detected ({len(faces)}).",
                    "timestamp": datetime.now().isoformat()
                })
            
            # 2. Gaze estimation (simplified)
            if face_detected and len(faces) == 1:
                (x, y, w, h) = faces[0]
                face_center = (x + w//2, y + h//2)
                frame_center = (frame.shape[1]//2, frame.shape[0]//2)
                
                # Calculate distance from center
                distance = np.sqrt((face_center[0] - frame_center[0])**2 + 
                                  (face_center[1] - frame_center[1])**2)
                
                # Initialize gaze history
                if student_id not in self.gaze_history:
                    self.gaze_history[student_id] = deque(maxlen=30)
                
                self.gaze_history[student_id].append({
                    "timestamp": datetime.now().isoformat(),
                    "distance": distance,
                    "looking_away": distance > 100  # threshold
                })
                
                # Check if looking away for too long
                recent_gaze = list(self.gaze_history[student_id])
                looking_away_count = sum(1 for g in recent_gaze[-10:] if g["looking_away"])
                
                if looking_away_count >= 8:  # 80% of recent frames
                    violations.append({
                        "type": "looking_away",
                        "severity": "medium",
                        "confidence": 0.7,
                        "message": "Looking away from screen detected.",
                        "timestamp": datetime.now().isoformat()
                    })
            
            # 3. Object detection (simplified - check for phone-like shapes)
            # In production, use YOLOv8 for this
            contours, _ = cv2.findContours(
                cv2.Canny(frame, 100, 200),
                cv2.RETR_TREE,
                cv2.CHAIN_APPROX_SIMPLE
            )
            
            for contour in contours:
                area = cv2.contourArea(contour)
                if 500 < area < 5000:  # Phone-like size range
                    x, y, w, h = cv2.boundingRect(contour)
                    aspect_ratio = w / h
                    
                    if 0.5 < aspect_ratio < 2.0:  # Phone-like aspect ratio
                        violations.append({
                            "type": "suspicious_object",
                            "severity": "medium",
                            "confidence": 0.6,
                            "message": "Suspicious object detected.",
                            "timestamp": datetime.now().isoformat()
                        })
                        break
            
            return {
                "violations": violations,
                "face_detected": face_detected,
                "face_count": len(faces),
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            return {"error": str(e)}
    
    def process_audio(self, audio_data: str, student_id: str) -> Dict:
        """
        Process audio chunk for cheating detection
        Returns: Dict with audio violations
        """
        try:
            # Decode base64 audio
            audio_bytes = base64.b64decode(audio_data)
            # In production, you would analyze audio here
            # For simulation, we'll do random detection
            
            import random
            violations = []
            
            # Initialize audio history
            if student_id not in self.audio_history:
                self.audio_history[student_id] = deque(maxlen=50)
            
            # Simulate voice detection
            has_voice = random.random() < 0.1  # 10% chance of detecting voice
            
            self.audio_history[student_id].append({
                "timestamp": datetime.now().isoformat(),
                "has_voice": has_voice,
                "volume": random.random()
            })
            
            # Check for continuous talking
            if has_voice:
                recent_audio = list(self.audio_history[student_id])
                voice_count = sum(1 for a in recent_audio[-20:] if a["has_voice"])
                
                if voice_count >= 15:  # 75% of recent chunks
                    violations.append({
                        "type": "talking_detected",
                        "severity": "high",
                        "confidence": 0.8,
                        "message": "Talking detected during exam.",
                        "timestamp": datetime.now().isoformat()
                    })
            
            return {
                "violations": violations,
                "has_voice": has_voice,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            return {"error": str(e)}
    
    def check_tab_switch(self, student_id: str, is_focused: bool) -> Dict:
        """
        Check for tab switching/focus loss
        """
        if not is_focused:
            return {
                "violations": [{
                    "type": "tab_switch",
                    "severity": "medium",
                    "confidence": 1.0,
                    "message": "Tab switching detected.",
                    "timestamp": datetime.now().isoformat()
                }],
                "timestamp": datetime.now().isoformat()
            }
        return {"violations": []}

# Global instance
ai_monitor = AIMonitoringService()