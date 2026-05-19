# Execution Plan

## Task Title
- 문서 source-of-truth와 현재 소스 미싱크 2차 동기화

## Request Summary
- 현재 소스/서비스/스펙 기준으로 AGENTS.md, ARCHITECTURE.md, docs/database/runtime-db.md, docs/features/ 허브에서 반영이 빠진 부분을 확인하고, 운영 기준 문서만 먼저 동기화한다.

## Goal
- `docs/database/runtime-db.md`의 Startup Behavior 단계 목록을 실제 `app/main.py` on_startup 순서와 일치시킨다.
- `ARCHITECTURE.md`의 라우터 나열과 Main Domains 목록을 실제 운영 중인 도메인 기준으로 갱신한다.
- 문서 누락이 확인된 기능(`identity-review`, `assessment draft`, `admin settings`)은 feature 허브(`docs/features/README.md`) 기준으로 후속 작성 항목만 명시해둔다. 본 실행에서 feature 상세 문서까지는 작성하지 않는다.
- 기능 동작에는 영향이 없는 문서 동기화 작업으로 한정한다. 코드 변경은 하지 않는다.

## Initial Hypothesis
- 가장 심각한 미싱크는 DB 운영 기준 source-of-truth로 지정된 `docs/database/runtime-db.md`의 Startup Behavior 항목 수가 실제 호출 수보다 1개 부족하다는 것이다 (2026-04-20 `ensure_admin_assessment_draft_table` 추가 누락).
- `ARCHITECTURE.md`의 라우터 목록(8개)과 실제 등록 라우터(10개) 사이의 차이는 문서가 신규 도메인(동일인 검토, 관리자 설정) 추가를 따라잡지 못한 결과다.
- feature 허브에 identity-review / assessment-draft / admin-settings 관련 entry가 없는 것은 별도 후속 작업이 필요하며 본 실행에서는 한 번에 같이 하지 않는다.

## Initial Plan
1. `docs/database/runtime-db.md` Startup Behavior 목록에 `ensure_admin_assessment_draft_table`을 실제 호출 순서(rotate 이전) 위치에 삽입한다.
2. `ARCHITECTURE.md` "Directory Responsibilities > app/router/" 섹션에 `identity_review_router`, `settings_router`를 추가한다.
3. `ARCHITECTURE.md` "Main Domains" 섹션에 누락된 도메인(동일인 검토, 관리자 설정, 개인정보 동의, 내담자 그룹, 검사 실시 임시저장)을 추가한다.
4. `ARCHITECTURE.md` "Startup Responsibilities" 항목 설명에 draft 표현이 포함되도록 보정한다 (세부 순서는 runtime-db.md가 source-of-truth이므로 중복 본문은 피한다).
5. 변경 결과를 다시 원본 코드와 대조해 실제 호출 순서/등록 순서와 차이 없는지 검증한다.

## Progress Updates
### Update 1
- Time: 2026-04-21
- Change: 실행 계획 초안 작성
- Reason: 문서 갱신 범위를 운영 기준 문서(runtime-db.md, ARCHITECTURE.md)로 한정하고 feature 상세 문서는 후속 작업으로 분리하기 위함

### Update 2
- Time: 2026-04-21
- Change: `docs/database/runtime-db.md` Startup Behavior에 15번 `ensure_admin_assessment_draft_table` 삽입, 기존 rotate는 16번으로 이동
- Reason: 실제 `app/main.py:106` 호출 순서와 맞추기 위함

### Update 3
- Time: 2026-04-21
- Change: `ARCHITECTURE.md` Directory Responsibilities의 `app/router/` 목록에 `identity_review_router.py`, `settings_router.py` 추가. `assessment_link_router.py` 설명에 임시저장 API 포함 언급 추가.
- Reason: `app/main.py:30`, `app/main.py:34`에서 실제로 등록 중인 라우터가 문서에 빠져 있었음

### Update 4
- Time: 2026-04-21
- Change: `ARCHITECTURE.md` Main Domains에 섹션 추가 — Assessment Link에 임시저장 항목, Client Management에 그룹 항목, 신규 4-1 Client Identity Review, 4-2 Privacy Consent, 8 Admin Settings
- Reason: 실제 운영 기능이 7개 도메인 설명만으로는 드러나지 않았음

### Update 5
- Time: 2026-04-21
- Change: `ARCHITECTURE.md` Startup Responsibilities 요약 문구에 "검사 실시 임시저장" 표현 추가하고 실제 순서는 runtime-db.md를 기준으로 보라는 링크를 명시
- Reason: 상세 순서는 source-of-truth인 runtime-db.md에 한 곳만 두고 중복 복제를 피하기 위함 (doc-governance의 Anti-Duplication Rule 준수)

## Result
- `docs/database/runtime-db.md` Startup Behavior 목록이 실제 `app/main.py` 호출 순서와 일치하게 되었다.
- `ARCHITECTURE.md`의 라우터 나열과 Main Domains가 현재 운영 도메인을 반영한다.
- 코드는 수정하지 않았다. 문서만 변경.
- 후속 작업 목록: (1) `docs/features/` 아래 identity-review / assessment-draft / admin-settings 상세 feature 문서 신규 작성, (2) AGENTS.md React browser route 열거 중 `/admin/workspace`, `/admin/identity-reviews` 등 주요 하위 경로 보강 검토.

## Verification
- Checked:
  - `app/main.py` on_startup 호출 순서와 `docs/database/runtime-db.md` Startup Behavior 항목 대조
  - `app/main.py` include_router 목록과 `ARCHITECTURE.md` Directory Responsibilities 라우터 나열 대조
  - `app/db/models.py` 주요 도메인 테이블과 `ARCHITECTURE.md` Main Domains 대조
- Not checked:
  - feature 허브 상세 문서 추가 (후속 작업)
  - AGENTS.md React browser route 상세 경로 보강 (후속 작업)

## Retrospective
### Classification
- `No Major Issue`

### What Was Wrong
- 이전 문서 동기화 작업(2026-04-18) 이후 2026-04-20에 `admin_assessment_draft`, `settings_router`, `identity_review_router` 관련 기능이 들어왔지만 source-of-truth인 `docs/database/runtime-db.md`와 `ARCHITECTURE.md`에 반영되지 않고 남아 있었다.

### Why
- 개별 기능 exec-plan은 해당 기능 범위 내 문서만 갱신하고, 전반적인 아키텍처/DB 운영 문서까지 같이 건드리지 않았기 때문이다.

### Next Time
- 새 라우터가 등록되거나 새 startup 보정 함수가 추가될 때, 해당 기능의 exec-plan 체크리스트에 `ARCHITECTURE.md` 라우터 목록 / `docs/database/runtime-db.md` Startup Behavior 반영 여부를 항목으로 포함시키면 재발을 줄일 수 있다.

## Related Documents
- [Documentation Hub](/mnt/c/Users/user/workspace/2.0-modular/docs/README.md)
- [docs/exec-plans/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/exec-plans/README.md)
- [QUALIT_SCORE.md](/mnt/c/Users/user/workspace/2.0-modular/QUALIT_SCORE.md)
- [AGENTS.md](/mnt/c/Users/user/workspace/2.0-modular/AGENTS.md)
- [ARCHITECTURE.md](/mnt/c/Users/user/workspace/2.0-modular/ARCHITECTURE.md)
- [docs/database/runtime-db.md](/mnt/c/Users/user/workspace/2.0-modular/docs/database/runtime-db.md)
