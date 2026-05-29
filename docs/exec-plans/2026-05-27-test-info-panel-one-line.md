# 실행 계획: TestInfoPanel 검사 정보 한 줄 배치

## 목적
전체 비교 탭 > 실시한 검사 정보 영역에서 각 검사 행이 2줄(검사명/배지)로 분리된 것을
영문 검사명 · 한국 검사명 · 척도 · 주의 · 긍정을 **한 줄**로 나열되도록 수정

## 변경 대상
- `frontend/src/pages/report/ReportPage.tsx`
- `TestInfoPanel` 컴포넌트 내 accordion 버튼 레이아웃 (line 691–707)

## 현재 구조
```
▶  [test_id]  [korean_name]
   [척도 N]  [주의 N]  [긍정 N]   ← 두 번째 줄 (mt-1 div)
```

## 목표 구조
```
▶  [test_id]  [korean_name]  [척도 N]  [주의 N]  [긍정 N]   ← 단일 행
```

## 수정 방법
- 버튼 내부의 `min-w-0 flex-1` div에서 두 row(`items-baseline` div + `mt-1 flex-wrap` div)를
  단일 `flex items-center gap-2` 행으로 통합
- korean_name은 `flex-1 truncate`로 남은 공간을 차지하게 하고, 배지들은 `shrink-0`으로 줄 끝에 고정

## 검증
- 로컬 프리뷰(/admin/report/47) 접속 후 전체 비교 탭 UI 확인
- 검사명이 길 경우 truncate 처리 확인

## 상태
- [x] 코드 수정
- [ ] 로컬 UI 확인
