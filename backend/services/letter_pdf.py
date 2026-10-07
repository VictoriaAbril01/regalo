import io
import re
from html import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph, SimpleDocTemplate


INK = colors.HexColor("#4B3328")


def _rich_text(paragraph: str) -> str:
    pieces = re.split(r"(\*\*.*?\*\*)", paragraph, flags=re.DOTALL)
    return "".join(
        f"<b>{escape(piece[2:-2])}</b>" if piece.startswith("**") and piece.endswith("**")
        else escape(piece)
        for piece in pieces
    )


def build_letter_pdf(letter: str) -> bytes:
    buffer = io.BytesIO()
    document = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=58,
        leftMargin=58,
        topMargin=58,
        bottomMargin=58,
        title="Para el amor de mi vida",
    )
    title_style = ParagraphStyle(
        "LetterTitle", fontName="Times-Bold", fontSize=22, leading=28,
        textColor=INK, alignment=TA_LEFT, spaceAfter=24,
    )
    body_style = ParagraphStyle(
        "LetterBody", fontName="Times-Roman", fontSize=11.5, leading=18,
        textColor=INK, alignment=TA_LEFT, spaceAfter=16,
    )
    closing_style = ParagraphStyle(
        "LetterClosing", parent=body_style, fontName="Times-Italic",
        fontSize=16, leading=23, spaceBefore=14,
    )
    paragraphs = [part.strip() for part in re.split(r"\n\s*\n", letter.strip()) if part.strip()]
    story = []
    for index, part in enumerate(paragraphs):
        style = title_style if index == 0 else closing_style if index == len(paragraphs) - 1 else body_style
        story.append(Paragraph(_rich_text(part).replace("\n", "<br/>"), style))
    document.build(story)
    return buffer.getvalue()
