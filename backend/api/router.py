from fastapi import APIRouter

from backend.api.wishes import router as wishes_router
from backend.api.letter import router as letter_router

router = APIRouter(prefix="/api")
router.include_router(wishes_router)
router.include_router(letter_router)


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
