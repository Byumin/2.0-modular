# Client Intake Ambiguous Match - 수검자 즉시 진행 + 관리자 사후 검토 구현

## Task Title
- 애매 매칭 케이스 처리: 수검자 즉시 진행 + 관리자 사후 검토 흐름 구현

## Request Summary
- 검사 인적사항 입력 시 이름+성별은 일치하나 생년월일 없이 동일인 확정이 어려운 케이스를 처리한다.
- 수검자는 모달에서 선택 후 즉시 검사 진행 (차단 없음).
- 관리자는 사후 알람으로 검토 후 병합 또는 신규 확정을 처리한다.

## Goal
1. `AMBIGUOUS_CLIENT` 응답 + 수검자 선택 처리 백엔드 완성
2. `admin_client_identity_review` 테이블 및 관리자 검토 API 구현
3. 수검자 화면 AMBIGUOUS 모달 구현
4. 관리자 알람 배지 및 검토 화면 구현

## Initial Hypothesis
- 백엔드 `AMBIGUOUS_CLIENT` 코드와 candidates 반환은 이미 구현됨
- `responder_choice` 처리 및 review 레코드 저장, 관리자 검토 API가 미구현
- 프론트 수검자 모달, 관리자 검토 화면 미구현

## Spec Reference
- [docs/features/client-intake-phase2-ambiguous-match-spec.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/client-intake-phase2-ambiguous-match-spec.md)

## Initial Plan

### Phase 1: 문서 (완료)
1. `client-intake-phase2-ambiguous-match-spec.md` 전면 재작성
2. 본 실행 계획 문서 작성

### Phase 2: DB
3. `app/db/models.py` - `AdminClientIdentityReview` 모델 추가
4. `app/db/schema_migrations.py` - `ensure_admin_client_identity_review_table()` 추가
5. `app/main.py` - startup 마이그레이션 등록

### Phase 3: 백엔드
6. `app/repositories/identity_review_repository.py` 신규 작성
7. `app/services/admin/identity_reviews.py` 신규 작성
8. `app/schemas/assessment_links.py` - `responder_choice` 추가
9. `app/services/admin/assessment_links.py` - ambiguous 선택 처리 + review 생성
10. `app/router/identity_review_router.py` 신규 작성
11. `app/main.py` - 라우터 등록

### Phase 4: 프론트
12. `frontend/src/pages/assessment/steps/ProfileStep.tsx` - AMBIGUOUS 모달 추가
13. 관리자 알람 배지 (pending count) 추가
14. `frontend/src/pages/IdentityReviews.tsx` - 관리자 검토 화면 신규 작성

## Progress Updates

### Update 1
- Time: 2026-04-13
- Change: 스펙 문서 전면 재작성 및 실행 계획 문서 작성 완료
- Reason: 기존 Phase 2 스펙이 "관리자 승인 대기 → 수검자 차단" 방식이었으나, "수검자 즉시 진행 + 관리자 사후 검토" 방식으로 설계 전환

## Result
- (구현 완료 후 기재)

## Verification
- Checked:
- Not checked:
  - 이름+성별만 입력 → AMBIGUOUS 모달 동작
  - "기존 내담자" 선택 → 즉시 검사 진행
  - "신규 등록" 선택 → 즉시 검사 진행
  - 제출 후 `admin_client_identity_review` 레코드 생성
  - 관리자 알람 배지 pending count 반영
  - 관리자 병합 처리 후 submission client 재링크
  - 관리자 신규 확정 후 created_source 정규화

## Retrospective
### Classification
- (완료 후 기재)

### What Was Wrong
-

### Why
-

### Next Time
-

## Related Documents
- [docs/features/client-intake-phase2-ambiguous-match-spec.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/client-intake-phase2-ambiguous-match-spec.md)
- [docs/features/client-intake-policy.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/client-intake-policy.md)
- [docs/features/client-intake-phase1-spec.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/client-intake-phase1-spec.md)
- [AGENTS.md](/mnt/c/Users/user/workspace/2.0-modular/AGENTS.md)
- [docs/exec-plans/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/exec-plans/README.md)
- [QUALIT_SCORE.md](/mnt/c/Users/user/workspace/2.0-modular/QUALIT_SCORE.md)
