# Execution Plan

## Task Title
- Claude 하네스 환경과 프로젝트 환경 분리 설계 반영

## Request Summary
- 오케스트레이터 환경과 대상 프로젝트 환경을 분리하는 구조로 이 저장소의 Claude 자동화 사용 방식을 설계해 달라는 요청.

## Goal
- `claude/` 아래 자산이 하네스 환경과 프로젝트 환경을 어떻게 나누는지 문서와 실행 도구 기준으로 명확히 한다.
- Claude 실행은 `.venv-claude`, 프로젝트 실행은 `.venv`를 기본값으로 삼는 래퍼와 문서를 추가한다.
- 기존 구조 문서와 사용 문서가 같은 기준을 가지도록 정리한다.

## Initial Hypothesis
- 분리 설계는 문서만으로 남기면 실제 사용 시 다시 혼선이 생기므로, 경로를 강제하는 래퍼 스크립트가 필요하다.
- 기본 실행 명령이 `.venv-claude/bin/python claude/run_sdk.py` 형태로 길기 때문에 전용 진입점 하나를 제공하는 편이 현실적이다.
- 프로젝트 실행 인터프리터 `.venv/bin/python`도 프롬프트 템플릿과 문서에 고정하는 것이 안전하다.

## Initial Plan
1. 현재 `claude/` 자산과 가상환경 상태를 확인한다.
2. 하네스 환경 분리용 래퍼와 구조 문서를 `claude/` 아래에 추가한다.
3. 기존 `claude/README.md`, 프롬프트, 관련 구조 문서를 새 설계 기준으로 업데이트한다.
4. 로컬에서 도움말/문법 수준 검증을 수행한다.

## Progress Updates
### Update 1
- Time: 2026-04-09 15:32 KST
- Change: 실행 계획 문서 초안 작성
- Reason: 저장소 규칙상 구조 변경과 문서 체계 변경 작업 전 계획 문서를 먼저 남긴다.

### Update 2
- Time: 2026-04-09 15:39 KST
- Change: 하네스 분리용 래퍼, 설계 문서, 프로젝트 실행 프롬프트 추가
- Reason: 문서만이 아니라 실제 진입점과 프롬프트 자산까지 같은 분리 모델을 따르게 해야 혼선을 줄일 수 있다.

## Result
- `claude/run.sh`를 추가해 Claude 하네스 실행 진입점을 `.venv-claude` 기준으로 고정했다.
- `claude/HARNESS.md`에 오케스트레이터 환경과 대상 프로젝트 환경의 책임 분리를 문서화했다.
- `claude/prompts/project-test-review.txt`를 추가해 프로젝트 실행 시 `.venv/bin/python`을 명시하는 템플릿을 제공했다.
- `claude/README.md`, `claude/prompts/README.md`, `ARCHITECTURE.md`, `docs/README.md`를 새 분리 모델 기준으로 업데이트했다.
- `.gitignore`에 `.venv-claude/`를 추가했다.

## Verification
- Checked:
- `bash -n claude/run.sh`
- `python3 -m py_compile claude/run_sdk.py`
- `claude/run.sh --help`
- 문서 링크 및 프롬프트 경로 수동 확인
- Not checked:
- 실제 Anthropic API 호출 실행
- Claude가 `.venv/bin/python`으로 프로젝트 테스트를 수행하는 end-to-end 검증

## Retrospective
### Classification
- `No Major Issue`

### What Was Wrong
- 큰 문제는 없었다.

### Why
- 분리 설계를 문서뿐 아니라 진입점과 프롬프트 템플릿까지 함께 반영해 실제 사용 흐름으로 연결할 수 있었다.

### Next Time
- Claude 작업 종류가 늘어나면 `claude/prompts/`에 목적별 프롬프트를 더 세분화한다.

## Related Documents
- [Documentation Hub](/mnt/c/Users/user/workspace/2.0-modular/docs/README.md)
- [docs/exec-plans/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/exec-plans/README.md)
- [AGENTS.md](/mnt/c/Users/user/workspace/2.0-modular/AGENTS.md)
- [claude/README.md](/mnt/c/Users/user/workspace/2.0-modular/claude/README.md)
