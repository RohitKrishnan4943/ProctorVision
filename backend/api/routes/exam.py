from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
import random
import string

from database.database import get_db
from database.models import User, Exam, Submission
from services.auth_service import get_current_user
from api.routes.auth import oauth2_scheme

router = APIRouter()

# Pydantic models
class ExamCreate(BaseModel):
    title: str
    description: Optional[str] = None
    duration: int
    questions: List[Dict[str, Any]]
    access_type: str = "link"
    allowed_students: Optional[List[int]] = None

class ExamResponse(BaseModel):
    id: int
    exam_code: str
    title: str
    description: Optional[str]
    duration: int
    teacher_id: int
    teacher_name: str
    is_active: bool
    access_type: str
    created_at: datetime
    questions: List[Dict[str, Any]]

class StartExamResponse(BaseModel):
    exam: ExamResponse
    submission_id: int
    started_at: datetime
    time_remaining: int

def generate_exam_code():
    """Generate unique 8-character exam code"""
    characters = string.ascii_uppercase + string.digits
    return ''.join(random.choice(characters) for _ in range(8))

@router.post("/create", response_model=ExamResponse)
async def create_exam(
    exam_data: ExamCreate,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    """
    Create a new exam
    """
    user = get_current_user(token, db)
    
    if user.role not in ["teacher", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers and admins can create exams"
        )
    
    # Generate unique exam code
    exam_code = generate_exam_code()
    
    # Create exam
    exam = Exam(
        exam_code=exam_code,
        title=exam_data.title,
        description=exam_data.description,
        duration=exam_data.duration,
        questions=exam_data.questions,
        teacher_id=user.id,
        access_type=exam_data.access_type,
        allowed_students=exam_data.allowed_students or []
    )
    
    db.add(exam)
    db.commit()
    db.refresh(exam)
    
    return {
        "id": exam.id,
        "exam_code": exam.exam_code,
        "title": exam.title,
        "description": exam.description,
        "duration": exam.duration,
        "teacher_id": exam.teacher_id,
        "teacher_name": user.name,
        "is_active": exam.is_active,
        "access_type": exam.access_type,
        "created_at": exam.created_at,
        "questions": exam.questions
    }

@router.get("/my-exams", response_model=List[ExamResponse])
async def get_my_exams(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    """
    Get exams created by current teacher
    """
    user = get_current_user(token, db)
    
    if user.role not in ["teacher", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers and admins can view their exams"
        )
    
    exams = db.query(Exam).filter(Exam.teacher_id == user.id).all()
    
    return [
        {
            "id": exam.id,
            "exam_code": exam.exam_code,
            "title": exam.title,
            "description": exam.description,
            "duration": exam.duration,
            "teacher_id": exam.teacher_id,
            "teacher_name": user.name,
            "is_active": exam.is_active,
            "access_type": exam.access_type,
            "created_at": exam.created_at,
            "questions": exam.questions
        }
        for exam in exams
    ]

@router.get("/{exam_code}")
async def get_exam_by_code(
    exam_code: str,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    """
    Get exam details by code
    """
    user = get_current_user(token, db)
    
    exam = db.query(Exam).filter(Exam.exam_code == exam_code).first()
    if not exam:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exam not found"
        )
    
    # Check access
    if exam.access_type == "specific" and user.id not in exam.allowed_students:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to access this exam"
        )
    
    # Get teacher info
    teacher = db.query(User).filter(User.id == exam.teacher_id).first()
    
    return {
        "id": exam.id,
        "exam_code": exam.exam_code,
        "title": exam.title,
        "description": exam.description,
        "duration": exam.duration,
        "teacher_id": exam.teacher_id,
        "teacher_name": teacher.name if teacher else "Unknown",
        "is_active": exam.is_active,
        "access_type": exam.access_type,
        "created_at": exam.created_at,
        "questions": exam.questions
    }

@router.post("/{exam_code}/start", response_model=StartExamResponse)
async def start_exam(
    exam_code: str,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    """
    Start an exam (creates a submission)
    """
    user = get_current_user(token, db)
    
    if user.role != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can start exams"
        )
    
    # Get exam
    exam = db.query(Exam).filter(Exam.exam_code == exam_code).first()
    if not exam:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exam not found"
        )
    
    if not exam.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Exam is not active"
        )
    
    # Check access
    if exam.access_type == "specific" and user.id not in exam.allowed_students:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to take this exam"
        )
    
    # Check if already has an active submission
    existing_submission = db.query(Submission).filter(
        Submission.exam_id == exam.id,
        Submission.student_id == user.id,
        Submission.status == "in_progress"
    ).first()
    
    if existing_submission:
        # Calculate time remaining
        time_elapsed = (datetime.utcnow() - existing_submission.started_at).total_seconds()
        time_remaining = max(0, exam.duration * 60 - time_elapsed)
        
        return {
            "exam": {
                "id": exam.id,
                "exam_code": exam.exam_code,
                "title": exam.title,
                "description": exam.description,
                "duration": exam.duration,
                "teacher_id": exam.teacher_id,
                "teacher_name": db.query(User).filter(User.id == exam.teacher_id).first().name,
                "is_active": exam.is_active,
                "access_type": exam.access_type,
                "created_at": exam.created_at,
                "questions": exam.questions
            },
            "submission_id": existing_submission.id,
            "started_at": existing_submission.started_at,
            "time_remaining": int(time_remaining)
        }
    
    # Create new submission
    submission = Submission(
        exam_id=exam.id,
        student_id=user.id,
        answers=[],
        started_at=datetime.utcnow(),
        status="in_progress"
    )
    
    db.add(submission)
    db.commit()
    db.refresh(submission)
    
    return {
        "exam": {
            "id": exam.id,
            "exam_code": exam.exam_code,
            "title": exam.title,
            "description": exam.description,
            "duration": exam.duration,
            "teacher_id": exam.teacher_id,
            "teacher_name": db.query(User).filter(User.id == exam.teacher_id).first().name,
            "is_active": exam.is_active,
            "access_type": exam.access_type,
            "created_at": exam.created_at,
            "questions": exam.questions
        },
        "submission_id": submission.id,
        "started_at": submission.started_at,
        "time_remaining": exam.duration * 60
    }

