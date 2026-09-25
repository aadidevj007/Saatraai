from fastapi import APIRouter

from app.api.routes import auth, executions, images, investigations, projects, tools, users

api_router = APIRouter(prefix="/api")
api_router.include_router(auth.router, prefix="/v1", tags=["authentication"])
api_router.include_router(users.router, prefix="/v1")
api_router.include_router(investigations.router, prefix="/v1", tags=["investigations"])
api_router.include_router(projects.router, prefix="/v1", tags=["projects"])
api_router.include_router(images.router, prefix="/v1", tags=["images"])
api_router.include_router(tools.router, prefix="/v1", tags=["tools"])
api_router.include_router(executions.router, prefix="/v1", tags=["executions"])
