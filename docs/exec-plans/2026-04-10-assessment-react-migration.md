# Execution Plan

## Task Title
- 검사 실시 페이지 React 전환 (assessment-custom.html → React SPA)

## Request Summary
- 기존 `/assessment/custom/{token}` 정적 HTML + vanilla JS 구현을 React 컴포넌트로 전환
- 렌더 타입별 문항 렌더링 로직을 그대로 재현

## Goal
- 기존 기능 100% 동등 구현
- React 상태 관리로 렌더링 흐름 단순화
- 기존 API 엔드포인트 그대로 사용

## API 흐름
1. `GET /api/assessment-links/{token}` → 프로필 설정 (required_profile_fields, additional_profile_fields)
2. `POST /api/assessment-links/{token}/validate-profile` → assessment_payload (parts/items)
   - 오류코드 `AUTO_CREATE_CONFIRM_REQUIRED` 시 신규 내담자 등록 모달
3. `POST /api/assessment-links/{token}/register-client` → 신규 내담자 등록
4. `POST /api/assessment-links/{token}/submit` → 최종 제출

## 렌더 타입
| render_type | 설명 |
|---|---|
| `likert` (기본) | 선택지 카드형 |
| `bipolar` | 좌우 극단 라디오 |
| `bipolar_with_prompt` | bipolar + 텍스트 프롬프트 |
| `bipolar_labels_only` | 양극 레이블만 |
| `likert_matrix` | matrix_group_key로 묶인 행렬형 |
| `text` | 자유 텍스트 입력 |

## 스텝 구성
- ProfileStep: 필수 필드 + 추가 필드
- QuestionStep: 파트 전환 + 카드/스텝 모드 + 진행률
- CompleteStep: 완료 화면

## 파일 구조
```
src/pages/assessment/
  AssessmentPage.tsx
  types.ts
  steps/ProfileStep.tsx
  steps/QuestionStep.tsx
  steps/CompleteStep.tsx
  components/QuestionCard.tsx
  components/LikertCard.tsx
  components/BipolarCard.tsx
  components/MatrixCard.tsx
  components/TextCard.tsx
```

## Initial Plan
1. types.ts — 타입 정의
2. 문항 컴포넌트 (LikertCard, BipolarCard, MatrixCard, TextCard, QuestionCard)
3. ProfileStep
4. QuestionStep
5. CompleteStep
6. AssessmentPage (진입점)
7. App.tsx 라우트 추가
8. page_router.py에서 /assessment 라우트 React SPA로 전환

## Progress Updates
### Update 1
- Time: 2026-04-11
- Change: 중단 상태 재점검
- Reason: `frontend/src/pages/assessment/` 하위에 문항/프로필 컴포넌트는 있으나 `AssessmentPage.tsx`, `CompleteStep.tsx`, `App.tsx` 라우트, `page_router.py` React 서빙 전환이 빠져 있어 실제 `/assessment/custom/{token}` 화면은 여전히 기존 정적 HTML로 연결됨.

### Update 2
- Time: 2026-04-11
- Change: 이어서 구현할 범위 확정
- Reason: 기존 API와 정적 화면 흐름을 유지하되 React 진입점, 완료 화면, 자동 생성 확인 흐름, 제출 흐름을 먼저 완성하고 이후 빌드 및 Playwright 스크린샷으로 검증한다.

### Update 3
- Time: 2026-04-11
- Change: React 수검 화면 진입점과 라우팅 연결 완료
- Reason: `AssessmentPage.tsx`, `CompleteStep.tsx`를 추가하고 `App.tsx` 및 `page_router.py`에서 `/assessment/custom/{token}`을 React SPA로 연결했다.

### Update 4
- Time: 2026-04-11
- Change: UI 검증 중 양극형 문항 긴 문구 줄바꿈 보정
- Reason: Playwright 스크린샷에서 긴 좌우 앵커 문구가 데스크톱 폭에서 과하게 뻗을 위험이 보여 `BipolarCard`를 grid 기반 줄바꿈 레이아웃으로 조정했다.

### Update 5
- Time: 2026-04-11
- Change: Claude 리뷰 하네스 실행 시도
- Reason: 사용자 요청에 따라 `claude/review_paths.sh`로 변경 경로 리뷰를 요청했으나 Claude API 연결이 `EAI_AGAIN`으로 실패했다. 결과 아티팩트는 `claude/reviews/runs/20260411-114224-paths-review.json`에 저장됨.

