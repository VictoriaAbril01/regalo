from fastapi import APIRouter, Depends, HTTPException, Request, status

from backend.schemas.wishes import WishesCreate, WishesSaved
from backend.services.wishes_service import WishesService

router = APIRouter()


def get_service(request: Request) -> WishesService:
    return request.app.state.wishes_service


@router.post("/wishes", response_model=WishesSaved, status_code=status.HTTP_201_CREATED)
def create_wishes(
    wishes: WishesCreate, service: WishesService = Depends(get_service)
) -> WishesSaved:
    try:
        return service.create(wishes)
    except Exception as exc:
        raise HTTPException(status_code=503, detail="No se pudo completar. Inténtalo de nuevo.") from exc
