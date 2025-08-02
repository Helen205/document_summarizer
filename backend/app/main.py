from fastapi import FastAPI, HTTPException, status, Request
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uvicorn
from loguru import logger
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.core.database import engine, Base
from app.api.v1.api import api_router 
from app.core.security import get_current_user 
from prometheus_fastapi_instrumentator import Instrumentator
from fastapi.staticfiles import StaticFiles


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting DMS application...")
    
    try:
        logger.info("Database tables created successfully (if not already existing)")
    except Exception as e:
        logger.warning(f"Database initialization failed (this is normal in test environment): {e}")
    
    yield
    
    logger.info("Shutting down DMS application...")

def create_app() -> FastAPI:
    app_instance = FastAPI(
        title="DMS API",
        description="RAG Destekli Doküman Yönetim Sistemi API",
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan
    )

    app_instance.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_HOSTS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app_instance.mount("/uploads", StaticFiles(directory=settings.STORAGE_PATH), name="uploads")

    instrumentator = Instrumentator()
    instrumentator.instrument(app_instance).expose(app_instance)

    app_instance.include_router(api_router, prefix="/api/v1")

    @app_instance.get("/health")
    async def health_check():
        return {"status": "healthy", "message": "DMS API is running"}

    @app_instance.get("/")
    async def root():
        return {
            "message": "RAG Destekli Doküman Yönetim Sistemi API",
            "version": "1.0.0",
            "docs": "/docs"
        }

    # 404 handler
    @app_instance.exception_handler(404)
    async def not_found_handler(request: Request, exc: HTTPException):
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"error": "Endpoint not found", "detail": "The requested endpoint does not exist"}
        )

    # 500 handler
    @app_instance.exception_handler(500)
    async def internal_error_handler(request: Request, exc: Exception): 
        logger.error("Internal server error: {}", str(exc), exc_info=True) 
        return JSONResponse( 
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"error": "Internal server error", "detail": "An unexpected error occurred"},
        )
    
    return app_instance

app = create_app()

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )