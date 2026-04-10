# Code Cleanup Playbook

이 문서는 저장소에서 `코드 정리해줘` 요청을 받았을 때 어떤 기준으로 조사하고, 어떤 산출물을 만들고, 어떤 템플릿을 기준으로 시작해야 하는지 정리한 운영 문서다.

## Purpose

- 사람이 코드를 직접 다 읽지 않아도 런타임 흐름을 빠르게 이해할 수 있는 산출물을 반복 생산한다.
- `코드 정리` 작업을 텍스트 요약이 아니라 재사용 가능한 인터랙션 웹 제작 작업으로 표준화한다.
- 이후 Codex나 Claude가 같은 요청을 더 일관되게 처리하도록 기준을 고정한다.

## Primary Output

- 기본 산출물: `artifacts/interactive-flows/<feature>.html`
- 필요 시 보조 데이터: `artifacts/interactive-flows/<feature>.json`
- 작업 계획/회고: `docs/exec-plans/`

## Reference Assets

- 레퍼런스 구현: [admin-login-session-flow.html](/mnt/c/Users/user/workspace/2.0-modular/artifacts/interactive-flows/admin-login-session-flow.html)
- 재사용용 템플릿 소스: [interactive-flow-template.html](/mnt/c/Users/user/workspace/2.0-modular/docs/code-cleanup/templates/interactive-flow-template.html)
- 원칙 문서: [interactive-flow-spec.md](/mnt/c/Users/user/workspace/2.0-modular/docs/interactive-flow-spec.md)

의미는 이렇게 나눈다.

- 레퍼런스 구현:
  실제로 완성된 예시. 디자인, 정보 밀도, 상호작용 깊이의 기준점.
- 템플릿 소스:
  새 기능 흐름을 만들 때 복제해서 시작하는 기본 골격.
- 원칙 문서:
  왜 이런 산출물을 만들고, 무엇을 포함해야 하는지 정하는 규칙.

## Role Boundary

- 원칙과 시각/구조 기준은 [interactive-flow-spec.md](/mnt/c/Users/user/workspace/2.0-modular/docs/interactive-flow-spec.md)에서 본다.
- 이 문서는 실제 작업 순서, 실패 조건, 최종 점검 항목을 운영 관점에서 관리한다.
- 템플릿 자체의 구조는 [interactive-flow-template.html](/mnt/c/Users/user/workspace/2.0-modular/docs/code-cleanup/templates/interactive-flow-template.html)에서 직접 확인한다.

## When To Use

아래 요청은 기본적으로 이 문서를 따른다.

- `코드 정리해줘`
- `이 기능 흐름 보기 쉽게 정리해줘`
- `클릭하면서 이해할 수 있게 만들어줘`
- `런타임 흐름을 웹으로 보여줘`

## Required Workflow

1. 시작점 찾기
- HTML/JS 이벤트, API 엔드포인트, 또는 특정 함수 진입점부터 시작한다.

2. 실제 런타임 추적
- 라우터
- 스키마
- 서비스
- repository/DB
- 응답/후속 UI

3. 예시 데이터 수집
- 요청 payload
- 응답 payload
- 내부 상태 예시
- 실패 케이스 예시

4. 분기 정리
- 성공
- 실패
- 검증 오류
- 기존 세션/재진입 같은 우회 경로

5. 인터랙션 웹 작성
- 레퍼런스 템플릿을 복제해 구조를 맞춘다.
- 그래프, 서브노드, 상세 패널, 접힘 데이터 예시를 채운다.

6. 검증
- 최소한 산출물 파일 생성 여부를 확인한다.
- UI 요청이면 수정 전/후 또는 최종 스크린샷을 남긴다.

## Standard Content Checklist

새 코드 정리 웹은 최소한 아래를 포함한다.

- 기능 제목과 한 줄 설명
- 시나리오 선택
- 핵심 구조 요약
- 단계 그래프
- 클릭 시 확장되는 노드 내부 서브노드
- 오른쪽 상세 패널
- 접힘/펼침 형태의 데이터 예시
- 성공/실패 분기
- 실제 소스 기준점

