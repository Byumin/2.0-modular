from pydantic import BaseModel


class ConsentTextIn(BaseModel):
    consent_text: str


class ConsentTextOut(BaseModel):
    consent_text: str


class SecurityNoticeTextIn(BaseModel):
    security_notice_text: str


class SecurityNoticeTextOut(BaseModel):
    security_notice_text: str
