from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException
from sqlalchemy.orm import Session
import json
import base64
from datetime import datetime
import asyncio

from database.database import get_db
from database.models import Submission, CheatingEvent
from services.ai_monitoring import ai_monitor
from api.websocket import manager

router = APIRouter()

@router.post("/frame/{submission_id}")
async def process_frame(
    submission_id: int,
    frame_data: dict,
    db: Session = Depends(get_db)
):
    """
    Process a single frame for cheating detection
    """
    try:
        # Get submission
        submission = db.query(Submission).filter(Submission.id == submission_id).first()
        if not submission:
            raise HTTPException(status_code=404, detail="Submission not found")
        
        # Process frame
        frame_base64 = frame_data.get("frame")
        if not frame_base64:
            raise HTTPException(status_code=400, detail="No frame data provided")
        
        result = ai_monitor.process_frame(frame_base64, str(submission.student_id))
        
        # Save cheating events if any violations
        if "violations" in result and result["violations"]:
            for violation in result["violations"]:
                cheating_event = CheatingEvent(
                    submission_id=submission_id,
                    event_type=violation["type"],
                    severity=violation["severity"],
                    confidence=violation["confidence"],
                    timestamp=datetime.fromisoformat(violation["timestamp"])
                )
                db.add(cheating_event)
            
            # Update submission cheating count
            submission.cheating_count = (submission.cheating_count or 0) + len(result["violations"])
            submission.warnings = (submission.warnings or []) + result["violations"]
            db.commit()
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/audio/{submission_id}")
async def process_audio(
    submission_id: int,
    audio_data: dict,
    db: Session = Depends(get_db)
):
    """
    Process audio chunk for cheating detection
    """
    try:
        # Get submission
        submission = db.query(Submission).filter(Submission.id == submission_id).first()
        if not submission:
            raise HTTPException(status_code=404, detail="Submission not found")
        
        # Process audio
        audio_base64 = audio_data.get("audio")
        if not audio_base64:
            raise HTTPException(status_code=400, detail="No audio data provided")
        
        result = ai_monitor.process_audio(audio_base64, str(submission.student_id))
        
        # Save cheating events if any violations
        if "violations" in result and result["violations"]:
            for violation in result["violations"]:
                cheating_event = CheatingEvent(
                    submission_id=submission_id,
                    event_type=violation["type"],
                    severity=violation["severity"],
                    confidence=violation["confidence"],
                    timestamp=datetime.fromisoformat(violation["timestamp"])
                )
                db.add(cheating_event)
            
            # Update submission cheating count
            submission.cheating_count = (submission.cheating_count or 0) + len(result["violations"])
            submission.warnings = (submission.warnings or []) + result["violations"]
            db.commit()
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/events/{submission_id}")
async def get_cheating_events(
    submission_id: int,
    db: Session = Depends(get_db)
):
    """
    Get cheating events for a submission
    """
    events = db.query(CheatingEvent).filter(
        CheatingEvent.submission_id == submission_id
    ).order_by(CheatingEvent.timestamp.desc()).all()
    
    return [
        {
            "id": event.id,
            "event_type": event.event_type,
            "severity": event.severity,
            "confidence": event.confidence,
            "timestamp": event.timestamp.isoformat()
        }
        for event in events
    ]

@router.post("/tab-switch/{submission_id}")
async def report_tab_switch(
    submission_id: int,
    data: dict,
    db: Session = Depends(get_db)
):
    """
    Report tab switching/focus loss
    """
    try:
        submission = db.query(Submission).filter(Submission.id == submission_id).first()
        if not submission:
            raise HTTPException(status_code=404, detail="Submission not found")
        
        is_focused = data.get("is_focused", True)
        result = ai_monitor.check_tab_switch(str(submission.student_id), is_focused)
        
        if result.get("violations"):
            for violation in result["violations"]:
                cheating_event = CheatingEvent(
                    submission_id=submission_id,
                    event_type=violation["type"],
                    severity=violation["severity"],
                    confidence=violation["confidence"],
                    timestamp=datetime.fromisoformat(violation["timestamp"])
                )
                db.add(cheating_event)
            
            submission.cheating_count = (submission.cheating_count or 0) + len(result["violations"])
            submission.warnings = (submission.warnings or []) + result["violations"]
            db.commit()
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/auto-submit/{submission_id}")
async def auto_submit_exam(
    submission_id: int,
    reason: str,
    db: Session = Depends(get_db)
):
    """
    Auto-submit exam due to cheating violations
    """
    submission = db.query(Submission).filter(Submission.id == submission_id).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    submission.status = "completed"
    submission.auto_submitted = True
    submission.auto_submit_reason = reason
    submission.submitted_at = datetime.utcnow()
    
    db.commit()
    
    return {"message": f"Exam auto-submitted: {reason}"}