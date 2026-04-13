# React Client Intake Detail Restore

## Task Title
- React 검사 상세 화면 내담자 등록 방식 복구

## Request Summary
- 예전에 내담자 배정 없이 확인 후 검사를 실시할 수 있도록 반영했던 기능이 React 전환 과정에서 사라진 것 같은지 확인하고 복구한다.

## Goal
- `auto_create` 정책의 백엔드/수검 링크 동작이 살아 있는지 확인한다.
- React 관리자 화면에서 검사별 내담자 등록 방식 확인/수정 UI가 빠졌다면 복구한다.
- 수정 전/후 스크린샷과 빌드/lint로 확인한다.

## Initial Hypothesis
- 평가 링크 런타임은 `validate-profile` -> 확인 모달 -> `register-client` 흐름으로 남아 있다.
- 검사 생성 모달에는 `client_intake_mode` 선택이 남아 있다.
- React 검사 상세 화면(`TestDetail.tsx`)에는 `client_intake_mode` 표시/수정 UI가 빠져 있어 기존 설정 확인과 사후 변경이 불가능해 보인다.

## Initial Plan
1. 관련 정책 문서와 백엔드 서비스, React 수검 화면, React 검사 생성/상세 화면을 대조한다.
2. 수정 전 검사 상세 화면 스크린샷을 남긴다.
3. `TestDetail.tsx`에 `client_intake_mode` 타입, 상태, 표시, 수정 폼, PUT 호출을 추가한다.
4. 빌드/lint와 수정 후 스크린샷으로 검증한다.

## Progress Updates
### Update 1
- Time: 2026-04-13
- Change: 초기 조사와 계획 문서 작성.
- Reason: 실제 UI 수정이 포함되어 실행 계획과 UI 검증 순서를 따라야 한다.

### Update 2
- Time: 2026-04-13
- Change: 수정 전 `/admin/create/2` 화면을 캡처했고, React 상세 화면에 `client_intake_mode` 조회/수정 폼과 PUT 저장 흐름을 추가했다.
- Reason: 백엔드와 수검자 React 화면의 자동 등록 흐름은 남아 있었지만, 관리자 상세 화면에서 기존 검사 정책을 확인하거나 변경하는 UI가 누락되어 있었다.

### Update 3
- Time: 2026-04-13
- Change: `npm run build`, `npm run lint`, 수정 후 `/admin/create/2` 스크린샷 캡처를 완료했다.
- Reason: UI 변경이 실제 SPA 번들에 반영되는지, 기존 정적 화면이 아니라 React 상세 화면에서 확인 가능한지 검증했다.

## Result
- `frontend/src/pages/TestDetail.tsx`에 검사 설정 폼을 추가했다.
- 검사 상세 화면에서 검사 이름과 내담자 등록 방식을 조회하고, `PUT /api/admin/custom-tests/{id}`로 저장할 수 있다.
- `auto_create` 선택 시 링크 안내 문구도 사전 배정 없이 확인 후 내담자 등록/배정을 진행할 수 있다는 내용으로 바뀐다.
- 기존 자동 등록 런타임 자체는 사라진 것이 아니라, React 전환 과정에서 상세 화면의 확인/수정 UI가 빠진 상태로 판단했다.

## Verification
- Checked:
  - `frontend/src/pages/assessment/AssessmentPage.tsx`
  - `app/services/admin/assessment_links.py`
  - `app/services/admin/clients.py`
  - `frontend/src/pages/TestManagement.tsx`
  - `frontend/src/pages/TestDetail.tsx`
  - `app/schemas/custom_tests.py`
  - `app/services/admin/custom_tests.py`
  - `artifacts/screenshots/client-intake-detail-before.png`
  - `artifacts/screenshots/client-intake-detail-after.png`
  - `npm run build`
  - `npm run lint`
- Not checked:
  - 실제 DB 값을 변경하는 저장 버튼 클릭은 운영 DB 오염을 피하기 위해 수행하지 않았다.

## Retrospective
### Classification
- `Execution Gap`

### What Was Wrong
- 기능 자체가 완전히 제거된 것은 아니었지만 React 관리자 상세 화면에서 정책 편집 경로가 빠져 있었다.

### Why
- 생성 모달과 수검자 런타임은 전환됐지만, 기존 검사 상세/사후 수정 화면의 `client_intake_mode` 노출이 함께 이관되지 않았다.

### Next Time
- 전환 검증 시 생성 화면, 상세 화면, 런타임 수검자 화면을 같은 정책 키 기준으로 모두 대조한다.

## Related Documents
- [AGENTS.md](/mnt/c/Users/user/workspace/2.0-modular/AGENTS.md)
- [docs/exec-plans/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/exec-plans/README.md)
- [docs/features/client-intake-policy.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/client-intake-policy.md)
- [docs/features/client-intake-phase1-spec.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/client-intake-phase1-spec.md)
