from fastapi import APIRouter
from app.api.v1.endpoints import auth, documents, search, users, dashboard

api_router = APIRouter()

# Auth endpoints
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])

# User endpoints
api_router.include_router(users.router, prefix="/users", tags=["users"])

# Document endpoints
api_router.include_router(documents.router, prefix="/documents", tags=["documents"])

# Search endpoints
api_router.include_router(search.router, prefix="/search", tags=["search"])

# Dashboard endpoints
api_router.include_router(dashboard.router, tags=["dashboard"]) 