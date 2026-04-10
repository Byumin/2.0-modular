# Documentation Hub

이 문서는 이 저장소의 Markdown 문서를 어디서부터 읽어야 하는지 정리한 문서 허브다.

## Start Here
- [AGENTS.md](/mnt/c/Users/user/workspace/2.0-modular/AGENTS.md): 작업 시작 전 반드시 확인할 저장소 공통 규칙
- [ARCHITECTURE.md](/mnt/c/Users/user/workspace/2.0-modular/ARCHITECTURE.md): 시스템 구조와 계층 개요
- [QUALIT_SCORE.md](/mnt/c/Users/user/workspace/2.0-modular/QUALIT_SCORE.md): 결과물 품질 평가 기준

## Domain Docs
- [docs/features/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/README.md): 기능별 상세 가이드 모음
- [docs/database/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/database/README.md): DB 기준, 스키마, 자산 인벤토리
- [docs/design/design-system.md](/mnt/c/Users/user/workspace/2.0-modular/docs/design/design-system.md): 프런트/디자인 시스템 가이드
- [docs/debug/explanation-rule.md](/mnt/c/Users/user/workspace/2.0-modular/docs/debug/explanation-rule.md): 코드 흐름 설명/디버깅 작성 규칙
- [docs/interactive-flow-spec.md](/mnt/c/Users/user/workspace/2.0-modular/docs/interactive-flow-spec.md): `코드 정리` 요청용 인터랙션 웹 산출물 규칙
- [docs/code-cleanup/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/code-cleanup/README.md): `코드 정리` 문서 허브
- [docs/diagrams/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/diagrams/README.md): 런타임 흐름 다이어그램 안내

## Process Docs
- [docs/exec-plans/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/exec-plans/README.md): 실행 계획/회고 문서 규칙
- [docs/exec-plans/_template.md](/mnt/c/Users/user/workspace/2.0-modular/docs/exec-plans/_template.md): 실행 계획 템플릿

## Tooling Docs
- [claude/README.md](/mnt/c/Users/user/workspace/2.0-modular/claude/README.md): Claude Code CLI 비대화형 실행 도구 안내
- [claude/HARNESS.md](/mnt/c/Users/user/workspace/2.0-modular/claude/HARNESS.md): Claude 하네스 환경과 프로젝트 환경 분리 설계
- [claude/jobs/README.md](/mnt/c/Users/user/workspace/2.0-modular/claude/jobs/README.md): Claude 하네스 작업 타입과 정책 스펙
- [claude/prompts/README.md](/mnt/c/Users/user/workspace/2.0-modular/claude/prompts/README.md): Claude 검토 프롬프트 자산 안내
- Claude 리뷰 결과 저장 위치: `claude/reviews/runs/`

## Audit / Reference Docs
- [docs/golden_scale_audit.md](/mnt/c/Users/user/workspace/2.0-modular/docs/golden_scale_audit.md): GOLDEN 척도 역전 검토 문서
- [docs/golden_shared_item_audit.md](/mnt/c/Users/user/workspace/2.0-modular/docs/golden_shared_item_audit.md): GOLDEN 공유 문항 감사 문서
- [scripts/README_CAPTURE.md](/mnt/c/Users/user/workspace/2.0-modular/scripts/README_CAPTURE.md): UI 스크린샷 캡처 도구 안내

## Recommended Reading Paths
### 기능 이해
1. [ARCHITECTURE.md](/mnt/c/Users/user/workspace/2.0-modular/ARCHITECTURE.md)
2. [docs/features/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/README.md)
3. 필요한 기능별 문서
4. 필요 시 [docs/debug/explanation-rule.md](/mnt/c/Users/user/workspace/2.0-modular/docs/debug/explanation-rule.md)

### 코드 정리 인터랙션 웹
1. [docs/code-cleanup/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/code-cleanup/README.md)
2. [docs/interactive-flow-spec.md](/mnt/c/Users/user/workspace/2.0-modular/docs/interactive-flow-spec.md)
3. [docs/code-cleanup/playbook.md](/mnt/c/Users/user/workspace/2.0-modular/docs/code-cleanup/playbook.md)
4. [docs/debug/explanation-rule.md](/mnt/c/Users/user/workspace/2.0-modular/docs/debug/explanation-rule.md)
5. `docs/code-cleanup/templates/interactive-flow-template.html` 복제
6. 실제 기능 코드와 관련 문서 추적
7. `artifacts/interactive-flows/`에 HTML 산출물 생성

### DB 확인
1. [docs/database/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/database/README.md)
2. [docs/database/runtime-db.md](/mnt/c/Users/user/workspace/2.0-modular/docs/database/runtime-db.md)
3. [docs/database/schema-overview.md](/mnt/c/Users/user/workspace/2.0-modular/docs/database/schema-overview.md)
4. [docs/database/assets-inventory.md](/mnt/c/Users/user/workspace/2.0-modular/docs/database/assets-inventory.md)

### 프런트/UI 작업
1. [docs/design/design-system.md](/mnt/c/Users/user/workspace/2.0-modular/docs/design/design-system.md)
2. [QUALIT_SCORE.md](/mnt/c/Users/user/workspace/2.0-modular/QUALIT_SCORE.md)
3. [scripts/README_CAPTURE.md](/mnt/c/Users/user/workspace/2.0-modular/scripts/README_CAPTURE.md)

### 실행 계획과 회고
1. [docs/exec-plans/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/exec-plans/README.md)
2. [docs/exec-plans/_template.md](/mnt/c/Users/user/workspace/2.0-modular/docs/exec-plans/_template.md)
3. 작업별 실행 계획 문서

### LLM 자동화 도구
1. [claude/README.md](/mnt/c/Users/user/workspace/2.0-modular/claude/README.md)
2. [claude/HARNESS.md](/mnt/c/Users/user/workspace/2.0-modular/claude/HARNESS.md)
3. [claude/jobs/README.md](/mnt/c/Users/user/workspace/2.0-modular/claude/jobs/README.md)
4. `claude/review_paths.sh`로 대상 경로 기준 코드 리뷰 실행
5. 필요할 때만 [claude/prompts/README.md](/mnt/c/Users/user/workspace/2.0-modular/claude/prompts/README.md)와 프롬프트 파일 사용

## Related Documents
- [AGENTS.md](/mnt/c/Users/user/workspace/2.0-modular/AGENTS.md)
- [ARCHITECTURE.md](/mnt/c/Users/user/workspace/2.0-modular/ARCHITECTURE.md)
- [QUALIT_SCORE.md](/mnt/c/Users/user/workspace/2.0-modular/QUALIT_SCORE.md)
- [docs/features/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/README.md)
- [docs/interactive-flow-spec.md](/mnt/c/Users/user/workspace/2.0-modular/docs/interactive-flow-spec.md)
- [docs/code-cleanup/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/code-cleanup/README.md)
- [docs/code-cleanup/playbook.md](/mnt/c/Users/user/workspace/2.0-modular/docs/code-cleanup/playbook.md)
- [docs/database/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/database/README.md)
- [docs/exec-plans/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/exec-plans/README.md)
- [claude/README.md](/mnt/c/Users/user/workspace/2.0-modular/claude/README.md)
- [claude/HARNESS.md](/mnt/c/Users/user/workspace/2.0-modular/claude/HARNESS.md)
- [claude/jobs/README.md](/mnt/c/Users/user/workspace/2.0-modular/claude/jobs/README.md)