이 중 하나라도 빠지면 `완성본`으로 보지 않는다.

## Step Design Checklist

단계 설계 시에는 아래를 별도로 확인한다.

- 한 단계가 하나의 주된 책임만 가지는가
- 스키마 검증, 입력 정규화, DB 조회, 데이터 대조, 분기 판단, 저장 구조 재조합, DB 저장, 응답 반영이 한 노드에 섞여 있지 않은가
- 서비스 함수 하나를 그대로 한 노드로 두지 않고, 실제 런타임 책임 전환 시점마다 나눴는가
- 대조 단계라면 비교 대상 양쪽 예시와 판정 결과가 함께 보이는가
- 정규화 단계라면 입력 예시와 출력 예시가 함께 보이는가
- 누적/병합 단계라면 누적 전과 누적 후 상태가 함께 보이는가
- 특정 단계에 일부 처리 예시만 있고 다른 처리 예시가 빠져 있다면, 그 단계를 다시 쪼갰는가

## Mandatory Quality Bar

아래 기준은 권장이 아니라 기본 요구사항이다.

- 템플릿 placeholder 문구가 남아 있으면 안 된다.
- 그래프 노드는 최소한 단계 제목, 짧은 설명, 계층 성격을 보여야 한다.
- 클릭한 노드 안에는 관련 함수/요소/상태가 서브노드 형태로 펼쳐져야 한다.
- 상세 패널에는 입력, 처리, 출력, 소스 기준점이 모두 있어야 한다.
- 데이터 예시는 접힘 구조로 제공해야 하며, 요청/응답/내부 상태 3종이 모두 있어야 한다.
- 예시 데이터는 단문이 아니라 실제 HTTP/JSON 또는 내부 상태 형태에 가까워야 한다.
- 예시 데이터는 실제 현재 DB/코드 기준값과 가상 설명용 분기를 섞어 쓰지 말고, 섞일 경우 카드 안에서 `실제 예시` / `가상 예시`를 명시적으로 구분해야 한다.
- 레퍼런스 구현보다 정보 밀도가 너무 낮으면 안 된다.
- 기능 흐름이 실제 코드와 다르면 안 된다.
- 단계가 과도하게 넓어서 정규화, 대조, 누적, 예외가 한 카드에 섞여 있으면 안 된다.
- 소스 기준점 표시는 브라우저에서 읽는 상대 경로 형식이어야 한다. `/mnt/c/...` 같은 절대 경로를 그대로 노출하면 안 된다.
- 시나리오 선택 chip은 성공/실패/보정/기존 세션 등 모드별로 시각 구분이 되어야 한다.
- 활성 엣지는 현재 시나리오와 연결된 색으로 보여야 하며, 방향 화살표가 있어야 한다.
- 그래프 확대/축소 컨트롤이 있으면 `- / 현재 배율 / +`처럼 단순한 한 줄 배치를 유지해야 한다.
- 그래프 확대/축소 컨트롤은 줄바꿈으로 흩어지면 안 되며, 별도 `리셋` 버튼은 기본 요구사항이 아니다.
- 상세 패널은 sticky일 경우 긴 콘텐츠에서도 읽을 수 있도록 `max-height`와 `overflow-y`를 포함해야 한다.
- 상세 패널 내부의 긴 코드/JSON 예시는 카드 폭을 밀어내지 않게 `min-width: 0`, 줄바꿈 또는 내부 스크롤 처리를 함께 설계해야 한다.
- lane 색 의미가 바로 드러나지 않는 그래프는 범례를 포함해야 한다.
- 접힘 데이터 카드에는 `펼치기/접기` 같은 affordance 표시가 있어야 한다.
- 접힘 데이터 카드의 펼쳐진 본문은 헤더와 시각적으로 분리되고, 텍스트가 카드 경계에 붙지 않게 별도 패딩을 가져야 한다.
- 상세 패널에 등장하는 핵심 상태명과 변수명은 초심자도 바로 이해할 수 있게 tooltip 또는 동등한 glossary 장치를 제공하는 편을 기본값으로 본다.
- glossary tooltip은 패널 내부 overflow에 잘리지 않도록 전역 overlay 수준에서 렌더링하는 방식을 우선한다.
- hero copy는 “이번 버전은…” 같은 제작 메모가 아니라 기능 흐름 요약이어야 한다.