### Update 6
- Time: 2026-04-11
- Change: Claude 리뷰 재실행 및 Codex 확인
- Reason: `claude/review_paths.sh --mode full` 재실행이 성공했고, 결과 아티팩트 `claude/reviews/runs/20260411-115312-paths-review.json`에서 지적한 TextCard 자동 이동, MatrixCard 미응답 강조, `setParts` 중복 호출, register-client 재진입 방어, React dist 누락 오류 메시지 문제를 실제 코드 기준으로 확인했다.

### Update 7
- Time: 2026-04-11
- Change: Claude 지적 사항 중 실제 회귀 가능성이 있는 항목 수정 완료
- Reason: TextCard 입력 중 자동 이동 방지, MatrixCard 미응답 강조, 공백 답변 제출 제외, `setParts` 중복 호출 제거, register-client 후 validate-profile 재진입 시 모달 재오픈 방지, React dist 누락 시 503 오류 메시지를 반영했다.

## Result
- `/assessment/custom/{access_token}` 수검 화면을 React SPA 라우트로 전환했다.
- 프로필 입력, 프로필 검증 API 호출, 문항 payload 반영, 문항 단계, 완료 단계, 자동 등록 확인 모달 흐름을 React 쪽에 구현했다.
- Vite 기본 HTML 제목/언어를 운영 화면 기준으로 수정했다.
- 기존 관리자 상세 페이지의 린트 실패 `any` 타입도 함께 정리했다.
- Claude 리뷰에서 확인된 TextCard/MatrixCard 진행 회귀 가능성과 상태 중복 업데이트 문제를 수정했다.

## Verification
- Checked:
  - `npm run build`
  - `npm run lint` (fast-refresh 경고 3개만 남고 오류 없음)
  - FastAPI `http://127.0.0.1:8010/health` 200 OK
  - FastAPI `/assessment/custom/wfU7vXJztIMJgWfZvfb-KkHr8XUZz6-b` React `dist/index.html` 반환 확인
  - Playwright 스크린샷:
    - `artifacts/screenshots/2026-04-11-assessment-react-profile-after.png`
    - `artifacts/screenshots/2026-04-11-assessment-react-question.png`
    - `artifacts/screenshots/2026-04-11-assessment-react-question-page2-after.png`
    - `artifacts/screenshots/2026-04-11-assessment-react-question-page2-mobile.png`
  - Playwright로 배정 내담자 프로필 입력 후 문항 1페이지 진입 확인
  - Playwright로 첫 5문항 응답 후 `파트 1 · 2 / 15 페이지` 이동 확인
  - Claude 리뷰 재실행: `claude/reviews/runs/20260411-115312-paths-review.json`
  - Codex 확인 후 추가 검증:
    - TextCard 입력 후 자동으로 다음 파트로 넘어가지 않음
    - MatrixCard 미응답 제출 시 하이라이트 표시
    - 기존 likert 첫 페이지 5문항 응답 후 자동 다음 페이지 이동 유지
  - 추가 Playwright 스크린샷:
    - `artifacts/screenshots/2026-04-11-assessment-text-no-auto-advance.png`
    - `artifacts/screenshots/2026-04-11-assessment-matrix-missing-highlight.png`
- Not checked:
  - 전체 190문항 최종 제출까지의 풀 E2E는 DB에 실제 제출/채점 데이터가 생성되므로 수행하지 않음.
  - `bipolar_with_prompt` 전용 payload 동등성은 현재 사용 가능한 실제 토큰 케이스에서 분리 검증하지 않음.
  - `responder_name` 빈 문자열은 기존 정적 JS도 동일하게 제출하므로 별도 변경하지 않음.

## Retrospective
### Classification
- `Execution Judgment Problem`

### What Was Wrong
- 중단 당시 수검 화면 컴포넌트 일부만 있고 실제 진입 페이지와 라우트 연결이 빠져 있었다.
- 서버 검증 중 처음에는 샌드박스 서버와 권한 상승 네트워크의 기존 서버 경계가 달라 잘못된 포트 응답을 볼 수 있었다.

### Why
- 관리자 React 전환 이후 assessment 전환 계획 문서가 진행 중 상태로 남아 있었고, 실제 브라우저 라우트 연결 확인이 끝나지 않았다.
- 로컬호스트 접근은 샌드박스 네트워크 제한 때문에 Playwright/urllib 검증과 같은 권한 경계에서 서버를 띄워야 했다.

### Next Time
- React SPA 라우트 전환 시 `App.tsx`, FastAPI page router, build `dist`, 실제 브라우저 라우트 응답을 한 묶음으로 검증한다.
- UI 전환 작업은 초기부터 동일 네트워크 경계에서 서버와 Playwright를 실행해 전/후 스크린샷 경로를 분명히 남긴다.
