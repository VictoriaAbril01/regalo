from pydantic import BaseModel, Field


class LetterPdfRequest(BaseModel):
    letter: str = Field(min_length=1, max_length=15000)
