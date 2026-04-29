# Hierarchical Scale Selection

## Task Title
- 검사 생성 척도 선택 계층화

## Request Summary
- 검사 생성 화면의 척도 선택이 flat code 목록이 아니라 `A > A1/A2` 같은 계층 구조를 가진 UI로 보여야 한다.
- 같은 척도 코드/명이라도 실시구간 condition에 따라 구성 또는 이름이 다를 수 있음을 고려해야 한다.

## Goal
- 카탈로그 응답에 척도 계층을 보존한 `scale_tree`를 추가한다.
- 프론트 검사 생성 화면에서 상위 척도는 접힘/펼침 노드로 보여주고, 선택 가능한 하위 척도는 체크박스로 선택하게 한다.
- condition별 척도 구성이 다르면 같은 코드로 무리하게 병합하지 않고 실시구간 라벨을 포함해 별도 선택 항목으로 유지한다.

## Initial Hypothesis
- 현재 `scale.struct`는 상위 척도에 `facet_scale`을 둬 계층을 표현한다.
- 기존 카탈로그 응답의 `scales`는 top-level만 flat하게 내려주고, 프론트도 code 기준으로 병합해서 condition별 차이를 잃는다.

## Initial Plan
1. `scale.struct`를 재귀적으로 `scale_tree`로 변환하는 백엔드 helper를 추가한다.
2. 기존 `scales` flat 응답은 유지하되, 프론트는 `scale_tree`를 우선 사용하게 한다.
3. 프론트 선택 key를 `test_id + condition + scale path` 기반으로 바꿔 condition별 척도 차이를 보존한다.
4. 선택 payload에는 기존 API와 호환되도록 `selected_scale_codes`만 보낸다.
5. 타입체크/빌드와 화면 캡처로 검증한다.

## Progress Updates
### Update 1
- Time: 2026-04-29
- Change: 계획 작성
- Reason: UI/API 변경이 포함되어 실행 계획을 먼저 남김

### Update 2
- Time: 2026-04-29
- Change: 백엔드 카탈로그 응답에 `scale_tree` 추가
- Reason: `facet_scale` 계층을 프론트로 보존해서 내려주기 위함

### Update 3
- Time: 2026-04-29
- Change: 프론트 척도 선택 UI를 condition 섹션 + 계층 트리로 변경
- Reason: 같은 검사 안에서도 실시구간별 척도 구성 차이를 분리해서 보여주고, 상위 척도 펼침 후 하위 척도 선택을 지원하기 위함

### Update 4
- Time: 2026-04-29
- Change: 생성/실시 조립 로직이 nested `facet_scale` leaf code를 인식하도록 수정
- Reason: UI에서 `A01` 같은 하위 척도를 선택했을 때 기존 top-level code 판정만으로는 생성/수검 payload가 깨질 수 있었음

### Update 5
- Time: 2026-04-29
- Change: 검사 생성 척도 선택 펼침 UI의 패딩, 폰트 크기, 검사별 헤더 문구를 정리
- Reason: 계층 구조는 유지하되 펼쳤을 때 여백이 과하고 "전체 척도 선택" 문구가 불필요하게 길어 보였음

### Update 6
- Time: 2026-04-29
- Change: 실시구간을 연령 시작값 기준으로 정렬하고, 척도 코드/명/계층 구조가 같은 실시구간은 하나의 척도 선택 블록으로 병합
- Reason: 연령이 낮은 구간을 먼저 보여주고, 실시구간만 쪼개져 있지만 척도 선택 구조가 같은 경우 중복 선택란을 줄이기 위함

### Update 7
- Time: 2026-04-29
- Change: 척도 선택 실시구간 헤더에서 문항 수를 별도 줄이 아니라 같은 줄 오른쪽에 표시
- Reason: 실시구간과 문항 수를 한눈에 읽게 하고 펼침 영역 높이를 더 줄이기 위함

## Result
- 카탈로그 응답이 기존 `scales` flat 목록과 새 `scale_tree`를 함께 제공한다.
- 검사 생성 화면에서 실시구간별 섹션 아래 상위 척도 노드가 표시되고, 펼치면 하위 척도를 선택할 수 있다.
- 검사별 척도 선택 헤더는 검사명만 표시하고, 펼침 영역은 더 작은 패딩과 폰트로 촘촘하게 표시한다.
- 검사별 헤더 폰트는 더 작게 조정했고, 실시구간은 낮은 연령부터 정렬한다.
- 척도 코드/명/계층 구조가 같은 실시구간은 화면에서 하나로 병합하되, 선택 시 내부 실시구간별 leaf key는 함께 선택된다.
- 실시구간 헤더는 `만 0~6세, 만 7세 이상    43문항`처럼 한 줄에 표시한다.
- 선택 key가 `test_id + sub_test_json + scale path` 기준으로 바뀌어 condition별 척도 구성이 UI에서 섞이지 않는다.
- 기존 생성 API와 호환되도록 payload는 여전히 `selected_scale_codes`와 `excluded_sub_test_jsons`를 보낸다.
- 생성 서비스와 수검 payload 조립은 top-level code와 leaf code를 모두 인식한다.

## Verification
- Checked:
  - `.venv/bin/python -m py_compile app/services/admin/custom_tests.py app/repositories/parent_test_repository.py`
  - `npm run build:frontend`
  - Playwright screenshot: `artifacts/screenshots/2026-04-29-hierarchical-scale-selection-pct-expanded.png`
  - Playwright screenshot: `artifacts/screenshots/2026-04-29-scale-selection-density-after.png`
  - Playwright screenshot: `artifacts/screenshots/2026-04-29-scale-selection-merged-age-after.png`
  - Playwright screenshot: `artifacts/screenshots/2026-04-29-scale-selection-condition-count-inline.png`
  - PCT 화면에서 `부모양육효능감 (B01)` 아래 `유능감 (A01)`, `불안감 (A02)` 표시 확인
  - PCT 척도 선택 헤더가 `PCT`만 표시되고, 펼침 영역이 compact row 형태로 표시되는 것 확인
  - PAT-2 화면에서 `만 0~6세, 만 7세 이상` 실시구간이 하나의 척도 선택 블록으로 병합되는 것 확인
  - PAT-2 실시구간 헤더에서 문항 수가 같은 줄 오른쪽에 표시되는 것 확인
  - PCT `A01` leaf 선택 기준으로 variant config 생성 및 수검 payload item 8개 조립 확인
- Not checked:
  - 실제 검사 생성 POST까지는 수행하지 않음

## Retrospective
### Classification
- `No Major Issue`

### What Was Wrong
- 기존 UI는 척도를 code 기준 flat 목록으로 병합해서 `facet_scale` 계층과 실시구간별 구성 차이를 잃었다.

### Why
- 백엔드 카탈로그 응답이 계층 정보를 내려주지 않았고, 프론트도 같은 code를 하나의 선택 항목으로 묶었다.

### Next Time
- condition별 선택을 저장 구조까지 더 명시적으로 보존하려면 생성 API가 `sub_test_json`별 selected scale path를 직접 받는 형태로 확장되어야 한다.

## Related Documents
- [Documentation Hub](/mnt/c/Users/user/workspace/2.0-modular/docs/README.md)
- [docs/exec-plans/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/exec-plans/README.md)
- [QUALIT_SCORE.md](/mnt/c/Users/user/workspace/2.0-modular/QUALIT_SCORE.md)
- [AGENTS.md](/mnt/c/Users/user/workspace/2.0-modular/AGENTS.md)
