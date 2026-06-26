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
    session_configs_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    additional_profile_fields_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    requires_consent: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    consent_text: Mapped[str] = mapped_column(Text, nullable=False, default="")
    requires_security_notice: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    show_research_notice: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    allow_unanswered_submission: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    show_report_result: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)


class AdminCustomTestSource(Base):
    __tablename__ = "admin_custom_test_source"
    __table_args__ = (
        UniqueConstraint("custom_test_id", "source_test_id", name="uq_custom_test_source"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    custom_test_id: Mapped[int] = mapped_column(ForeignKey("child_test.id"), nullable=False, index=True)
    source_test_id: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    source_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)


class AdminCustomTestScaleSelection(Base):
    __tablename__ = "admin_custom_test_scale_selection"
    __table_args__ = (
        UniqueConstraint("custom_test_source_id", "scale_code", name="uq_custom_test_scale_selection"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    custom_test_source_id: Mapped[int] = mapped_column(ForeignKey("admin_custom_test_source.id"), nullable=False, index=True)
    scale_code: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    selected_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)


class AdminCustomTestVariantProjection(Base):
    __tablename__ = "admin_custom_test_variant_projection"
    __table_args__ = (
        UniqueConstraint(
            "custom_test_source_id",
            "condition_hash",
            "generated_from_hash",
            name="uq_custom_test_variant_projection_hash",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    custom_test_source_id: Mapped[int] = mapped_column(ForeignKey("admin_custom_test_source.id"), nullable=False, index=True)
    condition_hash: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    eligibility_condition_json: Mapped[str] = mapped_column(Text, nullable=False)
    generated_from_hash: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    is_current: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, index=True)
    status: Mapped[str] = mapped_column(String(40), nullable=False, default="current")
    generated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)


class AdminCustomTestSourceDependency(Base):
    __tablename__ = "admin_custom_test_source_dependency"
    __table_args__ = (
        UniqueConstraint(
            "custom_test_source_id",
            "dependency_type",
            "dependency_id",
            name="uq_custom_test_source_dependency",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    custom_test_source_id: Mapped[int] = mapped_column(ForeignKey("admin_custom_test_source.id"), nullable=False, index=True)
    dependency_type: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    dependency_id: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    dependency_hash: Mapped[str] = mapped_column(String(128), nullable=False)
    observed_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)


class AdminCustomTestVariantScaleProjection(Base):
    __tablename__ = "admin_custom_test_variant_scale_projection"
    __table_args__ = (
        UniqueConstraint("variant_projection_id", "scale_code", name="uq_custom_test_variant_scale_projection"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    variant_projection_id: Mapped[int] = mapped_column(ForeignKey("admin_custom_test_variant_projection.id"), nullable=False, index=True)
    scale_code: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    availability_status: Mapped[str] = mapped_column(String(40), nullable=False, default="selected", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)


class AdminCustomTestSession(Base):
    __tablename__ = "admin_custom_test_session"
    __table_args__ = (
        UniqueConstraint("custom_test_id", "session_index", name="uq_custom_test_session_index"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    custom_test_id: Mapped[int] = mapped_column(ForeignKey("child_test.id"), nullable=False, index=True)
    session_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    title: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    guide_items_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)


class AdminCustomTestSessionSource(Base):
    __tablename__ = "admin_custom_test_session_source"
    __table_args__ = (
        UniqueConstraint("session_id", "custom_test_source_id", name="uq_custom_test_session_source"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("admin_custom_test_session.id"), nullable=False, index=True)
    custom_test_source_id: Mapped[int] = mapped_column(ForeignKey("admin_custom_test_source.id"), nullable=False, index=True)
    display_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)


class AdminCustomTestProfileField(Base):
    __tablename__ = "admin_custom_test_profile_field"
    __table_args__ = (
        UniqueConstraint("custom_test_id", "field_key", name="uq_custom_test_profile_field"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    custom_test_id: Mapped[int] = mapped_column(ForeignKey("child_test.id"), nullable=False, index=True)
    field_key: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    label: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    input_type: Mapped[str] = mapped_column(String(40), nullable=False, default="text")
    required: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    options_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    display_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
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
    match_field_keys_json: Mapped[str] = mapped_column(Text, nullable=False, default='["name"]')
    allow_unanswered_submission: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    show_report_result: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)


class AssessmentLinkPreRegisteredClient(Base):
    __tablename__ = "assessment_link_pre_registered_client"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    access_link_id: Mapped[int] = mapped_column(ForeignKey("admin_custom_test_access_link.id"), nullable=False, index=True)
    admin_user_id: Mapped[int] = mapped_column(ForeignKey("admin_user.id"), nullable=False, index=True)
    profile_data_json: Mapped[str] = mapped_column(Text, nullable=False, default="{}")
    provisional_client_id: Mapped[int | None] = mapped_column(ForeignKey("admin_client.id"), nullable=True)
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


class SubmissionCustomTestSnapshot(Base):
    __tablename__ = "submission_custom_test_snapshot"
    __table_args__ = (
        UniqueConstraint("submission_id", name="uq_submission_custom_test_snapshot_submission"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    submission_id: Mapped[int] = mapped_column(ForeignKey("admin_custom_test_submission.id"), nullable=False, index=True)
    custom_test_id: Mapped[int] = mapped_column(ForeignKey("child_test.id"), nullable=False, index=True)
    source_test_ids_snapshot_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    variant_projection_snapshot_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    selected_scales_snapshot_json: Mapped[str] = mapped_column(Text, nullable=False, default="{}")
    session_configs_snapshot_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    profile_fields_snapshot_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    source_dependency_hash_snapshot: Mapped[str] = mapped_column(String(128), nullable=False, default="")
    snapshot_source: Mapped[str] = mapped_column(String(40), nullable=False, default="submission_time")
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)


class AdminAssessmentDraft(Base):
    __tablename__ = "admin_assessment_draft"
    __table_args__ = (
        UniqueConstraint(
            "admin_user_id",
            "admin_custom_test_id",
            "admin_client_id",
            name="uq_admin_assessment_draft_client_test",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    admin_user_id: Mapped[int] = mapped_column(ForeignKey("admin_user.id"), nullable=False, index=True)
    admin_custom_test_id: Mapped[int] = mapped_column(ForeignKey("child_test.id"), nullable=False, index=True)
    admin_client_id: Mapped[int] = mapped_column(ForeignKey("admin_client.id"), nullable=False, index=True)
    access_token: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    profile_json: Mapped[str] = mapped_column(Text, nullable=False, default="{}")
    answers_json: Mapped[str] = mapped_column(Text, nullable=False, default="{}")
    current_part_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    current_page: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_ambiguous_match: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    responder_choice: Mapped[str | None] = mapped_column(String(20), nullable=True)
    candidate_client_ids_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )
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


class AdminClientRelation(Base):
    """내담자 간 관계 (부모-자녀, 선생-학생 등)를 기록하는 테이블."""
    __tablename__ = "admin_client_relation"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    admin_user_id: Mapped[int] = mapped_column(ForeignKey("admin_user.id"), nullable=False, index=True)
    client_id_a: Mapped[int] = mapped_column(ForeignKey("admin_client.id"), nullable=False, index=True)
    role_a: Mapped[str] = mapped_column(String(50), nullable=False)
    client_id_b: Mapped[int] = mapped_column(ForeignKey("admin_client.id"), nullable=False, index=True)
    role_b: Mapped[str] = mapped_column(String(50), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)


class AdminSettings(Base):
    __tablename__ = "admin_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    admin_user_id: Mapped[int] = mapped_column(ForeignKey("admin_user.id"), nullable=False, unique=True, index=True)
    consent_text: Mapped[str] = mapped_column(Text, nullable=False, default="")
    security_notice_text: Mapped[str] = mapped_column(Text, nullable=False, default="")
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class ClientConsentRecord(Base):
    __tablename__ = "client_consent_record"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    admin_user_id: Mapped[int] = mapped_column(ForeignKey("admin_user.id"), nullable=False, index=True)
    admin_client_id: Mapped[int] = mapped_column(ForeignKey("admin_client.id"), nullable=False, index=True)
    admin_custom_test_id: Mapped[int] = mapped_column(ForeignKey("child_test.id"), nullable=False, index=True)
    consented: Mapped[bool] = mapped_column(Boolean, nullable=False)
    consented_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)


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
