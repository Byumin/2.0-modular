# Execution Plan

## Task Title
- 검사 실시 범위 검증을 auto-create 확인보다 먼저 수행

## Request Summary
- 특정 실시 링크에 연결된 4개 검사별 실시 범위를 확인한다.
- 실시 범위를 벗어나는 프로필은 auto-create 내담자 확인보다 먼저 범위 오류로 막히도록 순서를 바꾼다.

## Goal
- `validate-profile` 흐름에서 프로필이 검사 실시 범위를 벗어나면 `AUTO_CREATE_CONFIRM_REQUIRED`가 아니라 검사 구간 불일치 오류가 먼저 반환되게 한다.
- 기존 정상 범위 프로필은 기존 내담자 매칭/auto-create 흐름을 유지한다.

## Preflight Checklist
- [x] `AGENTS.md` 확인
- [x] 작업 종류별 source-of-truth 확인:
  - 코드/구조: `ARCHITECTURE.md`
  - DB: `docs/database/runtime-db.md`
  - UI/디자인: 해당 없음
  - 문서 체계: 해당 없음
  - 설명/디버깅: `docs/debug/explanation-rule.md`
  - 코드 정리 산출물: 해당 없음
- [x] 운영 DB가 필요한 작업이면 RDS PostgreSQL 기준 확인
- [x] 검증 방법과 미검증 가능 항목 정의

## Initial Hypothesis
- 현재 `validate_custom_test_profile_by_access_link()`는 내담자 매칭/auto-create 확인을 먼저 수행하고, 이후 문항 payload 생성 시점에 실시 범위를 검증한다.
- `build_custom_assessment_question_payload()`를 내담자 매칭 전에 호출해 범위 검증을 선행하면 요구사항을 만족할 수 있다.

## Initial Plan
1. 운영 DB에서 해당 링크의 검사별 실시 범위를 확인한다.
2. `validate_custom_test_profile_by_access_link()`에서 문항 payload 생성을 내담자 매칭보다 앞당긴다.
3. 기존 반환 payload는 선계산한 `assessment_payload`를 재사용한다.
4. 범위 밖/범위 안 케이스와 실제 API 응답을 검증한다.

## Progress Updates
### Update 1
- Time: 2026-05-20
- Change: 해당 링크의 검사별 범위를 RDS 기준으로 조회했다.
- Reason: 변경 전 실제 조건을 명확히 하기 위해서다.

### Update 2
- Time: 2026-05-20
- Change: `validate_custom_test_profile_by_access_link()`에서 문항 payload 생성 및 실시구간 검증을 내담자 매칭/auto-create 확인보다 먼저 수행하도록 변경했다.
- Reason: 실시 범위를 벗어난 프로필은 신규 등록 확인 전에 범위 오류로 막아야 하기 때문이다.

## Result
- 실시 범위 밖 프로필은 `AUTO_CREATE_CONFIRM_REQUIRED`가 아니라 검사별 구간 불일치 `400` 오류를 먼저 반환한다.
- 실시 범위 안 프로필은 기존처럼 내담자 매칭 또는 auto-create 확인 흐름으로 진행한다.

## Verification
- Checked:
  - `python -m compileall app/services/admin/assessment_links.py`
  - 운영 RDS 데이터 기준 서비스 직접 호출:
    - `20세 1개월` 프로필: `(PCT) 입력한 인적정보와 일치하는 검사 구간이 없습니다.`
    - 정상 범위 신규 프로필: `AUTO_CREATE_CONFIRM_REQUIRED`
    - `informant=teacher`: `(PAT-2) 입력한 인적정보와 일치하는 검사 구간이 없습니다.`
- Not checked:
  - 운영 프로세스 재시작 후 실제 공개 도메인 API 응답 확인

## Retrospective
### Classification
- `No Major Issue`

### What Was Wrong
- 기존 흐름은 auto-create 내담자 확인이 문항 payload 생성보다 앞에 있어 범위 밖 프로필도 먼저 신규 등록 확인을 받았다.

### Why
- 실시구간 검증이 `build_custom_assessment_question_payload()` 내부에 있었고, 이 함수가 client 확정 이후에 호출되고 있었다.

### Next Time
- 사용자 입력의 도메인 유효성 검증은 계정/내담자 생성 또는 확인 흐름보다 먼저 배치한다.

## Related Documents
- [AGENTS.md](../../AGENTS.md)
- [docs/exec-plans/README.md](README.md)
- [docs/database/runtime-db.md](../database/runtime-db.md)
- [docs/debug/explanation-rule.md](../debug/explanation-rule.md)
