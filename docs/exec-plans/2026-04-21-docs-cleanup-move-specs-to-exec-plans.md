# Execution Plan

## Task Title
- 구현 완료된 phase/plan 문서를 features에서 exec-plans로 이동

## Request Summary
- 이미 구현 완료된 Phase 1/2 상세 스펙과 plan+spec 2단 분리 문서 중 plan 문서를 `docs/features/`에서 `docs/exec-plans/`로 이동한다.
- 빈 `docs/templates/` 폴더를 삭제한다.

## Goal
- `docs/features/`에는 현재 기능의 source-of-truth 설명 문서만 남긴다.
- 구현 전 설계/기획 성격 문서는 `docs/exec-plans/`의 날짜 기반 보관소로 옮겨 exec-plans README의 Interpretation Rule("작업 당시의 계획과 회고 기록. source-of-truth로 읽지 않는다")에 맞춘다.
- 이동된 문서의 내부/외부 참조 링크를 실제 경로로 갱신한다.
- 빈 `docs/templates/` 폴더 삭제.

## Initial Hypothesis
- 이동 대상 4개 파일은 모두 exec-plans의 기존 파일과 내용이 다르다. 단순 삭제가 아니라 날짜 접두사 이름으로 이동해야 한다.
- 외부 참조는 주로 `docs/features/` 내 다른 문서, 루트 ARCHITECTURE.md에 있다.
- `docs/exec-plans/`에 이미 있는 과거 exec-plan 파일들이 이 문서들을 참조하지만, exec-plans는 "작업 당시 기록"이므로 링크를 현재 경로로 강제 업데이트하지 않는다 (단 이 과정에서 깨진 링크로 인식되는 부분은 수용).

## Initial Plan
1. 4개 파일을 `git mv`로 이동하면서 exec-plans 네이밍 규칙에 맞게 날짜 접두사 부여.
2. 빈 `docs/templates/` 디렉터리 삭제.
3. `docs/features/README.md`, `ARCHITECTURE.md`, 그리고 `docs/features/` 내 다른 문서들의 참조 경로를 새 위치로 갱신.
4. 이동된 문서 내부의 cross-reference도 새 경로로 갱신.
5. 이동 후 깨진 링크 스캔 재실행.
6. `docs/features/README.md`의 목록에서 이동 문서 엔트리는 제거하거나 참고용 주석으로 대체.

## Target Paths
- `docs/features/client-intake-phase1-spec.md` → `docs/exec-plans/2026-04-10-client-intake-phase1-detailed-spec.md`
- `docs/features/client-intake-phase2-ambiguous-match-spec.md` → `docs/exec-plans/2026-04-13-client-intake-phase2-ambiguous-match-spec.md`
- `docs/features/custom-test-management-tabs-plan.md` → `docs/exec-plans/2026-04-14-custom-test-management-tabs-plan.md`
- `docs/features/client-search-navigation-plan.md` → `docs/exec-plans/2026-04-14-client-search-navigation-plan.md`

## Progress Updates
### Update 1
- Time: 2026-04-21
- Change: 실행 계획 초안 작성, 참조 위치와 대상 경로 확정.
- Reason: 4개 파일 이동이 40건 이상의 링크 업데이트를 수반하므로 범위를 명확히 하고 순서를 고정할 필요.

### Update 2
- Time: 2026-04-21
- Change: `git mv`로 4개 파일을 exec-plans로 이동. 빈 `docs/templates/` 삭제. 외부 참조(ARCHITECTURE.md, docs/features/ 7개 문서)와 이동된 3개 파일의 내부 cross-ref를 Python 스크립트로 일괄 갱신.
- Reason: 날짜 접두사 이름 부여로 exec-plans 네이밍 규칙 준수. 이동된 파일끼리의 sibling 참조는 파일명만으로 가능하도록 단축.

### Update 3
- Time: 2026-04-21
- Change: `docs/features/README.md`의 Documents 목록에서 이동 4개 항목 제거하고, 하단에 "Archived Design Docs" 섹션으로 새 위치 링크 제공.
- Reason: feature 허브는 현재 운영 중 기능만 나열하고, 구현 완료된 설계/기획 문서는 링크로만 안내하는 분리 구조로 맞춤.

### Update 4
- Time: 2026-04-21
- Change: 추가로 `client-assignment-multi-spec.md`를 `docs/exec-plans/2026-04-10-client-assignment-multi-detailed-spec.md`로 이동. 본문이 자기 성격을 "상세 설계 문서"로 명시하고 Goal State/Change Direction 섹션 구조였기 때문에 exec-plan 성격에 해당.
- Reason: 직전 5개 이동 이후 재검증 과정에서 누락된 1건을 발견. features/에는 source-of-truth 성격만 남긴다는 기준을 일관 적용.

## Result
- 이동 파일 4개, 빈 폴더 1개 삭제, 외부 참조 22줄, 내부 cross-ref 5줄 갱신.
- 최종 링크 스캔: 운영 문서에서 깨진 링크 0건. exec-plans 과거 기록의 깨진 링크 5건은 역사적 기록 보존 원칙에 따라 의도적으로 유지.
- 기능 동작에는 영향 없음 (코드 미수정).

## Verification
- Checked:
  - `git status`로 4건 rename과 1건 생성 확인
  - Python 스캐너로 118→119 md 파일 전수 링크 검사
  - ARCHITECTURE.md의 phase2 상세 링크가 새 exec-plans 경로로 갱신됨
  - docs/features/README.md Documents 목록에 이동 4개 항목 제거, Archived Design Docs 섹션 추가
- Not checked:
  - exec-plans 과거 기록의 깨진 5개 링크는 의도적으로 갱신하지 않음 (README 원칙 준수)
  - git history에서 rename이 content similarity로 정상 추적되는지 시각적 확인 (`git log --follow`)은 생략

## Retrospective
### Classification
- `No Major Issue`

### What Was Wrong
- 이전 운영에서 Phase/Plan 성격 문서를 features/에 넣은 관행이 쌓여 있었다. doc-governance는 이 구분을 명시하지만 실제 운영에선 경계가 느슨했다.

### Why
- 설계 단계 문서를 features/에 두면 당시엔 참조가 자연스럽지만, 구현 완료 후엔 정책 문서와 스펙 문서 사이의 위상 차이가 흐려진다.

### Next Time
- 새 plan/phase 성격 문서는 기본적으로 `docs/exec-plans/`에 날짜 접두사로 생성하고, 정책/source-of-truth만 `docs/features/`에 남긴다.
- plan + spec 2단 분리가 필요한 경우 plan은 exec-plans/, spec은 features/에 둔다.

## Related Documents
- [Documentation Hub](/mnt/c/Users/user/workspace/2.0-modular/docs/README.md)
- [docs/exec-plans/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/exec-plans/README.md)
- [docs/doc-governance.md](/mnt/c/Users/user/workspace/2.0-modular/docs/doc-governance.md)
