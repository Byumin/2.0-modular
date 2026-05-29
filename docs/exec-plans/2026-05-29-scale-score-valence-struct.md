# Execution Plan

## Task Title
- `scale.struct` score valence metadata implementation

## Request Summary
- RDS `scale.struct` 안에 척도별 점수 해석 방향을 추가한다.
- 상위척도와 하위척도는 각자 독립 `choice_score`를 유지하고, `score_valence`만 메타데이터로 추가한다.
- 채점 결과와 보고서 API에서 해당 메타데이터를 사용할 수 있게 구현한다.

## Goal
- RDS `scale.struct`의 상위척도 및 `facet_scale` 노드에 `score_valence`를 추가한다.
- 기존 `choice_score` 구조와 Option B 상위/하위척도 계산 방식을 변경하지 않는다.
- 신규/재채점 결과 및 보고서 응답에 `score_valence`가 전달되게 한다.

## Preflight Checklist
- [x] `AGENTS.md` 확인
- [x] 작업 종류별 source-of-truth 확인:
  - 코드/구조: `ARCHITECTURE.md`
  - DB: `docs/database/runtime-db.md`
  - UI/디자인: 해당 없음
  - 문서 체계: `docs/doc-governance.md`
  - 설명/디버깅: `docs/debug/explanation-rule.md`
- [x] 운영 DB 기준 확인: `APP_ENV=local.prod` RDS 읽기 확인
- [x] 검증 방법과 미검증 가능 항목 정의

## Initial Hypothesis
- `score_valence`는 `choice_score`와 독립적인 해석 메타데이터로 추가해야 한다.
- 채점 인덱스 생성 시 `score_valence`를 scale/facet entry에 복사하면 이후 scoring result와 report builder가 그대로 노출할 수 있다.
- RDS 업데이트는 스크립트로 dry-run, backup, apply 단계를 분리해야 한다.

## Initial Plan
1. RDS `scale.struct`의 test/condition/scale/facet 코드와 이름을 추출한다.
2. 코드 기반 `score_valence` 매핑을 정의하고 적용 스크립트를 만든다.
3. `app/services/scoring/utils.py`에서 scale/facet `score_valence`를 채점 결과로 전달한다.
4. `app/services/report/builder.py`에서 scale/facet row에 `score_valence`를 포함한다.
5. dry-run 및 단위성 검증을 실행하고, 변경량 확인 후 RDS에 적용한다.

## Progress Updates
### Update 1
- Time: 2026-05-29
- Change: 작업 시작, source-of-truth 및 현재 코드 흐름 확인.
- Reason: DB와 코드 변경이 모두 포함된 작업이므로 실행계획을 먼저 작성.

### Update 2
- Time: 2026-05-29
- Change: RDS `scale.struct` 대상 목록을 추출하고 `score_valence` 매핑 스크립트를 작성했다.
- Reason: `choice_score` 구조를 손대지 않고 상위척도/하위척도 노드에 메타데이터만 추가하기 위해 dry-run 가능한 스크립트가 필요했다.

### Update 3
- Time: 2026-05-29
- Change: `app/services/scoring/utils.py`, `app/services/report/builder.py`, `frontend/src/pages/report/ReportPage.tsx`에 `score_valence` 전달 경로를 추가했다.
- Reason: 신규 채점 결과, 보고서 API, 리포트 화면 변환 로직이 RDS 메타데이터를 사용할 수 있어야 한다.

### Update 4
- Time: 2026-05-29
- Change: RDS 적용 완료. 10개 `scale` row, 149개 scale/facet node에 `score_valence` 추가.
- Reason: dry-run에서 변경 대상과 누락 코드가 확인되어 실제 적용했다.

### Update 5
- Time: 2026-05-29
- Change: 보고서 빌더에 RDS `scale.struct` fallback lookup을 추가했다.
- Reason: 기존 `submission_scoring_result` JSON에는 `score_valence`가 없으므로, 재채점 전 기존 제출도 보고서 API에서 valence를 받을 수 있어야 한다.

### Update 6
- Time: 2026-05-29
- Change: 리포트 화면 색상 tone 계산을 `score_valence + 점수 위치` 기준으로 명시했다. 해석문구 영역과 하위척도 해석문구도 같은 tone 음영을 쓰도록 수정했다.
- Reason: 긍정 척도는 낮음=빨강/높음=초록, 부정 척도는 낮음=초록/높음=빨강, 중간=회색 규칙을 막대와 해석 영역에 일관되게 적용하기 위해서다.

## Result
- `scripts/apply_scale_score_valence.py` 추가.
- RDS `scale.struct`에 `score_valence` 추가 완료.
  - `neutral`: 87 nodes
  - `negative`: 19 nodes
  - `positive`: 43 nodes
- 원본 백업 생성:
  - `/mnt/c/Users/user/workspace/2.0-modular/artifacts/db-backups/20260529-172955-scale-struct-before-score-valence.json`
- 채점 결과의 scale/facet entry에 `score_valence`가 포함되도록 구현.
- 보고서 API의 scale/facet row에 `score_valence`가 포함되도록 구현. 기존 채점 결과에는 RDS `scale.struct` fallback을 사용한다.
- 프론트 리포트 변환 로직은 API의 `score_valence`를 기존 hardcoded direction map보다 우선 사용하도록 수정.
- 리포트 화면의 막대 색상, 구간 막대 배경, 해석문구 음영은 `score_valence` 기반 tone 규칙을 우선 사용한다.

## Verification
- Checked:
  - `python -m py_compile app/services/scoring/utils.py app/services/report/builder.py scripts/apply_scale_score_valence.py`
  - `scripts/apply_scale_score_valence.py` dry-run: 적용 전 10 rows / 149 nodes, 적용 후 0 rows / 0 nodes.
  - RDS 재조회: `neutral=87`, `negative=19`, `positive=43`.
  - `build_scoring_scale_index` smoke test: parent/facet `score_valence` 전달 확인.
  - `_load_scale_valence_map` smoke test: PCT `B01=positive`, `A01=positive`, `A02=negative`.
  - `npm --prefix frontend run build`
  - Playwright screenshot:
    - `/mnt/c/Users/user/workspace/2.0-modular/artifacts/screenshots/2026-05-29-report-valence-colors-before.png`
    - `/mnt/c/Users/user/workspace/2.0-modular/artifacts/screenshots/2026-05-29-report-valence-colors-after.png`
    - `/mnt/c/Users/user/workspace/2.0-modular/artifacts/screenshots/2026-05-29-report-valence-colors-after-pct-tab.png`
- Not checked:
  - 운영 도메인에서 실제 제출 보고서 화면 캡처는 수행하지 않음.

## Retrospective
### Classification
- No Major Issue

### What Was Wrong
- 해당 없음.

### Why
- 작업 전 RDS 구조 확인과 dry-run 적용을 분리해 진행했다.

### Next Time
- valence 매핑은 검사 매뉴얼/전문가 검토를 거쳐 조정 가능하도록 스크립트 상단의 `SCALE_VALENCE_BY_TEST`를 단일 기준으로 유지한다.

## Related Documents
- [AGENTS.md](/mnt/c/Users/user/workspace/2.0-modular/AGENTS.md)
- [ARCHITECTURE.md](/mnt/c/Users/user/workspace/2.0-modular/ARCHITECTURE.md)
- [docs/database/runtime-db.md](/mnt/c/Users/user/workspace/2.0-modular/docs/database/runtime-db.md)
- [docs/features/scoring-implementation-playbook.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/scoring-implementation-playbook.md)
