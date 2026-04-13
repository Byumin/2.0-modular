# Interactive Flow Spec

이 문서는 사용자가 `코드 정리해줘` 같은 요청을 했을 때, 사람이 빠르게 런타임 흐름을 이해할 수 있도록 어떤 산출물을 만들어야 하는지 정의한다.

## Purpose

- 텍스트 요약만으로 끝나지 않고, 실제 코드와 예시 데이터를 바탕으로 기능 흐름을 클릭형 인터랙션으로 설명한다.
- 사용자가 화면 행동, API 호출, 내부 서비스 처리, DB 반영, 응답 변화를 한 번에 이해할 수 있게 한다.
- 이후 Codex나 Claude가 같은 요청을 일관된 형태로 해석하도록 기준을 고정한다.

## Default Interpretation

사용자가 아래와 비슷한 요청을 하면 이 문서를 우선 적용한다.

- `코드 정리해줘`
- `이 기능 흐름 정리해줘`
- `런타임대로 이해하기 쉽게 보여줘`
- `어디 클릭하면 뭐가 동작하는지 한 번에 보이게 해줘`

기본 해석은 다음과 같다.

1. 관련 코드와 문서를 읽는다.
2. 실제 런타임 호출 흐름을 추적한다.
3. 설명용 예시 입력 데이터와 응답 데이터를 정리한다.
4. 사람이 클릭하며 볼 수 있는 인터랙션 웹 산출물을 만든다.
5. 필요하면 텍스트 요약은 보조로만 붙인다.

실제 작업 순서와 검증 체크리스트는 [playbook.md](/mnt/c/Users/user/workspace/2.0-modular/docs/code-cleanup/playbook.md)에서 본다.

## Output Location

- 기본 HTML 산출물: `artifacts/interactive-flows/<feature>.html`
- 필요 시 설명용 데이터: `artifacts/interactive-flows/<feature>.json`
- 관련 계획/회고: `docs/exec-plans/`
- 재사용용 템플릿 소스: `docs/code-cleanup/templates/interactive-flow-template.html`
- 현재 레퍼런스 구현: `artifacts/interactive-flows/admin-login-session-flow.html`

이 산출물은 운영 코드가 아니라 설명용 자산이다.

## Required Structure

인터랙션 웹은 최소한 아래 요소를 포함한다.

1. 기능 개요
- 어떤 사용자 행동이나 화면 이벤트를 설명하는지

2. 시작 액션
- 예: 버튼 클릭, 페이지 진입, 폼 제출

3. 호출 흐름
- 프런트엔드
- 라우터
- 스키마 검증
- 서비스 로직
- repository/DB 처리
- 응답/후속 UI 반영

4. 예시 데이터
- 요청 payload 예시
- 주요 내부 상태 값
- 응답 데이터 예시

5. 단계별 강조
- 현재 어느 단계가 실행 중인지 시각적으로 보이게 한다.

6. 분기 처리
- 성공 흐름
- 실패/검증 오류 흐름

7. 소스 기준점 표시
- 실제 파일/라인 기준점은 넣되, 브라우저 표시용 텍스트는 저장소 상대 경로 형태로 보여야 한다.
- 예: `frontend/src/pages/Login.tsx:1`
- `/mnt/c/...` 같은 로컬 절대 경로를 그대로 노출하지 않는다.

## Step Granularity Rule

인터랙션 웹의 단계(step, node, timeline item)는 함수 단위가 아니라 책임 단위로 나눈다.

- 한 단계에는 하나의 주된 책임만 둔다.
- 스키마 검증, 입력 정규화, DB 조회, 데이터 대조, 분기/예외 판단, 저장용 구조 재구성, DB 저장, 응답 반영은 가능하면 각각 독립 단계로 분리한다.
- 서비스 함수 하나가 여러 작업을 수행하더라도, 화면 단계는 함수 경계가 아니라 실제 런타임 책임 전환 시점을 기준으로 끊는다.
- 서로 다른 두 데이터 집합을 비교하거나 교집합/차집합 판단을 수행하는 로직은 별도 단계로 분리한다.
- 하나의 단계 설명에 서로 다른 처리 예시가 섞여 일부 예시만 제시되는 구조라면, 그 단계는 과도하게 많은 책임을 가진 것으로 보고 다시 분해한다.
- 단계 제목은 `정규화`, `검증`처럼 뭉뚱그리지 말고, 무엇을 무엇과 비교하거나 어떤 값을 어떻게 바꾸는지 드러나게 쓴다.

## Example Coverage Rule

단계별 상세 패널과 예시 데이터는 해당 책임에 맞는 예시를 빠뜨리지 않는다.

- 정규화 단계에는 입력 예시와 정규화 후 출력 예시를 함께 둔다.
- 대조/검증 단계에는 비교 대상 양쪽의 예시와 판정 결과를 함께 둔다.
- 누적/병합 단계에는 누적 전 상태와 누적 후 상태를 함께 둔다.
- 예외 단계에는 어떤 입력에서 어떤 조건 때문에 실패하는지 예시를 둔다.
- 단계 설명은 가능하면 `입력 데이터 -> 수행 작업 -> 결과 또는 다음 호출` 형식을 유지한다.

