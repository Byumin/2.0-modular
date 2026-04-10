# Execution Plan

## Task Title
- `코드 정리` 요청을 인터랙션 웹 산출물 규칙으로 문서화

## Request Summary
- 사용자가 `코드 정리해줘`라고 요청했을 때, 단순 텍스트 요약이 아니라 실제 코드와 예시 데이터를 바탕으로 클릭/애니메이션/단계 확인이 가능한 인터랙션 웹 산출물을 만드는 기준을 저장소 문서에 반영해 달라는 요청.

## Goal
- `코드 정리` 요청의 기본 산출물을 인터랙션 웹으로 정의한다.
- 관련 문서에서 이 규칙을 찾을 수 있도록 허브와 저장소 공통 규칙을 연결한다.
- 생성 위치, 포함 요소, 검증 기준을 문서로 명확히 남긴다.

## Initial Hypothesis
- 현재 저장소에는 코드 리뷰 규칙과 설명 규칙은 있지만, 사람이 빠르게 런타임 흐름을 이해할 수 있는 인터랙션 웹 산출물 규칙은 없다.
- `AGENTS.md`와 `docs/README.md`에 이 기준을 연결하고, 별도 스펙 문서를 두면 이후 Codex/Claude가 같은 요청을 더 일관되게 해석할 수 있다.

## Initial Plan
1. 인터랙션 웹 산출물의 목적, 저장 위치, 필수 구성 요소를 정의한 문서를 만든다.
2. `AGENTS.md`에 `코드 정리` 요청 해석 규칙을 추가한다.
3. `docs/README.md`와 필요 문서에서 새 스펙 문서를 찾을 수 있게 연결한다.

## Progress Updates
### Update 1
- Time: 2026-04-09 16:03 KST
- Change: 실행 계획 문서 작성
- Reason: 문서 체계 변경 전 계획을 먼저 남긴다.

### Update 2
- Time: 2026-04-09 16:09 KST
- Change: 인터랙션 웹 스펙 문서와 연결 문서들을 실제로 추가/수정하기로 전환
- Reason: 사용자가 제안한 `코드 정리` 워크플로를 저장소 공통 규칙에 반영해야 이후 작업에서 일관되게 재사용할 수 있다.

## Result
- `docs/interactive-flow-spec.md`를 새로 추가해 `코드 정리` 요청의 기본 산출물을 인터랙션 웹으로 정의했다.
- `AGENTS.md`에 `Code Cleanup Rule`을 추가해 `코드 정리` 요청 시 이 스펙을 먼저 보도록 연결했다.
- `docs/debug/explanation-rule.md`와 `docs/README.md`에 새 스펙 문서를 연결해 설명 규칙과 문서 허브에서 바로 찾을 수 있게 했다.
- 인터랙션 웹 기본 산출물 경로를 `artifacts/interactive-flows/`로 정의했다.

## Verification
- Checked:
- `AGENTS.md`, `docs/README.md`, `docs/debug/explanation-rule.md`, `docs/interactive-flow-spec.md` 사이 링크와 역할 설명을 수동 점검했다.
- `코드 정리` 요청이 인터랙션 웹 산출물 규칙으로 연결되는지 문구를 확인했다.
- Not checked:
- 실제 `artifacts/interactive-flows/*.html` 시범 산출물 생성은 이번 작업 범위에 포함하지 않았다.

## Retrospective
### Classification
- `No Major Issue`

### What Was Wrong
- 기존 규칙은 설명과 리뷰에는 강했지만, 사람이 빠르게 런타임 흐름을 이해할 수 있는 클릭형 설명 자산 생성 기준이 빠져 있었다.

### Why
- 반복되는 기능 설명 요청이 텍스트 중심으로만 처리되면, 나중에 다시 읽고 이해하는 비용이 계속 커진다.

### Next Time
- 다음에는 대표 기능 하나를 골라 실제 `artifacts/interactive-flows/` 시범 HTML까지 함께 만들어 규칙과 산출물 예시를 같이 남긴다.

## Related Documents
- [AGENTS.md](/mnt/c/Users/user/workspace/2.0-modular/AGENTS.md)
- [Documentation Hub](/mnt/c/Users/user/workspace/2.0-modular/docs/README.md)
- [docs/debug/explanation-rule.md](/mnt/c/Users/user/workspace/2.0-modular/docs/debug/explanation-rule.md)
