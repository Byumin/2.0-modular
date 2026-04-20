# AGENTS.md - 검사 실시 화면 레퍼런스

## 파일

- `src/app/components/AssessmentPreview.tsx` — 카드형 + 모드 전환 래퍼
- `src/app/components/QuestionEditorial.tsx` — 집중형 (풀스크린 1문항)

## 카드형: grid lg:grid-cols-[1fr_220px]

- sticky 헤더(stepper + progress bar) + 좌측 문항카드(4개/페이지) + 우측 사이드바(sticky top-16)
- 사이드바 순서: 도넛 진행률 → 문항이동 → 빠른이동(5열, max-h-88px) → 모드토글 → 제출
- 카드 아래 이전/다음 버튼 없음, 페이지 인디케이터와 사이드바 라벨 동일 높이

## 집중형: 풀스크린 1문항

- 응답 시 350ms 자동 이동, 키보드 1~5/←→, 하단 fixed dot nav

## 토큰: Primary #175e63, BG(카드) #f0f2f5, BG(집중) #fafbfc