## Interaction Guidance

- 사용자는 단계 버튼, 타임라인, 카드, 다이어그램 노드 같은 요소를 클릭해 흐름을 따라갈 수 있어야 한다.
- 단계 전환 시 강조, 이동, 상태 변화가 드러나는 최소한의 애니메이션을 둔다.
- 애니메이션은 장식보다 이해 보조 목적이어야 한다.
- 모바일과 데스크톱에서 모두 읽을 수 있어야 한다.
- 시나리오 선택은 성공/실패/기존 세션/보정 등 각 모드가 색으로도 구분되어야 한다.
- 엣지는 점선만으로 끝내지 말고 방향을 읽을 수 있게 화살표를 가져야 한다.
- 활성 엣지는 현재 시나리오 색과 맞춰 구분해야 한다.
- 상세 패널이 길어져도 읽을 수 있게 sticky 패널에는 자체 스크롤 처리가 있어야 한다.
- 그래프에 확대/축소 컨트롤이 있으면 기본 형태는 `- / 현재 배율 / +`처럼 단순한 한 줄 배치를 우선한다.
- 확대/축소 컨트롤은 줄바꿈으로 흩어지지 않게 한 줄에서 유지되어야 하며, 단순 배율 초기화 정도라면 별도 `리셋` 버튼을 기본값으로 두지 않는다.
- 범례가 필요한 그래프는 lane 색상 의미를 화면에서 바로 해석할 수 있게 legend를 둔다.
- 접힘 데이터 카드에는 `펼치기/접기`처럼 클릭 가능성을 드러내는 표시가 있어야 한다.
- 접힘 데이터 카드를 펼쳤을 때 본문 텍스트가 카드 왼쪽 경계에 바로 붙지 않도록 내부 패딩과 구분선을 둔다.
- 상세 패널이나 예시 영역에 `catalog`, `requestBody`, `selected_scales_json` 같은 내부 상태명/변수명이 나오면, 가능하면 hover/focus tooltip으로 의미를 바로 설명할 수 있어야 한다.
- tooltip은 스크롤 컨테이너 내부에서 잘리지 않도록 가장 앞 레이어에서 보여야 하며, 패널 경계 안에 갇힌 absolute 박스로만 구현하지 않는다.

## Source Grounding Rule

- 인터랙션 웹은 반드시 현재 코드베이스 기준으로 만든다.
- 추측성 흐름이나 가짜 호출 순서를 넣지 않는다.
- 예시 데이터는 설명용 샘플임을 분명히 적는다.
- 예시 데이터가 실제 DB/실제 코드 경로 기반인지, 가상의 분기 설명용 샘플인지 구분이 필요하면 화면 문구에서 명시적으로 표시한다.
- 실제 저장소 구조와 함수 호출 순서를 우선한다.
- 핵심 단계에는 가능한 한 실제 파일 경로와 함수명을 연결한다.
- hero 설명 문구는 제작 과정 메모가 아니라 기능 흐름 자체를 설명해야 한다.

## Document Roles

- 이 문서는 `무엇을 만족해야 하는지`를 정한다.
- 실제 작업 절차와 실패 조건은 [playbook.md](/mnt/c/Users/user/workspace/2.0-modular/docs/code-cleanup/playbook.md)에서 관리한다.
- 시작용 골격은 [interactive-flow-template.html](/mnt/c/Users/user/workspace/2.0-modular/docs/code-cleanup/templates/interactive-flow-template.html)에서 본다.
- 코드 정리 문서군 전체 지도는 [docs/code-cleanup/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/code-cleanup/README.md)에서 본다.

## Scope Guidance

- 큰 기능은 한 파일에 모든 흐름을 넣지 말고 기능별로 나눈다.
- 예:
  - `admin-login-flow.html`
  - `custom-test-create-flow.html`
  - `assessment-submit-flow.html`

## Relationship To Code Review

- 코드 리뷰는 버그, 회귀, 테스트 누락, 구조적 위험을 찾는 작업이다.
- 코드 정리는 사람이 동작을 이해하기 쉽게 흐름을 재구성하는 작업이다.
- 둘은 목적이 다르므로, `코드 정리` 요청은 기본적으로 이 인터랙션 웹 산출물 규칙을 따른다.

## Related Documents

- [AGENTS.md](/mnt/c/Users/user/workspace/2.0-modular/AGENTS.md)
- [Documentation Hub](/mnt/c/Users/user/workspace/2.0-modular/docs/README.md)
- [code-cleanup/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/code-cleanup/README.md)
- [playbook.md](/mnt/c/Users/user/workspace/2.0-modular/docs/code-cleanup/playbook.md)
- [interactive-flow-template.html](/mnt/c/Users/user/workspace/2.0-modular/docs/code-cleanup/templates/interactive-flow-template.html)
- [admin-login-session-flow.html](/mnt/c/Users/user/workspace/2.0-modular/artifacts/interactive-flows/admin-login-session-flow.html)
- [docs/debug/explanation-rule.md](/mnt/c/Users/user/workspace/2.0-modular/docs/debug/explanation-rule.md)
- [ARCHITECTURE.md](/mnt/c/Users/user/workspace/2.0-modular/ARCHITECTURE.md)
