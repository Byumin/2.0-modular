# Documentation Governance

이 문서는 이 저장소에서 새 문서, 새 문서 경로, 새 규칙을 추가할 때 중복과 충돌을 줄이기 위한 상위 기준을 정리한다.

## Purpose

- 같은 규칙이 여러 문서에 복제되는 구조를 막는다.
- 문서가 늘어나도 허브, 원칙, 운영, 템플릿, 예시의 역할 경계를 유지한다.
- 이후 문서 정리 작업이 아니라 문서 추가 시점부터 중복을 예방한다.

## Document Roles

문서는 먼저 역할을 정한 뒤에 작성한다.

- 허브:
  어디서부터 읽어야 하는지와 어떤 문서를 봐야 하는지만 안내한다.
- 원칙:
  무엇이 맞는지, 어떤 기준을 만족해야 하는지 정의한다.
- 운영:
  실제 작업 순서, 실패 조건, 체크리스트를 정리한다.
- 템플릿:
  새 산출물이나 새 문서를 시작할 때 복제하는 최소 골격이다.
- 예시 / 레퍼런스:
  완성본 비교 기준이나 참고 구현을 제공한다.

한 문서가 여러 역할을 동시에 강하게 가지기 시작하면 분리를 먼저 검토한다.

## Source Of Truth Rule

- 한 주제에는 source of truth 문서를 하나만 둔다.
- 새 규칙을 추가할 때는 먼저 "이 규칙을 최종적으로 책임질 문서가 어디인지"를 정한다.
- 다른 문서에는 규칙 본문을 복제하지 말고, 한 줄 요약과 링크만 둔다.
- source of truth가 바뀌면 기존 문서의 중복 본문부터 제거한다.

## New Document Rule

새 문서는 아래 중 하나라도 만족할 때만 만든다.

1. 기존 문서에 자연스럽게 흡수할 수 없다.
2. 문서 역할이 기존 문서와 명확히 다르다.
3. 별도 source of truth가 필요한 독립 주제다.
4. 읽기 순서와 유지보수 관점에서 분리 편익이 분명하다.

새 문서를 만들기 전에 아래를 먼저 적는다.

- 문서 역할
- 이 문서의 독자
- source of truth인지, 아니면 허브/운영/예시인지
- 어떤 기존 문서와 연결되는지
- 기존 문서에서 제거하거나 요약해야 할 중복 내용이 무엇인지

## New Path Rule

새 문서 경로나 하위 디렉터리를 만들기 전에는 먼저 기존 허브 문서에서 관리 가능한지 검토한다.

- 새 경로가 생기면 상위 허브 문서에 먼저 추가한다.
- 새 경로 안에는 가능하면 `README.md`를 두어 역할과 읽기 순서를 짧게 설명한다.
- 허브 문서는 상세 규칙을 다시 설명하지 않고, 해당 경로의 source 문서로 연결만 한다.

## Anti-Duplication Rule

아래는 기본적으로 피한다.

- 같은 규칙 전문을 여러 문서에 반복해서 적는 것
- 허브 문서가 상세 규칙까지 직접 들고 있는 것
- 템플릿 주석과 원칙 문서가 서로 다른 기본값을 갖는 것
- 운영 문서와 원칙 문서가 같은 체크리스트를 거의 그대로 반복하는 것
- 하나의 기준을 바꾸려면 두세 문서를 동시에 수정해야만 유지되는 구조

## Preferred Pattern

새 기준이 생기면 아래 순서를 따른다.

1. source of truth 문서 1곳에 상세 기준을 적는다.
2. 허브 문서에는 요약과 링크만 추가한다.
3. 운영 문서에는 필요한 경우 "언제 이 기준을 확인하는지"만 적는다.
4. 템플릿은 source of truth와 다른 기본값이 없는지 맞춘다.
5. 예시/레퍼런스는 필요할 때만 갱신한다.

## Review Checklist

