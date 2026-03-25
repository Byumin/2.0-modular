from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class AdminUser(Base):
    __tablename__ = "admin_user"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String(50), nullable=False, unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(128), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)

# child_test 테이블의 row 조회
class AdminCustomTest(Base):
    __tablename__ = "child_test"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    admin_user_id: Mapped[int] = mapped_column(ForeignKey("admin_user.id"), nullable=False, index=True)
    test_id: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    sub_test_json: Mapped[str] = mapped_column(Text, nullable=False)
    custom_test_name: Mapped[str] = mapped_column(String(120), nullable=False)
    selected_scales_json: Mapped[str] = mapped_column(Text, nullable=False)
    additional_profile_fields_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)


class AdminClient(Base):
    __tablename__ = "admin_client"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    admin_user_id: Mapped[int] = mapped_column(ForeignKey("admin_user.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    gender: Mapped[str] = mapped_column(String(10), nullable=False)
    birth_day: Mapped[date | None] = mapped_column(Date, nullable=True)
    memo: Mapped[str] = mapped_column(Text, nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )


class AdminAssessmentLog(Base):
    __tablename__ = "admin_assessment_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    admin_user_id: Mapped[int] = mapped_column(ForeignKey("admin_user.id"), nullable=False, index=True)
    admin_client_id: Mapped[int] = mapped_column(ForeignKey("admin_client.id"), nullable=False, index=True)
    assessed_on: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)


class AdminClientAssignment(Base):
    __tablename__ = "admin_client_assignment"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    admin_user_id: Mapped[int] = mapped_column(ForeignKey("admin_user.id"), nullable=False, index=True)
    admin_client_id: Mapped[int] = mapped_column(ForeignKey("admin_client.id"), nullable=False, index=True)
    admin_custom_test_id: Mapped[int] = mapped_column(ForeignKey("child_test.id"), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)


class AdminCustomTestAccessLink(Base):
    __tablename__ = "admin_custom_test_access_link"
    __table_args__ = (
        UniqueConstraint("access_token", name="uq_admin_custom_test_access_token"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    admin_user_id: Mapped[int] = mapped_column(ForeignKey("admin_user.id"), nullable=False, index=True)
    admin_custom_test_id: Mapped[int] = mapped_column(ForeignKey("child_test.id"), nullable=False, index=True)
    access_token: Mapped[str] = mapped_column(String(120), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)


class AdminCustomTestSubmission(Base):
    __tablename__ = "admin_custom_test_submission"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    admin_user_id: Mapped[int] = mapped_column(ForeignKey("admin_user.id"), nullable=False, index=True)
    admin_custom_test_id: Mapped[int] = mapped_column(ForeignKey("child_test.id"), nullable=False, index=True)
    access_token: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    responder_name: Mapped[str] = mapped_column(String(80), nullable=False, default="")
    answers_json: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
