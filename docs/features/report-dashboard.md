# Report Dashboard

## Purpose
채점 완료된 검사 제출 결과를 수검자와 관리자 모두가 열람할 수 있는 대시보드 형태의 결과 보고서 기능이다.

## Main Endpoints
- `GET /api/report/by-submission/{submission_id}?token={access_token}` — 수검자용 (인증 불필요, 제출 ID + access_token 검증)
- `GET /api/admin/report/{submission_id}` — 관리자용 (admin_session 쿠키 인증)

## Browser Routes
- `/report/:submissionId?token={access_token}` — 수검자 결과 열람 (공개, 사이드바 없음)
- `/admin/report/:submissionId` — 관리자 결과 열람 (공개, 사이드바 없음)

## Main Files

### Backend
- `app/router/report_router.py` — 두 엔드포인트 정의
- `app/services/report/builder.py` — 채점 결과 → 보고서 데이터 변환 로직
- `app/services/report/__init__.py`

### Frontend
- `frontend/src/pages/report/ReportPage.tsx` — 대시보드 전체 컴포넌트
- 차트 라이브러리: `recharts` (LineChart, ReferenceArea, ReferenceLine 사용)

## Behavior Summary
- 수검자는 검사 완료 직후 CompleteStep의 "결과 보기" 버튼으로 이동한다.
- 수검자 결과 조회는 검사 링크 토큰만으로 조회하지 않고, 제출 ID와 access_token이 모두 일치할 때만 반환한다.
- 관리자는 내담자 상세 화면의 완료된 검사 목록에서 "보고서" 버튼으로 이동한다.
- 채점 결과(`submission_scoring_result`)가 없으면 자동 채점을 수행한 뒤 보고서를 반환한다.
- 결과 없음 또는 채점 실패 시 오류 메시지를 반환한다.

## Dashboard Layout

### 헤더
- 검사명, 검사일, 수검자 정보(이름/성별/연령/생년월일), 인쇄 버튼

### 좌측 사이드바 (척도 트리 네비게이션)
- 전체 요약 노드
- 척도별 노드 (▶ 펼침으로 하위척도 표시)
- 각 노드에 수준 뱃지(낮음/보통/높음) 표시

### 메인 패널 (선택 노드 기준 렌더링)
- **전체 요약**: 척도 요약 카드 그리드 + T점수 프로파일 라인차트 + 전체 점수 테이블
- **척도 상세**: 원점수/T점수/백분위 메트릭 카드 + 수평 T점수 바(Very Low~Very High) + 해석 텍스트 + 하위척도 목록
- **하위척도 상세**: 메트릭 카드 + T점수 바 + 해석 텍스트

## Data Structure

### API 응답 (`builder.py` 기준)
```json
{
  "submission_id": 12,
  "test_name": "PET 부모 효능감 검사",
  "test_date": "2026. 04. 16",
  "profile": {
    "name": "김민주",
    "gender": "여자",
    "birth_day": "2006-09-05",
    "age_text": "만 19세 7개월"
  },
  "scales": [
    {
      "code": "B01",
      "name": "부모양육효능감",
      "raw_score": 45,
      "t_score": 50,
      "percentile": 50,
      "category": "보통",
      "interpretation": "...",
      "answered_item_count": 15,
      "expected_item_count": 15,
      "facets": [
        {
          "code": "A01",
          "name": "유능감",
          "raw_score": 23,
          "t_score": null,
          "percentile": null,
          "category": null,
          "interpretation": ""
        }
      ]
    }
  ]
}
```

### 척도 계층
```
검사 (test_name)
├── 척도 (scales[])       ← ScaleRow
│   ├── code, name, raw_score, t_score, percentile, category
│   ├── interpretation    ← interpret 테이블에서 조회 (category 또는 raw_score 기준)
│   └── facets[]          ← FacetRow (하위척도, 없으면 빈 배열)
│       ├── code, name, raw_score, t_score, percentile, category
│       └── interpretation
```

### 해석문구 데이터 소스
- `interpret` 테이블의 `map` JSON에서 척도 코드 + category(낮음/보통/높음) 또는 raw_score 범위로 매칭
- 조회 로직: `app/services/report/builder.py` → `_load_interpret_map`, `_get_interpretation`
- 상세: [docs/features/scoring-flow.md — 해석문구 조회](/mnt/c/Users/user/workspace/2.0-modular/docs/features/scoring-flow.md)

## T점수 시각화 기준
- Very Low: T < 30
- Low: 30 ≤ T < 40
- Average: 40 ≤ T ≤ 60
- High: 60 < T ≤ 70
- Very High: T > 70

수평 바는 T 20–80 범위를 5구간으로 나눠 표시하며, 점 마커로 해당 T점수 위치를 나타낸다.

## 해석 텍스트 관리
- `app/services/report/builder.py` 상단의 `_INTERPRETATIONS` dict에서 관리한다.
- 키 구조: `test_id → scale_code → category(낮음/보통/높음) → text`
- 현재 PET 검사의 B01(부모양육효능감), B02(배우자양육협력) 척도 해석이 정의되어 있다.
- 해석이 없으면 빈 문자열 반환 (UI에서 해석 섹션 자동 숨김)

## 검사별 확장 방법
1. `_INTERPRETATIONS`에 해당 test_id 키와 척도별 텍스트를 추가한다.
2. 채점 결과 JSON에 `facets`가 포함되면 자동으로 하위척도가 사이드바와 패널에 렌더링된다.
3. 별도의 프론트엔드 코드 변경 없이 데이터 구조만 맞추면 동작한다.

## 인쇄
- 인쇄 버튼은 `window.print()`를 호출한다.
- `print:hidden` Tailwind 클래스로 불필요한 UI 요소를 인쇄 시 숨긴다.

## Related Documents
- [docs/features/scoring-flow.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/scoring-flow.md)
- [docs/features/assessment-link-flow.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/assessment-link-flow.md)
- [ARCHITECTURE.md](/mnt/c/Users/user/workspace/2.0-modular/ARCHITECTURE.md)