## Failure Conditions

아래 중 하나라도 해당하면 결과를 `미흡`으로 본다.

- 그래프는 있는데 클릭 확장 후 얻는 정보가 거의 없는 경우
- 템플릿 뼈대만 있고 실제 코드 기준 데이터와 함수명이 비어 있는 경우
- 레퍼런스 구현 대비 노드/패널/데이터 예시 중 두 개 이상이 빠진 경우
- 요청/응답/상태 예시가 너무 짧아 사람이 동작을 상상해야 하는 경우
- 보기만 바뀌고 실제 런타임 순서가 왜곡된 경우
- 한 단계에 여러 책임이 묶여 있어서 어떤 입력이 어떤 검증이나 변환을 거쳤는지 추적하기 어려운 경우
- 화면은 화려한데 소스 기준점 링크나 함수명이 부정확한 경우
- refs가 저장소 상대 경로가 아니라 로컬 절대 경로를 그대로 노출하는 경우
- 성공/실패/보정 시나리오가 색이나 엣지에서 구분되지 않는 경우
- 엣지에 방향 화살표가 없어 흐름 방향이 즉시 읽히지 않는 경우
- 확대/축소 컨트롤이 여러 줄로 깨지거나 배율 표시가 버튼 사이에서 분리되어 읽히는 경우
- detail panel이 길어질 때 뷰포트를 벗어나 읽기 불편한 경우
- fold-card가 클릭 가능한지 시각 단서가 없는 경우
- lane 색을 썼는데 legend가 없어 의미를 추측해야 하는 경우

## Data Example Rule

- 예시 데이터는 짧게 끝내지 않는다.
- 가능하면 실제 요청 형식에 가까운 HTTP/JSON 구조를 적는다.
- 긴 데이터는 기본적으로 접어두고, 필요할 때 펼쳐 보게 만든다.
- 운영 데이터가 아니라 설명용 샘플임을 분명히 유지한다.
- 요청, 응답, 내부 상태 예시는 서로 다른 정보를 담아야 한다. 같은 내용을 제목만 바꿔 반복하지 않는다.
- 성공 시나리오의 기본 예시는 가능하면 현재 저장소의 실제 DB/실제 응답 형태에 맞춘다.
- 실패나 보정 분기가 현재 DB에서는 재현되지 않는 가상 사례라면, `가상 보정 예시`처럼 명시해 사용자가 실제 데이터로 오해하지 않게 한다.

## Layout Rule

- 그래프는 한눈에 전체 흐름이 보여야 한다.
- 노드 크기, 높이, 타이포 리듬은 기능 전체에서 통일한다.
- 활성 노드는 더 크게 보여도, 비활성 노드와 비율 차이가 과도하면 안 된다.
- 확대/축소가 필요하면 캔버스 단위로 지원한다.
- 제목, 패널, 카드, 서브노드 간 정보 밀도 차이가 너무 커서 특정 영역만 과도하게 비거나 과밀하면 안 된다.
- 레퍼런스 구현과 비교했을 때 시각 구조가 지나치게 단순해지면 안 된다.
- sticky detail panel은 독립 스크롤이 가능해야 한다.
- hero 영역 문구는 산출물 제작 메모가 아니라 현재 기능의 런타임 개요를 담아야 한다.

## File Placement Rule

- 템플릿 소스는 `docs/code-cleanup/templates/`에 둔다.
- 완성 산출물은 `artifacts/interactive-flows/`에 둔다.
- 캡처 이미지는 `artifacts/screenshots/`에 둔다.

## Recommended Start Procedure

