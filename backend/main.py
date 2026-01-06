from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv

from database.database import engine, Base
from api.routes.auth import router as auth_router
from api.routes.exams import router as exams_router
from api.routes.monitoring import router as monitoring_router
from api.routes.admin import router as admin_router
from api.routes.websocket import manager
from starlette.middleware.base import BaseHTTPMiddleware

# Load environment variables
load_dotenv()

# ===================== LIFESPAN =====================
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 Starting Exam System Backend...")
    print("📊 Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created successfully!")

    print("\n" + "=" * 60)
    print("🌐 SERVER IS READY!")
    print("=" * 60)

    codespace_name = os.getenv("CODESPACE_NAME", "")
    if codespace_name:
        print(f"\n📌 Codespace: {codespace_name}")
        print(f"🔗 Backend URL: https://{codespace_name}-8000.preview.app.github.dev")
        print(f"📚 Docs: https://{codespace_name}-8000.preview.app.github.dev/docs")
    else:
        print("\n🔗 Local Backend URL: http://localhost:8000")

    print("\n✅ Waiting for connections...")
    yield
    print("\n🛑 Shutting down backend...")

# ===================== APP =====================
app = FastAPI(
    title="Exam System Backend",
    description="AI-powered Online Examination System with Cheating Detection",
    version="1.0.0",
    lifespan=lifespan
)

# ===================== CORS (FIXED & SAFE) =====================
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://probable-space-goggles-69596vjpvg9wcr474-5502.app.github.dev",
        "https://probable-space-goggles-69596vjpvg9wcr474-8000.preview.app.github.dev",
    ],
    allow_credentials=False,  # IMPORTANT
    allow_methods=["*"],
    allow_headers=["*"],
)
from fastapi import Request
from fastapi.responses import JSONResponse

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)},
        headers={
            "Access-Control-Allow-Origin": "*",
        },
    )

# ===================== CSP (FIX FOR CODESPACES) =====================
class CSPMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)

        response.headers["Content-Security-Policy"] = (
            "default-src 'self' https: data: blob:; "
            "img-src 'self' https: data: blob:; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; "
            "style-src 'self' 'unsafe-inline' https:; "
            "connect-src 'self' https: ws: wss:; "
            "media-src 'self' https: blob:;"
        )

        return response

app.add_middleware(CSPMiddleware)




# ===================== ROUTERS =====================
app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
app.include_router(exams_router, prefix="/api/exams", tags=["Exams"])
app.include_router(monitoring_router, prefix="/api/monitoring", tags=["Monitoring"])
app.include_router(admin_router, prefix="/api/admin", tags=["Admin"])

# ===================== WEBSOCKET =====================
@app.websocket("/ws/monitoring/{student_id}/{exam_id}")
async def websocket_endpoint(websocket: WebSocket, student_id: str, exam_id: str):
    await manager.connect(websocket, student_id, exam_id)
    try:
        while True:
            data = await websocket.receive_json()
            await manager.process_data(student_id, exam_id, data)
    except WebSocketDisconnect:
        manager.disconnect(student_id, exam_id)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(student_id, exam_id)

# ===================== HEALTH =====================
@app.get("/")
async def root():
    return {
        "message": "Exam System Backend",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
        "endpoints": {
            "auth": "/api/auth",
            "exams": "/api/exams",
            "monitoring": "/api/monitoring",
            "admin": "/api/admin"
        }
    }

@app.get("/health")
async def health():
    return {"status": "healthy", "database": "connected"}