새 문서나 새 규칙을 추가하기 전에 아래를 확인한다.

- 이 문서는 기존 문서에 흡수 가능한가
- 문서 역할이 기존 문서와 겹치지 않는가
- source of truth 문서가 명확한가
- 같은 내용을 두 문서 이상에서 동시에 수정해야 하는 구조가 생기지 않는가
- 허브 문서가 상세 규칙을 다시 설명하고 있지 않은가
- 템플릿이 현재 규칙과 다른 기본값을 갖고 있지 않은가

## Current Practical Mapping

- 저장소 공통 작업 규칙: [AGENTS.md](../AGENTS.md)
- 문서 허브: [docs/README.md](README.md)
- 시스템 구조/계층/엔트리포인트: [ARCHITECTURE.md](../ARCHITECTURE.md)
- 디자인/폰트/UI/UX/테마: [DESIGN.md](../DESIGN.md)
- UI 검증/스크린샷 기준: [QUALIT_SCORE.md](../QUALIT_SCORE.md)
- 실행 계획/회고 운영: [docs/exec-plans/README.md](exec-plans/README.md)
- 설명/디버깅 원칙: [docs/debug/explanation-rule.md](debug/explanation-rule.md)
- 코드 정리 원칙: [docs/interactive-flow-spec.md](interactive-flow-spec.md)
- 코드 정리 운영: [docs/code-cleanup/playbook.md](code-cleanup/playbook.md)
- 코드 정리 허브: [docs/code-cleanup/README.md](code-cleanup/README.md)
- DB 운영 기준: [docs/database/runtime-db.md](database/runtime-db.md)
- Claude 자동화 진입점: [claude/README.md](../claude/README.md)

## Task Routing

새 규칙을 만들지 않고 기존 source-of-truth로 연결할 때는 아래 라우팅을 따른다.

| 요청/작업 | 연결할 source-of-truth | 비고 |
| --- | --- | --- |
| 작업 전 공통 규칙 | `AGENTS.md` | 상세 규칙 대신 시작 순서와 지도만 둔다. |
| 문서 체계/삭제/추가 | `docs/doc-governance.md` | 새 문서보다 기존 문서 흡수를 먼저 검토한다. |
| 코드 수정/리팩토링/DB 변경 | `docs/exec-plans/README.md` | 실행계획 문서에 검증과 미검증 항목을 남긴다. |
| 구조/계층/운영 엔트리포인트 | `ARCHITECTURE.md` | 운영 엔트리포인트와 런타임 기준은 여기에 둔다. |
| DB 파일/스키마 기준 | `docs/database/runtime-db.md`, `schema-overview.md` | 운영 DB는 루트 `modular.db` 기준이다. |
| UI/디자인 기준 | `DESIGN.md` | `docs/design/design-system.md`는 보조 문서다. |
| UI 검증/스크린샷 | `QUALIT_SCORE.md` | UI 작업 검증 기준만 둔다. |
| 설명/디버깅 답변 | `docs/debug/explanation-rule.md` | 설명 방식과 흐름 추적 기준을 둔다. |
| 코드 정리 산출물 | `docs/code-cleanup/README.md` | 인터랙션 웹 산출물의 운영 기준이다. |

## Related Documents

- [AGENTS.md](../AGENTS.md)
- [Documentation Hub](README.md)
- [ARCHITECTURE.md](../ARCHITECTURE.md)
- [DESIGN.md](../DESIGN.md)
- [QUALIT_SCORE.md](../QUALIT_SCORE.md)
- [docs/exec-plans/README.md](exec-plans/README.md)
- [docs/debug/explanation-rule.md](debug/explanation-rule.md)
- [docs/interactive-flow-spec.md](interactive-flow-spec.md)
- [docs/code-cleanup/README.md](code-cleanup/README.md)
- [docs/code-cleanup/playbook.md](code-cleanup/playbook.md)
- [docs/database/runtime-db.md](database/runtime-db.md)
