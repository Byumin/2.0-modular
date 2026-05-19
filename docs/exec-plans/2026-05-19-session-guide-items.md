# Execution Plan

## Task Title
- 세션별 검사 안내 항목 편집 기능 추가

## Request Summary
- 검사 생성 시 세션별 검사 안내 화면 안의 문구를 수정하고 안내 항목을 추가/삭제할 수 있게 한다.

## Goal
- 관리자 검사 생성 플로우에서 세션별 안내 제목, 설명, 안내사항 목록을 함께 설정한다.
- 수검자 세션 안내 화면은 저장된 세션별 안내사항이 있으면 해당 목록을 표시한다.
- 기존 생성 데이터와 호환되도록 기본 안내사항 fallback은 유지한다.

## Preflight Checklist
- [x] `AGENTS.md` 확인
- [x] 작업 종류별 source-of-truth 확인:
  - 코드/구조: 기존 관련 소스 직접 확인
  - DB: 별도 스키마 변경 없이 기존 JSON 구조 확장
  - UI/디자인: `DESIGN.md`, `QUALIT_SCORE.md`
  - 문서 체계: `docs/doc-governance.md`
  - 설명/디버깅: 해당 없음
  - 코드 정리 산출물: 해당 없음
- [x] 운영 DB가 필요한 작업이면 루트 `modular.db` 기준 확인
- [x] 검증 방법과 미검증 가능 항목 정의

## Initial Hypothesis
- 세션 정보는 `selected_scales_json.__sessions`에 JSON으로 저장되므로 DB 컬럼 추가 없이 `guide_items` 배열을 추가할 수 있다.
- 현재 수검자 안내 화면은 `IntroStep`의 공통 `TIPS`를 사용하므로, 세션별 `guide_items`가 있을 때만 대체 표시하면 기존 링크와 호환된다.

## Initial Plan
1. 백엔드 요청 스키마와 세션 정규화 로직에 `guide_items` 배열을 추가한다.
2. 관리자 검사 생성 세션 구성 UI에 안내사항 항목 편집 UI를 추가한다.
3. 수검자 타입과 `IntroStep`이 세션별 `guide_items`를 우선 표시하도록 수정한다.
4. 타입체크/빌드 또는 가능한 검증을 실행하고 결과를 기록한다.

## Progress Updates
### Update 1
- Time: 2026-05-19 19:13:26 KST
- Change: 관련 문서와 세션 생성/렌더링 코드 경로를 확인했다.
- Reason: 세션 안내 문구가 저장 데이터인지 하드코딩인지 구분하고 영향 범위를 좁히기 위해서다.

### Update 2
- Time: 2026-05-19 19:20:00 KST
- Change: `session_configs`에 `guide_items` 배열을 추가하고 관리자 생성 UI와 수검자 `IntroStep` 렌더링을 연결했다.
- Reason: 세션별 안내사항을 검사 생성 시점에 설정하고, 기존 데이터는 기본 안내사항 fallback으로 유지하기 위해서다.

## Result
- 관리자 검사 생성 세션 구성 단계에서 세션별 안내사항을 추가, 수정, 삭제할 수 있게 했다.
- 생성 요청 payload, 백엔드 스키마, 세션 정규화, 수검자 payload, 수검자 안내 화면 타입/렌더링을 `guide_items` 기준으로 연결했다.
- 기존 검사처럼 `guide_items`가 없거나 비어 있으면 기존 기본 안내사항을 표시한다.

## Verification
- Checked:
  - `.venv/bin/python -m py_compile app/schemas/custom_tests.py app/services/admin/common.py app/services/admin/custom_tests.py app/services/admin/assessment_links.py`
  - `.venv/bin/python`으로 `normalize_custom_test_session_configs`가 `guide_items`를 trim/filter 해서 보존하는지 확인
  - Vite dev server에서 `/admin/create`와 검사 생성 모달 1단계 렌더링 스크린샷 확인
- Not checked:
  - `npm run build`는 기존 `ProfileStep.tsx` 타입/미사용 오류와 기존 `TestManagement.tsx` 미사용 `createSummary` 오류로 실패했다.
  - 실제 백엔드 데이터가 비어 있어 세션 구성 3단계까지 브라우저로 완전 진입 검증하지 못했다.

## Retrospective
### Classification
- `No Major Issue`

### What Was Wrong
- 빌드 검증이 기존 타입 오류 때문에 전체 통과하지 못했다.

### Why
- 실패 지점은 이번 변경 필드와 직접 관련 없는 `ProfileStep.tsx` 기존 오류가 포함되어 있다.

### Next Time
- 세션 구성 UI의 실제 브라우저 검증은 기반 검사 catalog가 로드되는 개발 데이터 상태에서 다시 확인한다.

## Related Documents
- [Documentation Hub](/mnt/c/Users/user/workspace/2.0-modular/docs/README.md)
- [docs/exec-plans/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/exec-plans/README.md)
- [QUALIT_SCORE.md](/mnt/c/Users/user/workspace/2.0-modular/QUALIT_SCORE.md)
- [AGENTS.md](/mnt/c/Users/user/workspace/2.0-modular/AGENTS.md)
