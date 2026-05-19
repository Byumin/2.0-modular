# 검사 실시 안내 화면(Intro Step) 추가

작성일: 2026-04-20

## Goal
profile(인적사항) 제출 후 바로 문항으로 진입하던 흐름에 안내 화면을 삽입한다.
수검자가 검사를 시작하기 전에 검사 구성(문항 수, 파트), 응답 방법, 본인 정보를 확인하고 준비된 상태로 시작할 수 있게 한다.

## 흐름 변경
- 기존: profile → question → complete  
- 변경: profile → **intro** → question → complete

## Files to Modify
1. `frontend/src/pages/assessment/types.ts` — AssessmentStep, InitialPayload 타입 확장
2. `frontend/src/pages/assessment/steps/IntroStep.tsx` — 신규 생성
3. `frontend/src/pages/assessment/AssessmentPage.tsx` — step 전환, stepMeta, shellWidthClass, progress indicator, 렌더링

## Constraints
- 백엔드 변경 없음
- ProfileStep/QuestionStep/CompleteStep 변경 없음
- 이미 적용된 비주얼 언어(#175e63, #eef2f4, assessment-card, hero-tint) 그대로 사용

## Result (2026-04-20)
- `tsc --noEmit` 통과, `vite build` 통과 (6976 modules)
- 변경된 파일:
  - `types.ts`: AssessmentStep에 'intro', InitialPayload에 description?/estimated_time_minutes? 추가
  - `steps/IntroStep.tsx`: 신규 생성 — 검사 구성 + 응답 안내 + 수검자 정보 확인 + 시작/뒤로 버튼
  - `AssessmentPage.tsx`: import 추가, proceedToQuestionStep에서 setStep("intro"), stepMeta 확장, shellWidthClass intro 분기, progress indicator 4단계, IntroStep 렌더링 추가
- 팁 1번 문구: "각 문항을 읽고..." → "방해받지 않는 조용한 환경에서 혼자 응답하세요." (사용자 피드백 반영)
