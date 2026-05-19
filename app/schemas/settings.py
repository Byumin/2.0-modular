from pydantic import BaseModel


class ConsentTextIn(BaseModel):
    consent_text: str


class ConsentTextOut(BaseModel):
    consent_text: str
