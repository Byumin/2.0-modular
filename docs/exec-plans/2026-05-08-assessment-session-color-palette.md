# 검사 실시 세션별 색상 팔레트 전환

## 작업 제목
검사 세션 진행에 따른 색상 단계적 변화 구현

## 요청 요약
검사 실시 중 세션이 바뀔 때마다 IntroStep, QuestionStep 전체 색조가 달라지도록 구현한다.
세션은 최대 3개이며, 세션 0 → 1 → 2 순서로 teal → steel blue → deep navy 방향으로 색상이 이동한다.

## 작업 목표
- 세션 인덱스(0, 1, 2)에 따라 전용 색상 팔레트 3개 정의
- IntroStep 배경 gradient가 현재 세션 팔레트로 렌더링됨
- QuestionStep의 progress bar, 헤더 아이콘, 선택 상태, 버튼 색이 현재 세션 팔레트로 렌더링됨
- 세션 전환 시 시각적으로 "구간이 달라졌다"는 느낌이 자연스럽게 전달됨

## 초기 가설
- 팔레트를 `palette.ts`에 정의하고 AssessmentPage에서 activeSessionIndex로 선택
- IntroStep, QuestionStep에 `palette` prop 추가
- 컴포넌트 내부 hard-coded `#175e63` 등을 `palette.accent` 등 변수 참조로 교체
- Tailwind 임의값 클래스 대신 `style={{ ... }}` inline style로 동적 색상 적용

## 팔레트 정의
| | Session 0 | Session 1 | Session 2 |
|---|---|---|---|
| 기조 | Teal (현재) | Steel Ocean | Deep Navy |
| accent | `#175e63` | `#17506c` | `#1e3f8a` |
| accentHover | `#124b4f` | `#124058` | `#183273` |
| gradientFrom | `#0d3b3f` | `#0d3245` | `#0d2847` |
| gradientMid | `#0f4a4e` | `#0f3d56` | `#0f2f5c` |
| gradientTo | `#124b4f` | `#124360` | `#17346a` |
| accentLight | `#5ce1e6` | `#60b4d8` | `#7b96e0` |

## 실행 계획
1. `frontend/src/pages/assessment/palette.ts` 생성 — 팔레트 타입 및 3개 팔레트 배열 정의
2. `AssessmentPage.tsx` 수정 — activeSessionIndex로 팔레트 선택, IntroStep/QuestionStep에 prop 전달
3. `IntroStep.tsx` 수정 — palette prop 추가, gradient/accent를 palette 값으로 교체
4. `QuestionStep.tsx` 수정 — palette prop 추가, progress bar/icon/button/selected state를 palette 값으로 교체

## 작업 중 변경 사항
- palette.ts 별도 파일 방식 → index.css CSS 커스텀 프로퍼티(.session-teal/.session-ocean/.session-navy) 방식으로 변경
  - CSS 변수가 DOM 트리 cascade를 통해 자동 적용되어 QuestionCard → LikertCard/BipolarCard까지 prop drilling 없이 적용 가능
- hover 색상은 `hover:text-[var(--sa)]` 방식으로 처리, 버튼 hover는 `hover:opacity-90`으로 통일
- 빠른 이동 버튼의 ring 색은 Tailwind ring 클래스 제거하고 backgroundColor만 적용 (ring-color를 CSS style로 전달 불가)

## 결과
- index.css에 `.session-teal`, `.session-ocean`, `.session-navy` 3개 CSS 클래스 추가
- AssessmentPage에서 `activeSessionIndex`로 sessionClass 선택 후 IntroStep/QuestionStep에 prop 전달
- 변경 파일: index.css, AssessmentPage.tsx, IntroStep.tsx, QuestionStep.tsx, LikertCard.tsx, BipolarCard.tsx
- TypeScript 에러 없음 (기존 무관 파일의 pre-existing 에러 제외)

## 검증 내용
- [ ] 세션 0: teal 배경으로 IntroStep 렌더링
- [ ] 세션 1: steel blue 배경으로 IntroStep 렌더링
- [ ] 세션 2: deep navy 배경으로 IntroStep 렌더링
- [ ] QuestionStep progress bar, 버튼, 선택 상태가 각 세션 팔레트 색으로 표시
- [ ] 단일 세션 검사에서 기본(teal) 유지

## 회고
(브라우저 확인 후 기록)
