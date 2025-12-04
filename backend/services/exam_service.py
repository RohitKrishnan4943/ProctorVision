from datetime import datetime
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from database.models import Exam, Submission, User
from utils.helpers import generate_exam_code, calculate_score

class ExamService:
    @staticmethod
    def create_exam(
        db: Session,
        teacher_id: int,
        title: str,
        description: str,
        duration: int,
        questions: List[Dict[str, Any]],
        access_type: str = "link",
        allowed_students: List[int] = None
    ) -> Exam:
        """Create a new exam"""
        exam_code = generate_exam_code()
        
        exam = Exam(
            exam_code=exam_code,
            title=title,
            description=description,
            duration=duration,
            questions=questions,
            teacher_id=teacher_id,
            access_type=access_type,
            allowed_students=allowed_students or []
        )
        
        db.add(exam)
        db.commit()
        db.refresh(exam)
        
        return exam
    
    @staticmethod
    def get_teacher_exams(db: Session, teacher_id: int) -> List[Exam]:
        """Get all exams created by a teacher"""
        return db.query(Exam).filter(Exam.teacher_id == teacher_id).all()
    
    @staticmethod
    def get_exam_by_code(db: Session, exam_code: str) -> Exam:
        """Get exam by code"""
        return db.query(Exam).filter(Exam.exam_code == exam_code).first()
    
    @staticmethod
    def start_exam(db: Session, exam_id: int, student_id: int) -> Submission:
        """Start an exam (create submission)"""
        # Check for existing submission
        existing = db.query(Submission).filter(
            Submission.exam_id == exam_id,
            Submission.student_id == student_id,
            Submission.status == "in_progress"
        ).first()
        
        if existing:
            return existing
        
        # Create new submission
        submission = Submission(
            exam_id=exam_id,
            student_id=student_id,
            answers=[],
            started_at=datetime.utcnow(),
            status="in_progress"
        )
        
        db.add(submission)
        db.commit()
        db.refresh(submission)
        
        return submission
    
    @staticmethod
    def submit_exam(
        db: Session,
        submission_id: int,
        student_id: int,
        answers: List[Dict[str, Any]]
    ) -> Submission:
        """Submit exam answers"""
        submission = db.query(Submission).filter(
            Submission.id == submission_id,
            Submission.student_id == student_id
        ).first()
        
        if not submission:
            return None
        
        # Get exam for calculating total marks
        exam = db.query(Exam).filter(Exam.id == submission.exam_id).first()
        
        # Calculate score
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
        db.refresh(submission)
        
        return submission
    
    @staticmethod
    def get_exam_submissions(db: Session, exam_id: int) -> List[Submission]:
        """Get all submissions for an exam"""
        return db.query(Submission).filter(Submission.exam_id == exam_id).all()
    
    @staticmethod
    def toggle_exam_status(db: Session, exam_id: int, teacher_id: int) -> bool:
        """Toggle exam active status"""
        exam = db.query(Exam).filter(
            Exam.id == exam_id,
            Exam.teacher_id == teacher_id
        ).first()
        
        if not exam:
            return False
        
        exam.is_active = not exam.is_active
        db.commit()
        
        return True
    
    @staticmethod
    def delete_exam(db: Session, exam_id: int, teacher_id: int) -> bool:
        """Delete an exam"""
        exam = db.query(Exam).filter(
            Exam.id == exam_id,
            Exam.teacher_id == teacher_id
        ).first()
        
        if not exam:
            return False
        
        # Delete related submissions
        db.query(Submission).filter(Submission.exam_id == exam_id).delete()
        
        # Delete exam
        db.delete(exam)
        db.commit()
        
        return True

# Global instance
exam_service = ExamService()