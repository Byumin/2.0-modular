# 검사 실시 화면 Figma 디자인 반영

작성일: 2026-04-20

## 목표
`docs/design/reference/figma-branch` 레퍼런스를 기준으로 QuestionStep(카드형/집중형) 전체를 재설계한다.

## 핵심 변경 내용

### 카드형 (cards)
- 배경: `#f0f2f5` (현재 `#eef2f4`)
- Sticky 헤더: white/95 backdrop-blur, h-0.5 진행바 하단 내장
- 카드: `rounded-2xl border-2`, 응답 완료 시 `border-[#175e63]/15` + 체크 인디케이터
- 번호 뱃지: `size-10 rounded-xl` (응답 전 회색, 응답 후 teal)
- 옵션: `rounded-xl border-2 py-3 flex-1` — 숫자 bold + 라벨 아래 (박스 제거)
- 사이드바: 220px, 도넛 SVG 진행률, 빠른이동 5열 grid
- 카드 하단 이전/다음 버튼 제거, 사이드바에서만 페이지 전환

### 집중형 (step)
- 배경: `#fafbfc`
- 미니멀 헤더: 검사명 + N/total + 제출 버튼
- 워터마크 번호: `text-[80px] font-black text-[#175e63]/10`
- 문항 텍스트: `text-2xl sm:text-3xl` + `animate-[fadeSlide_0.3s_ease-out]`
- 옵션: `size-14 rounded-2xl border-2`, 선택 시 `scale-110 shadow-lg`
- 응답 즉시 350ms 후 자동 전진
- 하단 fixed dot navigation

## 수정 파일
1. `frontend/src/index.css` — `@keyframes fadeSlide` 추가
2. `frontend/src/pages/assessment/AssessmentPage.tsx` — question step은 공유 헤더 제거, `testName`/`userSummary` QuestionStep에 전달
3. `frontend/src/pages/assessment/steps/QuestionStep.tsx` — 전면 재설계
4. `frontend/src/pages/assessment/components/LikertCard.tsx` — 옵션 버튼 스타일 업데이트
5. `frontend/src/pages/assessment/components/BipolarCard.tsx` — 옵션 버튼 스타일 업데이트

## 유지 사항
- 기존 parts/bundles/paging 로직 그대로
- MatrixCard/TextCard 변경 없음
- 키보드 단축키 동작 유지
- 타입 변경 없음
