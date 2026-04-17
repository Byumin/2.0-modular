# Execution Plan

## Task Title
- ProfileStep 재검사 UX 개선 — 실시 내역 목록 표시 및 재검사 확인 모달

## Request Summary
- "인적사항 확인 후 시작하기" 버튼 문구를 "시작하기"로 변경
- 기존 실시 결과가 있으면 전체 실시 내역 영역에 목록으로 표시
- 기존 결과가 있는 상태에서 "시작하기" 클릭 시 확인 모달 표시
  - 모달 문구: "기존 검사 결과는 삭제되고 앞으로 실시한 응답으로 결과가 제공됩니다"
  - 확인 → 재검사 진행 / 취소 → 모달 닫기

## Goal
- retakePrompt 발생 시 별도 모달 대신 실시 내역 영역에 기존 결과 인라인 표시
- 재검사 결과 덮어쓰기에 대한 명확한 사전 고지

## 변경 파일
- `frontend/src/pages/assessment/steps/ProfileStep.tsx`
- `frontend/src/pages/assessment/AssessmentPage.tsx`

## Initial Plan

### ProfileStep.tsx
1. Props 추가
   - `retakeInfo?: { submission_id: number; access_token: string; submitted_at?: string } | null`
   - `onRetakeConfirm?: () => void`
   - `onViewExistingResult?: () => void`
2. 상태 추가: `retakeConfirmOpen` (boolean)
3. `submitProfile()` 수정: `retakeInfo`가 있으면 `onNext` 대신 `setRetakeConfirmOpen(true)`
4. "인적사항 확인 후 시작하기" → "시작하기"
5. 전체 실시 내역 영역: `retakeInfo` 있으면 기존 제출일 + "결과 보기" 버튼 표시
6. 재검사 확인 모달 추가 (취소/확인)

### AssessmentPage.tsx
1. ProfileStep에 `retakeInfo={retakePrompt?.existingSubmission}` 전달
2. ProfileStep에 `onRetakeConfirm={handleRetakeConfirm}` 전달
3. ProfileStep에 `onViewExistingResult={handleViewExistingResult}` 전달
4. 기존 retakePrompt 모달 JSX 제거

## Progress Updates

### Update 1
- Time: 2026-04-17
- Change: 계획서 작성

## Result
(미완료)

## Verification
- 기존 실시 결과 없는 경우: 실시 내역에 안내 문구만 표시, "시작하기" 클릭 시 바로 진행
- 기존 실시 결과 있는 경우: 인적사항 입력 후 실시 내역에 제출일 + "결과 보기" 표시, 스크롤 이동
- 기존 결과 있는 상태에서 "시작하기" 클릭 → 재검사 확인 모달 표시
- 모달 "확인" → 재검사 진행 / "취소" → 모달 닫힘

## Related Documents
- [frontend/src/pages/assessment/steps/ProfileStep.tsx](/mnt/c/Users/user/workspace/2.0-modular/frontend/src/pages/assessment/steps/ProfileStep.tsx)
- [frontend/src/pages/assessment/AssessmentPage.tsx](/mnt/c/Users/user/workspace/2.0-modular/frontend/src/pages/assessment/AssessmentPage.tsx)
