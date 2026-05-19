# Execution Plan

## Task Title
- Claude SDK 비대화형 실행 스크립트 추가

## Request Summary
- Claude를 이 저장소에서 비대화형으로 실행할 수 있도록 Python SDK 기반 스크립트를 만들어 본다.

## Goal
- Anthropic API 키와 Claude Agent SDK를 사용해 로컬 저장소 검토 작업을 비대화형으로 실행할 수 있는 보조 스크립트를 저장소 전용 `claude/` 경로 아래에 추가한다.
- 기본 권한은 읽기/검색 중심으로 제한하고, 필요 시 옵션으로 확장할 수 있게 한다.
- 사용 방법과 전제 조건을 문서화한다.

## Initial Hypothesis
- 이 저장소의 기존 런타임 의존성은 FastAPI 앱 기준으로 최소화되어 있으므로 Claude SDK는 기본 `requirements.txt`에 넣지 않고 선택 설치 방식이 더 적합하다.
- 단발성 검토 자동화는 CLI도 가능하지만, 이번 요청은 SDK 실험이므로 Python 엔트리포인트 하나와 간단한 README를 제공하면 바로 검증 가능하다.
- Claude 자산이 늘어날 가능성을 고려하면 `scripts/`보다 전용 `claude/` 경로가 더 적합하다.

## Initial Plan
1. 저장소 규칙과 기존 스크립트 구조를 확인하고 새 보조 스크립트 위치를 정한다.
2. `claude/` 아래 Claude Agent SDK 실행 스크립트를 추가하고, 권한/툴/프롬프트를 CLI 인자로 제어할 수 있게 만든다.
3. 사용 문서와 프롬프트 자산 경로를 추가하고, 구조 문서에도 새 경로를 반영한다.
4. 로컬 문법 검증으로 기본 동작 가능성을 확인한다.

## Progress Updates
### Update 1
- Time: 2026-04-09 14:40 KST
- Change: 실행 계획 문서 초안 작성
- Reason: 저장소 규칙상 실제 수정 작업 전 계획 문서를 먼저 남겨야 한다.

### Update 2
- Time: 2026-04-09 14:48 KST
- Change: Claude SDK 실행 스크립트와 사용 문서 추가
- Reason: SDK 실험 요청에 맞춰 저장소에서 바로 실행 가능한 엔트리포인트와 운영 메모를 남긴다.

### Update 3
- Time: 2026-04-09 14:55 KST
- Change: Claude 전용 경로 `claude/`로 재배치
- Reason: `scripts/`가 범용 보조 도구 모음이라 Claude 자동화 자산을 별도 경로로 분리하는 편이 관리상 더 명확하다.

### Update 4
- Time: 2026-04-09 15:08 KST
- Change: 구조 문서와 문서 허브에 `claude/` 경로 및 프롬프트 자산 문서를 반영
- Reason: 경로와 아키텍처가 바뀐 만큼 문서 허브, 구조 문서, 저장소 규칙 문서가 모두 같은 기준을 가져야 한다.

### Update 5
- Time: 2026-04-09 15:14 KST
- Change: 다른 Markdown 문서까지 검색해 관련 문서 링크 연결을 추가 점검
- Reason: 문서 허브 외의 `Related Documents`나 품질/구조 문서에서도 새 경로를 찾을 수 있어야 한다.

## Result
- `claude/run_sdk.py`를 추가해 Claude Code SDK 기반 비대화형 실행 엔트리포인트를 만들었다.
- 기본 허용 도구를 `Read`, `Glob`, `Grep`로 제한하고, 추가 권한은 CLI 옵션으로 확장하도록 구성했다.
- `claude/README.md`에 설치 전제 조건과 실행 예시를 정리했다.
- `claude/prompts/`를 추가하고, 문서 허브와 구조 문서에 `claude/` 경로를 반영했다.

## Verification
- Checked:
- `python3 -m py_compile claude/run_sdk.py`
- 스크립트/문서 경로와 인자 구조 수동 검토
- 새 구조 기준 문서 링크와 경로 존재 여부 수동 검토
- 다른 Markdown 파일 내 관련 링크 검색으로 누락 여부 점검
- Not checked:
- 실제 Claude 호출 실행
- `claude-code-sdk`와 `@anthropic-ai/claude-code`가 설치된 환경에서의 런타임 검증

## Retrospective
### Classification
- `No Major Issue`

### What Was Wrong
- 큰 문제는 없었다.

### Why
- 선택 의존성으로 분리해 앱 런타임 영향 없이 SDK 실험 경로를 추가할 수 있었다.

### Next Time
- Claude SDK가 설치된 환경에서 실제 호출 예시를 한 번 실행해 샘플 프롬프트와 권한 세트를 더 다듬는다.

## Related Documents
- [Documentation Hub](/mnt/c/Users/user/workspace/2.0-modular/docs/README.md)
- [docs/exec-plans/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/exec-plans/README.md)
- [QUALIT_SCORE.md](/mnt/c/Users/user/workspace/2.0-modular/QUALIT_SCORE.md)
- [AGENTS.md](/mnt/c/Users/user/workspace/2.0-modular/AGENTS.md)
