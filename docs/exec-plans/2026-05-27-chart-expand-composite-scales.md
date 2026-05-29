# 실행 계획: 검사별 결과 한눈에 — 상위 척도 막대 그래프 수정

## 목적
"검사별 결과 한눈에" 차트에서 각 검사의 올바른 상위 척도를 막대로 표시

### 현재 문제
- K-PSI-4-SF: B01(총점)만 1개 막대 → PD/DC/PCDI 3개 막대가 보여야 함
- PAT-2: preview에 A03 1개 → 실제 6개 척도가 전부 보여야 함
- PCT: C01 1개 ✓ (정상)

### 원인 분석
K-PSI-4-SF의 scale_struct에서 B01은 직접 문항이 없고(choice_score 없음),
PD/DC/PCDI가 facet_scale로 정의되어 B01 원점수를 합산으로 산출함.
→ 현재 코드에서 B01이 VirtualTest.scales의 유일 항목으로 들어가 막대 1개만 표시됨.
→ PAT-2는 실제 데이터에 척도가 여러 개 있으나 preview가 A03 1개만 보여줌.

## 수정 전략: is_composite 플래그

### 1. 백엔드 — utils.py
`build_choice_score_result` 내에서 `has_items=False, has_facets=True` 조건이면
`scale_entry["is_composite"] = True` 추가.

### 2. 백엔드 — builder.py
`_build_scale_rows`에서 `"is_composite": bool(scale.get("is_composite", False))` 포함.

### 3. 프론트엔드 — ReportPage.tsx
- `ScaleRow`, `AugmentedScale` 인터페이스에 `is_composite?: boolean` 추가
- `augmentScale`에서 `is_composite` pass-through
- `groupScalesByTestId`: `is_composite=True && facets.length > 0` 이면 facets를 AugmentedScale로 승격
- LOCAL_REPORT_PREVIEW: B01에 `is_composite: true` 표시, PAT-2에 척도 6개로 보강

## 영향 범위
- TestComparisonChart: K-PSI → 3 막대(PD/DC/PCDI), PAT-2 → 6 막대
- TestInfoPanel: K-PSI → 3 척도 표시
- CrossTestBreakdown: K-PSI → PD/DC/PCDI 3개 행
- TestTab (K-PSI): 3개 척도 기준 차트/해석

## 검증
- [ ] 로컬 preview /admin/report/47 접속 → 전체 비교 탭 차트 K-PSI 3개, PAT-2 6개 확인
- [ ] PCT 1개 막대 유지 확인
- [ ] CrossTestBreakdown K-PSI 섹션 정상 표시 확인

## 상태
- [ ] utils.py 수정
- [ ] builder.py 수정
- [ ] ReportPage.tsx 수정
