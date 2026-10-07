from pydantic import BaseModel, Field, field_validator


class WishesCreate(BaseModel):
    place: str = Field(min_length=1, max_length=300)
    gift: str = Field(min_length=1, max_length=300)
    topic: str = Field(min_length=1, max_length=300)
    message: str = Field(default="", max_length=2000)

    @field_validator("place", "gift", "topic", mode="before")
    @classmethod
    def clean_text(cls, value: object) -> str:
        if not isinstance(value, str):
            raise ValueError("Debe ser texto")
        value = " ".join(value.split())
        if not value:
            raise ValueError("La respuesta no puede estar vacía")
        return value

    @field_validator("message", mode="before")
    @classmethod
    def clean_message(cls, value: object) -> str:
        if not isinstance(value, str):
            raise ValueError("Debe ser texto")
        return value.strip()


class WishesSaved(BaseModel):
    id: int
    created_at: str
