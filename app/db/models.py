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
    client_intake_mode: Mapped[str] = mapped_column(String(40), nullable=False, default="pre_registered_only")
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
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    address: Mapped[str | None] = mapped_column(String(200), nullable=True)
    is_closed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    tags_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    memo: Mapped[str] = mapped_column(Text, nullable=False, default="")
    created_source: Mapped[str] = mapped_column(String(40), nullable=False, default="admin_manual")
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )


class AdminClientGroup(Base):
    __tablename__ = "admin_client_group"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    admin_user_id: Mapped[int] = mapped_column(ForeignKey("admin_user.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    color: Mapped[str] = mapped_column(String(20), nullable=False, default="#3b82f6")
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)


class AdminClientGroupMember(Base):
    __tablename__ = "admin_client_group_member"
    __table_args__ = (
        UniqueConstraint("group_id", "client_id", name="uq_group_member"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    group_id: Mapped[int] = mapped_column(ForeignKey("admin_client_group.id"), nullable=False, index=True)
    client_id: Mapped[int] = mapped_column(ForeignKey("admin_client.id"), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)


class AdminClientReport(Base):
    __tablename__ = "admin_client_report"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    admin_user_id: Mapped[int] = mapped_column(ForeignKey("admin_user.id"), nullable=False, index=True)
    client_id: Mapped[int] = mapped_column(ForeignKey("admin_client.id"), nullable=False, index=True)
    sections_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)


class AdminAssessmentLog(Base):
    __tablename__ = "admin_assessment_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    admin_user_id: Mapped[int] = mapped_column(ForeignKey("admin_user.id"), nullable=False, index=True)
    admin_client_id: Mapped[int] = mapped_column(ForeignKey("admin_client.id"), nullable=False, index=True)
    assessed_on: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)


class AdminClientAssignment(Base):
    __tablename__ = "admin_client_assignment"
    __table_args__ = (
        UniqueConstraint(
            "admin_user_id",
            "admin_client_id",
            "admin_custom_test_id",
            name="uq_admin_client_assignment_triplet",
        ),
    )

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
    client_id: Mapped[int | None] = mapped_column(ForeignKey("admin_client.id"), nullable=True, index=True)
    access_token: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    responder_name: Mapped[str] = mapped_column(String(80), nullable=False, default="")
    answers_json: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)


class AdminClientIdentityReview(Base):
    """애매 매칭 케이스에서 수검자 선택을 기록하고 관리자 사후 검토를 처리하는 테이블."""
    __tablename__ = "admin_client_identity_review"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    admin_user_id: Mapped[int] = mapped_column(ForeignKey("admin_user.id"), nullable=False, index=True)
    admin_custom_test_id: Mapped[int] = mapped_column(ForeignKey("child_test.id"), nullable=False, index=True)
    submission_id: Mapped[int | None] = mapped_column(ForeignKey("admin_custom_test_submission.id"), nullable=True, index=True)
    access_token: Mapped[str] = mapped_column(String(120), nullable=False)
    input_profile_json: Mapped[str] = mapped_column(Text, nullable=False, default="{}")
    candidate_client_ids_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    responder_choice: Mapped[str] = mapped_column(String(20), nullable=False)  # 'existing' | 'new'
    chosen_client_id: Mapped[int | None] = mapped_column(ForeignKey("admin_client.id"), nullable=True)
    provisional_client_id: Mapped[int | None] = mapped_column(ForeignKey("admin_client.id"), nullable=True)
    review_status: Mapped[str] = mapped_column(String(30), nullable=False, default="pending")  # pending | merged | confirmed_new | rejected
    reviewed_by: Mapped[int | None] = mapped_column(ForeignKey("admin_user.id"), nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)


class SubmissionScoringResult(Base):
    __tablename__ = "submission_scoring_result"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    admin_user_id: Mapped[int] = mapped_column(ForeignKey("admin_user.id"), nullable=False, index=True)
    admin_custom_test_id: Mapped[int] = mapped_column(ForeignKey("child_test.id"), nullable=False, index=True)
    client_id: Mapped[int | None] = mapped_column(ForeignKey("admin_client.id"), nullable=True, index=True)
    submission_id: Mapped[int] = mapped_column(ForeignKey("admin_custom_test_submission.id"), nullable=False, index=True)
    scoring_status: Mapped[str] = mapped_column(String(40), nullable=False, default="scored")
    result_json: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
