from fastapi import APIRouter
from fastapi.responses import Response

from backend.schemas.letter import LetterPdfRequest
from backend.services.letter_pdf import build_letter_pdf

router = APIRouter()


@router.post("/letter.pdf")
def download_letter(request: LetterPdfRequest) -> Response:
    return Response(
        content=build_letter_pdf(request.letter),
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="Carta_para_Sebastian.pdf"'},
    )
