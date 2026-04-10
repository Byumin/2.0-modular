# Execution Plan

## Task Title
- 커스텀 검사 생성 흐름 코드 정리 인터랙션 산출물 작성

## Request Summary
- `커스텀 검사 생성에 대해서 코드 정리해줘` 요청에 따라 현재 코드 기준 런타임 흐름을 인터랙션 웹으로 재구성한다.

## Goal
- 관리자 화면의 커스텀 검사 생성 기능을 프런트 이벤트, API 호출, 스키마 검증, 서비스 처리, DB 저장, 관리 목록 재구성까지 한 번에 이해할 수 있는 HTML 산출물로 정리한다.
- 최근 반영된 `실시구간 제외 확인` 분기와 추가 인적사항 검증도 흐름 안에 반영한다.

## Initial Hypothesis
- 시작점은 `static/admin.js`의 `initCreatePage()`와 생성 모달 제출 처리다.
- 서버 핵심은 `app/router/custom_test_router.py`의 `POST /api/admin/custom-tests` 와 `app/services/admin/custom_tests.py`의 `create_admin_custom_test_batch()`다.
- 관리 목록 재구성까지 보여주려면 `app/services/admin/common.py`의 `build_custom_test_items()` 흐름도 포함해야 한다.

## Initial Plan
1. 관련 문서, 템플릿, 실제 생성 코드 경로를 읽고 런타임 단계와 분기를 확정한다.
2. `artifacts/interactive-flows/` 아래 설명용 HTML 산출물을 만든다.
3. 산출물 구조, refs 표기, 데이터 예시, 분기 표시를 점검하고 계획 문서에 결과를 기록한다.

## Progress Updates
### Update 1
- Time: 2026-04-10 17:40 KST
- Change: 코드 정리 규칙, 템플릿, 생성 관련 프런트/백엔드 경로를 우선 확인했다.
- Reason: 이번 요청은 텍스트 설명이 아니라 인터랙션 웹 산출물이 기본 산출물이므로 구조 규칙을 먼저 고정해야 했다.

### Update 2
- Time: 2026-04-10 17:50 KST
- Change: 생성 흐름에 관리 목록 재조회와 `selected_scales_json` 기반 재구성 단계를 포함하기로 했다.
- Reason: 사용자가 실제로 궁금해할 것은 "생성 버튼 이후 무엇이 저장되고 다시 어떻게 보이는가"까지이므로 POST 처리만으로는 흐름 설명이 반쪽이 된다.

### Update 3
- Time: 2026-04-10 18:35 KST
- Change: 산출물 피드백을 바탕으로 예시 데이터의 실제값/가상값 구분, fold-card 본문 여백, glossary tooltip, tooltip clipping 방지 규칙을 문서에 추가했다.
- Reason: 같은 유형의 코드 정리 산출물에서 반복될 수 있는 UX/표현 문제라 템플릿 레벨 규칙으로 승격하는 편이 맞았다.

## Result
- `artifacts/interactive-flows/custom-test-create-flow.html` 산출물을 작성했다.
- 생성 흐름을 9개 단계로 분해했고, 성공 / 실시구간 제외 확인 / 클라이언트 검증 실패 / 서버 검증 실패 시나리오를 색상과 엣지로 분리했다.
- 설명 범위에 생성 후 관리 목록 재조회와 `selected_scales_json` 역파싱까지 포함했다.
- 후속 피드백을 반영해 `docs/interactive-flow-spec.md`, `docs/code-cleanup/playbook.md`에 코드 정리 산출물 품질 규칙을 보강했다.

## Verification
- Checked:
- 산출물 파일 생성 여부 확인
- 템플릿 placeholder 및 절대 경로 노출 여부 확인
- 시나리오 컨트롤, fold card, 실제 소스 기준점 문자열 포함 여부 확인
- inline script 파싱 확인(`new Function(...)`)
- 규칙 문서 반영 내용 확인
- Not checked:
- 브라우저 렌더링 캡처 확인
- 실제 서버 구동 후 산출물 UI 상호작용 스크린샷 검증

## Retrospective
### Classification
- `No Major Issue`

### What Was Wrong
- 이번 작업 자체의 큰 문제는 없었다.

### Why
- 생성 흐름 설명에서 저장 직후 UI가 다시 무엇을 읽는지까지 보여줘야 이해가 완성된다고 판단했고, 그 범위 조정이 적절했다.

### Next Time
- 인터랙션 산출물 검증용 로컬 정적 미리보기 스크립트나 캡처 루틴이 있으면 최종 확인이 더 빨라질 수 있다.

## Related Documents
- [Documentation Hub](/mnt/c/Users/user/workspace/2.0-modular/docs/README.md)
- [docs/exec-plans/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/exec-plans/README.md)
- [QUALIT_SCORE.md](/mnt/c/Users/user/workspace/2.0-modular/QUALIT_SCORE.md)
- [AGENTS.md](/mnt/c/Users/user/workspace/2.0-modular/AGENTS.md)
