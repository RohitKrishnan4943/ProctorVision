from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import uvicorn
import os
from dotenv import load_dotenv

from database.database import engine, Base
from api.routes import auth, exams, monitoring, admin
from api.websocket import manager

# Load environment variables
load_dotenv()

# Create tables
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("Starting up...")
    Base.metadata.create_all(bind=engine)
    yield
    # Shutdown
    print("Shutting down...")

# Create FastAPI app
app = FastAPI(
    title="Exam System Backend",
    description="AI-powered Online Examination System with Cheating Detection",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:5500"],  # Frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(exams.router, prefix="/api/exams", tags=["Exams"])
app.include_router(monitoring.router, prefix="/api/monitoring", tags=["Monitoring"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])

# WebSocket endpoint for real-time monitoring
@app.websocket("/ws/monitoring/{student_id}/{exam_id}")
async def websocket_endpoint(websocket: WebSocket, student_id: str, exam_id: str):
    await manager.connect(websocket, student_id, exam_id)
    try:
        while True:
            data = await websocket.receive_json()
            # Process incoming data (frames, audio, etc.)
            await manager.process_data(student_id, exam_id, data)
    except WebSocketDisconnect:
        manager.disconnect(student_id, exam_id)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(student_id, exam_id)

# Health check endpoint
@app.get("/")
async def root():
    return {
        "message": "Exam System Backend",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )