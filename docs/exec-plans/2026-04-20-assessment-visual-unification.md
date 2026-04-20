# 검사 실시 화면 시각 언어 통일 (Profile ↔ Question 연속성)

작성일: 2026-04-20

## Goal
ProfileStep(진입화면)의 부드러운 글래스모피즘·teal 톤을 QuestionStep과 모달까지 일관되게 확장한다.
"두 개의 다른 디자인 시스템"이 아닌 "하나의 일관된 SaaS 제품"처럼 느껴지게 한다.

## Constraints / Tokens
- Primary accent: `#175e63` (teal)
- Background family: `#eef2f4`, `#f4f6f5`, `#f7f8f7` (soft grey-green)
- 금지: `#1F4E79` 같은 새 블루 톤 도입 금지
- 미니멀, 진정된, 프리미엄 분위기 유지 (강한 그라데이션·과한 장식 금지)

## Current State (조사 결과)
| 위치 | 색상 | 비고 |
| --- | --- | --- |
| `ProfileStep` 좌측 hero | `#eef2f4` + blob 애니메이션 | 사용자 만족 디자인 |
| `ProfileStep` 우측 폼 | `#f7f8f7`, accent `#175e63` | OK |
| `AssessmentPage` 헤더 strip | `bg-[#175e63]` (3px) | 이미 통일됨 |
| `AssessmentPage` 모달 strip | **`bg-[#1F4E79]` (1px)** | **불일치 — 교체 필요** |
| `QuestionStep` shell 배경 | `bg-[#f5f7fa]` (파랑톤) | **`#eef2f4` 계열로 통일 필요** |
| `QuestionStep` 카드 | `bg-white shadow-sm` | shadow/elevation 약함 |
| `QuestionStep` step viewMode 배너 | `bg-[#f5f7fa]` | 통일 필요 |
| `QuestionStep` aside view-mode 토글 | `bg-[#f5f7fa]` | 통일 필요 |
| `QuestionStep` 파트 이동 비활성 | `bg-[#f5f7fa]` | 통일 필요 |
| `CompleteStep` 배경 | `bg-[#f5f7fa]` | 통일 필요 |

## Plan

### 1. 색상 통일 (모달 + 배경)
- `AssessmentPage.tsx`
  - 모달 상단 strip `bg-[#1F4E79]` (2곳) → `bg-[#175e63]` 으로 교체, 두께 1px → 2px (헤더 3px와 비례 톤)
  - shell 배경: `step === 'profile' ? '#f4f6f5' : '#f5f7fa'` → 양쪽 모두 `#f4f6f5` 계열 유지 (question은 `#eef2f4` 살짝 톤다운)
  - 로딩/에러 화면 배경 `#f5f7fa` → `#eef2f4`
  - 헤더 인접 strip 두께 3px 유지, 진행 인디케이터 색상 그대로
- 모달 내부 profileSummary box `bg-[#f5f7fa]` → `bg-[#eef2f4]/60`

### 2. QuestionStep 시각적 위계 강화
- shell 배경: ProfileStep과 일관된 `#eef2f4` 톤 + 옅은 그라데이션
- 메인 카드: `shadow-sm` → `shadow-[0_8px_24px_-12px_rgba(23,94,99,0.18)]` + 1px border `#dfe5e3`
- 카드 상단 헤더에 매우 옅은 teal accent strip(2px) 추가 (헤더와 같은 tone)
- viewMode 배너 / 파트 이동 비활성 / 응답방식 토글 배경 `#f5f7fa` → `#eef2f4`
- 사이드바: `shadow-sm` → 동일한 shadow + border, sticky top 유지
- 진행률 bar 트랙은 `bg-border` 유지(이미 OK), 채움은 teal primary
- 미응답 ring 색상 `ring-destructive/50` 유지

### 3. Hero 연속성 (subtle)
- `index.css`에 `.hero-tint` 유틸 추가: `radial-gradient(ellipse at 8% -10%, rgba(106,173,255,0.06), transparent 55%), radial-gradient(ellipse at 95% 110%, rgba(93,216,196,0.05), transparent 60%)`
- `AssessmentPage` shell `<main>` 에 question 단계일 때 클래스 부여 → 매우 옅은(< 0.07) blob residue 톤만 남기고 애니메이션은 없음 (집중 방해 방지)
- CompleteStep도 같은 tint 적용

### 4. CompleteStep 톤 통일
- 배경 `#f5f7fa` → `#eef2f4` + hero-tint 클래스
- 카드 shadow 동일 처리

### 5. 결정/제외 사항
- **viewMode 토글 / 파트 이동 인터랙션 동작 변경 없음** — 스타일만 손봄
- 글래스 blob 애니메이션은 ProfileStep 전용 유지 (Question 화면에서 움직임은 집중 방해)
- 새 컴포넌트나 추상화 도입하지 않음 (in-place styling)
- DB/백엔드 변경 없음

## Files to Modify
1. `frontend/src/index.css` — `.hero-tint` 유틸 추가
2. `frontend/src/pages/assessment/AssessmentPage.tsx` — 모달 strip, shell 배경, 로딩/에러 배경
3. `frontend/src/pages/assessment/steps/QuestionStep.tsx` — 카드 elevation, viewMode 배너, 사이드바, 회색 → eef2f4
4. `frontend/src/pages/assessment/steps/CompleteStep.tsx` — 배경 톤 + tint

## Verification
- TypeScript 컴파일/Vite build 통과
- (UI 스크린샷 검증은 사용자 확인 단계에서 진행)

## Risks
- 너무 옅은 tint도 화면 전체에 깔리면 누적될 수 있음 → opacity 0.05 이하 유지
- `shadow-[...]` 임의값은 Tailwind v4에서 잘 동작하나, 큰 그림자가 다른 카드와 겹쳐 보일 수 있음 → 사이드바와 메인 같은 grade 사용

## Result (2026-04-20)
- `tsc --noEmit` 통과, `vite build` 통과 (6975 modules, 45s)
- 변경된 파일:
  - `frontend/src/index.css`: `.hero-tint`, `.assessment-card` 유틸 추가
  - `frontend/src/pages/assessment/AssessmentPage.tsx`: 모달 strip `#1F4E79` → `#175e63`(3px), 모달 prim 버튼 토큰 색상 → 직접 `#175e63`, shell 배경 question/loading/error → `#eef2f4` + `hero-tint`, 모달 배경 `bg-black/40` → `bg-[#0f2a2c]/35 backdrop-blur-sm`
  - `frontend/src/pages/assessment/steps/QuestionStep.tsx`: 메인 카드와 사이드바 카드에 `assessment-card` shadow + `border-[#dfe5e3]`, 메인 카드 상단 2px teal accent strip + 라벨, 사이드바 모든 회색 토글 `#f5f7fa` → `#eef2f4`, 진행바 트랙 `bg-border` → `bg-[#eef2f4]`, primary 색상 토큰을 명시적 `#175e63`로 통일 (HSL primary가 파랑톤이라 hero와 시각적 충돌)
  - `frontend/src/pages/assessment/steps/CompleteStep.tsx`: 배경 `#f5f7fa` → `#eef2f4` + `hero-tint`, primary 버튼 직접 `#175e63`, 라벨 카피("Submission Complete") 추가로 hero 라벨 스타일과 통일
- 미반영(의도적):
  - `--color-primary` 토큰 자체는 변경하지 않음 (다른 화면 영향 차단). assessment 화면 한정으로 직접 `#175e63` 사용.
  - viewMode/파트 이동 인터랙션은 손대지 않음.

## Retrospective
- Plan: 색상 단일 통일이 아닌 "토큰은 두고 화면 한정 직접색"으로 가는 판단은 옳았다. 전역 token 변경은 admin 등 다른 화면에 회귀를 줄 수 있다.
- Execution: 모달 backdrop을 `bg-black/40` → `bg-[#0f2a2c]/35 backdrop-blur-sm`로 바꾼 건 plan에 없던 즉흥 결정. teal-tinted dim + blur로 "프리미엄" 톤 강화. 회귀 위험 없음.