@router.post("/submit/{submission_id}")
async def submit_exam(
    submission_id: int,
    answers: List[Dict[str, Any]],
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    """
    Submit exam answers
    """
    user = get_current_user(token, db)
    
    # Get submission
    submission = db.query(Submission).filter(
        Submission.id == submission_id,
        Submission.student_id == user.id
    ).first()
    
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found"
        )
    
    if submission.status == "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Exam already submitted"
        )
    
    # Get exam for calculating total marks
    exam = db.query(Exam).filter(Exam.id == submission.exam_id).first()
    
    # Calculate score (simplified - in production, implement proper scoring)
    total_marks = sum(q.get("marks", 1) for q in exam.questions)
    score = calculate_score(exam.questions, answers)
    percentage = (score / total_marks) * 100 if total_marks > 0 else 0
    
    # Update submission
    submission.answers = answers
    submission.score = score
    submission.total_marks = total_marks
    submission.percentage = percentage
    submission.status = "completed"
    submission.submitted_at = datetime.utcnow()
    
    db.commit()
    
    return {
        "message": "Exam submitted successfully",
        "score": score,
        "total_marks": total_marks,
        "percentage": percentage,
        "cheating_warnings": submission.cheating_count
    }

def calculate_score(questions: List[Dict], answers: List[Dict]) -> float:
    """Calculate exam score"""
    score = 0.0
    
    for i, question in enumerate(questions):
        if i < len(answers):
            user_answer = answers[i].get("answer", "")
            
            if question["type"] == "mcq":
                correct_options = [opt["id"] for opt in question["options"] if opt.get("isCorrect", False)]
                
                if isinstance(user_answer, list):
                    # Multiple correct answers
                    if set(user_answer) == set(correct_options):
                        score += question.get("marks", 1)
                else:
                    # Single correct answer
                    if str(user_answer) in [str(opt) for opt in correct_options]:
                        score += question.get("marks", 1)
            
            elif question["type"] == "short":
                # For short answers, give partial credit
                expected = question.get("expectedAnswer", "").lower()
                if expected and expected in user_answer.lower():
                    score += question.get("marks", 1) * 0.5  # 50% for keyword match
    
    return score