새 기능 흐름을 만들 때는 보통 아래 순서로 시작한다.

1. [interactive-flow-template.html](/mnt/c/Users/user/workspace/2.0-modular/docs/code-cleanup/templates/interactive-flow-template.html) 복제
2. 제목, 시나리오, 핵심 단계 정의
3. 실제 코드 추적으로 단계와 예시 데이터 채우기
4. 레퍼런스 구현([admin-login-session-flow.html](/mnt/c/Users/user/workspace/2.0-modular/artifacts/interactive-flows/admin-login-session-flow.html))과 비교하며 밀도 조정
5. 최종 산출물 저장 및 캡처

## Reference-Derived Guardrails

최근 artifact 수정에서 반복 방지용으로 확정한 가드레일은 아래와 같다.

- refs는 화면 표시용으로 상대 경로 문자열로 정규화한다.
- scenario chip은 모드별 색을 분리한다.
- edge는 `marker-end` 화살표와 활성 시나리오 색을 함께 가져야 한다.
- detail panel은 sticky + overflow를 함께 설계한다.
- lane 색 체계를 쓰면 legend를 같이 둔다.
- fold-card summary에는 `펼치기/접기` 표시를 둔다.
- 빈 callout은 렌더하지 않거나 `:empty`로 숨긴다.
- fold-card 본문은 패딩 없이 가장자리에 붙지 않게 한다.
- 긴 예시 텍스트는 카드 밖으로 밀려나지 않게 카드 내부 줄바꿈/가로 스크롤을 보장한다.
- 내부 변수명 설명이 필요한 기능은 glossary tooltip을 넣고, tooltip은 clipping 없는 상위 레이어에 띄운다.
- 그래프 확대/축소 컨트롤이 있으면 기본형은 `- / 현재 배율 / +`로 두고 한 줄 배치를 유지한다.

## Final Review Checklist

산출물 저장 전 마지막으로 아래를 확인한다.

- 레퍼런스 구현과 비교해 정보 층위가 지나치게 얇지 않은가
- 각 노드 클릭 시 사람이 실제로 더 많은 정보를 얻는가
- 데이터 예시가 충분히 구체적인가
- 텍스트만 바뀐 템플릿이 아니라 기능별 실제 흐름이 반영됐는가
- 소스 기준점이 실제 파일과 함수에 맞는가
- refs가 절대 경로가 아니라 상대 경로로 보이는가
- 시나리오 chip과 활성 엣지가 모드별로 구분되는가
- edge 방향이 화살표로 읽히는가
- 확대/축소 컨트롤이 한 줄에서 `- 현재 배율 +` 형태로 유지되는가
- detail panel이 길어져도 자체 스크롤로 읽히는가
- fold-card가 클릭 가능하다는 시각 단서를 주는가
- fold-card 본문 텍스트가 카드 경계에 너무 붙지 않는가
- 예시 데이터가 실제값과 가상값을 혼동시키지 않는가
- 핵심 변수명/상태명이 tooltip 또는 동등한 방식으로 설명되는가
- tooltip이 패널/카드 경계에서 잘리지 않고 가장 앞에 보이는가
- hero copy가 기능 설명인지, 제작 메모인지 다시 확인했는가
- 이 문서에서 설명하는 운영 기준과 `interactive-flow-spec`의 원칙이 서로 충돌하지 않는가

## Related Documents

- [AGENTS.md](/mnt/c/Users/user/workspace/2.0-modular/AGENTS.md)
- [Documentation Hub](/mnt/c/Users/user/workspace/2.0-modular/docs/README.md)
- [interactive-flow-spec.md](/mnt/c/Users/user/workspace/2.0-modular/docs/interactive-flow-spec.md)
- [code-cleanup/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/code-cleanup/README.md)
- [interactive-flow-template.html](/mnt/c/Users/user/workspace/2.0-modular/docs/code-cleanup/templates/interactive-flow-template.html)
- [explanation-rule.md](/mnt/c/Users/user/workspace/2.0-modular/docs/debug/explanation-rule.md)
