# Execution Plan

## Task Title
- 관리자 로그인 검증과 세션 생성 인터랙션 웹 시범본 생성

## Request Summary
- `코드 정리` 인터랙션 웹 규칙의 시범본으로, 관리자 로그인 검증부터 세션 생성까지의 실제 런타임 흐름을 클릭형 HTML 산출물로 만들어 달라는 요청.

## Goal
- 관리자 로그인 관련 실제 코드 흐름을 추적한다.
- 로그인 요청, 비밀번호 검증, 세션 생성, 쿠키 설정, 응답 반환까지를 단계별 인터랙션으로 보여주는 HTML 산출물을 만든다.
- 사람이 이해하기 쉬운 샘플 요청/응답/DB 상태 예시를 포함한다.

## Initial Hypothesis
- 관리자 로그인 흐름은 정적 관리자 페이지의 JavaScript 요청에서 시작해 `auth_router`, 스키마, 인증 서비스, 세션 저장, 쿠키 설정으로 이어질 가능성이 높다.
- 인터랙션 웹은 타임라인, 단계 카드, 예시 payload, 성공/실패 분기 섹션을 포함하면 이해하기 쉬울 것이다.

## Initial Plan
1. 로그인 시작점 HTML/JS와 API 진입점을 확인한다.
2. 라우터, 스키마, 서비스, 저장소/DB 흐름을 추적한다.
3. 설명용 샘플 데이터와 성공/실패 시나리오를 정리한다.
4. `artifacts/interactive-flows/`에 클릭형 HTML 시범본을 만든다.
5. 결과를 검토하고 계획 문서를 업데이트한다.

## Progress Updates
### Update 1
- Time: 2026-04-09 16:18 KST
- Change: 실행 계획 문서 작성
- Reason: 실제 산출물 생성 전 계획과 추적 범위를 먼저 고정한다.

### Update 2
- Time: 2026-04-09 16:33 KST
- Change: 로그인 시작점, 스키마, 서비스, DB 조회, 메모리 세션, 쿠키 설정 흐름을 추적한 뒤 인터랙션 HTML 시범본 구현으로 전환
- Reason: 실제 코드를 기준으로 단계와 샘플 데이터를 확정해야 설명 웹이 가짜 흐름이 되지 않는다.

### Update 3
- Time: 2026-04-09 16:59 KST
- Change: 카드형 설명기에서 노드-엣지 그래프형 인터랙션으로 재구성하고 수정 전후 스크린샷을 캡처
- Reason: 사용자가 더 탐색적인 소셜 그래프 형태와 클릭 확장형 상호작용을 원했다.

### Update 4
- Time: 2026-04-09 17:13 KST
- Change: 그래프 캔버스 확대/축소, 노드 내부 서브노드 확장, 카드 크기/폰트/높이 통일 정리
- Reason: 그래프는 좋아졌지만 읽기 리듬과 정렬감이 아직 불안정했고, 사용자가 노드 내부로 더 깊게 파고드는 상호작용을 원했다.

## Result
- 관리자 로그인 검증부터 세션 생성, 쿠키 설정, 후속 인증까지를 설명하는 시범 HTML을 `artifacts/interactive-flows/admin-login-session-flow.html`에 생성했다.
- 페이지 진입 시 `/api/admin/me` 사전 확인, `AdminLoginIn` 스키마 검증, `admin_user` 조회, SHA-256 비밀번호 비교, `ADMIN_SESSIONS` 메모리 저장, `admin_session` 쿠키 설정 흐름을 단계별로 반영했다.
- 정상 로그인, 비밀번호 오류, 기존 세션 재사용 시나리오를 전환해서 볼 수 있게 구성했다.
- 이후 사용자 요청에 맞춰 단계 카드 목록을 소셜 그래프처럼 연결된 노드 뷰로 바꾸고, 노드 클릭 시 오른쪽 상세 패널이 갱신되는 구조로 재구성했다.
- 수정 전후 캡처를 `artifacts/screenshots/admin-login-flow-before.png`, `artifacts/screenshots/admin-login-flow-after.png`로 남겼다.
- 추가로 그래프 확대/축소 버튼을 넣고, 선택한 노드 안에서 관련 함수/요소/상태를 서브노드 형태로 펼치도록 바꿨다.
- 노드 카드의 기본 높이, 활성 높이, 타이포 크기, 내부 간격을 통일해 전체 정렬감을 다시 맞췄다.

## Verification
- Checked:
- `static/admin-login.html`, `static/admin.js`, `app/router/auth_router.py`, `app/schemas/auth.py`, `app/services/admin/auth.py`, `app/services/admin/modular_auth.py`, `app/modular_auth_repository.py`, `app/db/models.py`를 기준으로 단계와 예시 데이터를 수동 대조했다.
- 산출물 파일이 `artifacts/interactive-flows/admin-login-session-flow.html`에 생성됐는지 확인했다.
- 로컬 정적 서버로 HTML을 띄운 뒤 Playwright로 수정 전/후 스크린샷을 캡처했다.
- 확대/축소와 노드 내부 서브노드가 들어간 최종 버전도 `artifacts/screenshots/admin-login-flow-final.png`으로 다시 캡처했다.
- Not checked:
- 그래프 노드 개별 클릭 상태를 자동화한 E2E 상호작용 테스트는 만들지 않았다.

## Retrospective
### Classification
- `No Major Issue`

### What Was Wrong
- 처음 가설보다 세션 저장 위치가 DB일 가능성도 있다고 봤지만, 실제 구현은 메모리 딕셔너리였고 이 점을 시범본 핵심 설명으로 반영해야 했다.

### Why
- 로그인 검증은 `db: Session` 인자를 받지만, 실제 인증 경로는 sqlite 직접 조회와 메모리 세션 저장이 섞여 있어 표면 시그니처만 보면 오해하기 쉽다.

### Next Time
- 다음 시범본부터는 HTML뿐 아니라 설명용 JSON 데이터도 같이 생성해 다른 시각화 템플릿에서 재사용할 수 있게 한다.
- 그래프형 시범본은 노드 클릭 상태를 Playwright로 자동 순회 캡처하는 검증 스크립트까지 붙인다.
- 노드가 커질 때 엣지 연결점이 더 자연스럽게 보이도록 다음 버전에는 anchor 계산을 레이아웃 엔진 수준으로 분리한다.

## Related Documents
- [AGENTS.md](/mnt/c/Users/user/workspace/2.0-modular/AGENTS.md)
- [docs/interactive-flow-spec.md](/mnt/c/Users/user/workspace/2.0-modular/docs/interactive-flow-spec.md)
- [docs/debug/explanation-rule.md](/mnt/c/Users/user/workspace/2.0-modular/docs/debug/explanation-rule.md)
