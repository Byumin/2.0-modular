# Scoring Option B Hierarchy Implementation

## 요청 요약
문서화한 Option B와 위계 보존 규칙에 맞춰 K-PSI-4-SF, PCT, PAT-2 채점이 실제 검사 생성 링크의 선택 척도 구조와 맞게 동작하도록 구현한다.

## 작업 목표
- 선택 코드가 하위척도 코드여도 parent scale을 유지한다.
- PCT Option B는 parent flat `choice_score`와 facet `choice_score`를 둘 다 계산한다.
- K-PSI-4-SF는 `B01` parent와 `PD`/`PCDI`/`DC` facets를 유지하고 parent는 facet 합산으로 계산한다.
- PAT-2 기존 flat 구조는 유지한다.

## Preflight Checklist
- [x] `AGENTS.md` 확인
- [x] `docs/features/scoring-implementation-playbook.md` 확인
- [x] 기존 scoring index/build_choice_score_result 구현 확인

## 초기 가설
현재 실패 원인은 DB `scale.struct`의 top-level code와 검사 생성 시 선택된 하위척도 code를 직접 비교해서 parent scale을 버리는 것이다. 구조 정규화 단계에서 parent/facet 관계를 보존하면 기존 Scorer의 norm 적용 로직은 대부분 재사용할 수 있다.

## 실행 계획
1. `scale.struct`를 채점용 `items`/`facets` 구조로 정규화하는 공통 helper를 만든다.
2. `submissions.py`의 scoring index 생성에서 선택 코드가 하위 facet인 경우 parent를 유지한다.
3. `utils.py`의 fallback 구조 해석도 같은 helper를 사용하게 맞춘다.
4. 링크 29의 RDS 최신 제출을 쓰기 없이 재채점해 K-PSI-4-SF/PCT/PAT-2 scale count와 parent/facet 구조를 확인한다.
5. 필요한 경우 로컬/RDS 차이를 미검증 항목으로 남긴다.

## 작업 중 변경 사항
- `app/services/scoring/utils.py`에 `normalize_choice_score_map`과 `build_scoring_scale_index`를 추가했다.
- `app/services/scoring/submissions.py`가 scoring index를 만들 때 top-level code만 비교하지 않고 parent/facet 구조를 보존하도록 변경했다.
- `build_choice_score_result`의 fallback 경로도 같은 index helper를 사용하게 맞췄다.
- `app/services/report/builder.py`에서 빈/스킵 채점 결과가 있으면 보고서 생성 시 한 번 재채점하도록 보정했다.
- 보고서 응답 row에 `id`, `test_id`, facet `parent_code`를 추가해 서로 다른 검사에서 같은 scale code가 나와도 구분되게 했다.
- `frontend/src/pages/report/ReportPage.tsx`의 내부 navigation/key를 `code`가 아니라 `id` 기준으로 바꿔 `K-PSI-4-SF:B01`과 `PCT:B01` 충돌을 막았다.

## 결과
- 링크 29 최신 제출 `submission_id=45` 기준으로 K-PSI-4-SF, PAT-2, PCT가 모두 채점 산출된다.
- K-PSI-4-SF는 `B01` parent와 `DC`/`PCDI`/`PD` facets를 유지한다.
- PCT는 `B01`/`B02`/`B03` parent를 flat `choice_score`로 계산하고, `A01`~`A07` facets를 별도 계산한다.
- PAT-2는 기존처럼 `A01`~`A08` flat scale로 계산된다.
- PSES는 아직 Scorer가 없으므로 `unsupported_test_id`로 skip된다.
- RDS 제출 45는 보고서 빌더 검증 중 기존 skipped 결과 이후 새 `submission_scoring_result` id 50이 생성되었고, 최신 상태는 `scored,skipped`다.

## 검증 내용
- `python3 -m compileall app/services/scoring/tests app/services/scoring app/services/report` 통과.
- `npm --prefix frontend run build` 통과.
- RDS 제출 45를 쓰기 없이 직접 재채점했을 때:
  - K-PSI-4-SF: `status=scored`, scale `B01`, facets `DC`/`PCDI`/`PD`
  - PAT-2: `status=scored`, scales `A01`~`A08`
  - PCT: `status=scored`, scales `B01`/`B02`/`B03`, facets `A01`~`A07`
  - PSES: `status=skipped`, reason `unsupported_test_id`
- 공개 보고서 빌더로 RDS 제출 45를 조회해 scale 12개가 반환되는 것을 확인했다.
- 보고서 응답에 `K-PSI-4-SF:B01`과 `PCT:B01`처럼 고유 id가 내려오는 것을 확인했다.
- Playwright에서 report API를 mock한 결과 화면 렌더링 검증:
  - console/page error 없음
  - 중복 `B01` 중 `PCT:B01`에 해당하는 `부모양육효능감` 상세 패널 진입 확인
- 검증 후 Vite dev server와 RDS SSH 터널을 종료했다.

## 회고
- 실패 원인은 DB `scale.struct`가 틀린 것이 아니라 선택 코드와 top-level code를 같은 층위로 비교한 구현 판단 문제였다.
- Option B 구조에서는 parent scale과 facet scale을 둘 다 결과에 남기는 것이 맞다.
- 보고서 UI는 scale code만 고유하다고 가정하고 있었으므로, 복합 검사 결과에서는 `test_id:code` 형태의 고유 id가 필요하다.
