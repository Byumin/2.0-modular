# Execution Plan

## Task Title
- 검사 생성 모달 세션 구성 및 세션별 검사 안내 화면 추가

## Request Summary
- 관리자 검사 생성 모달에서 선택한 기반 검사를 세션 단위로 묶고 구분할 수 있게 한다.
- 예: 세션 1에 `K-PSI-4-SF`, `PAT-2`, `PCT`를 담고, 세션 2에 표준화가 필요한 임시 검사 ID를 담는다.
- 수검자는 각 세션 시작 전에 해당 세션의 검사 안내 화면을 확인한 뒤 문항을 진행한다.

## Goal
- 기존 단일 커스텀 검사 생성 흐름과 호환하면서, 새 생성 payload에 세션 구성을 포함한다.
- `child_test.selected_scales_json` 내부에 세션 메타를 함께 저장해 DB 컬럼 추가 없이 세션 정보를 보존한다.
- 수검자 화면은 세션별로 `IntroStep`을 보여주고, 세션 1 문항 완료 후 세션 2 안내 화면으로 넘어간다.

## Preflight Checklist
- [x] `AGENTS.md` 확인
- [x] 작업 종류별 source-of-truth 확인:
  - 코드/구조: `ARCHITECTURE.md`
  - UI/디자인: `DESIGN.md`, `QUALIT_SCORE.md`
  - 문서 체계: `docs/exec-plans/README.md`
- [x] 운영 DB가 필요한 작업이면 루트 `modular.db` 기준 확인: DB 컬럼 추가 없이 JSON 구조 확장
- [x] 검증 방법과 미검증 가능 항목 정의

## Initial Hypothesis
- 현재 `parts`는 응답 옵션/렌더 타입 기준으로 자동 병합되는 표시 단위이며, 세션 개념은 없다.
- 세션 정보는 생성 시점의 `selected_scales_json`에 `__sessions` 메타로 저장하면 기존 파서가 검사 config로 오해하지 않는다.
- 수검자 화면에서는 `part.session_id` 기준으로 세션별 part 묶음을 만들고, 세션마다 `IntroStep`을 재사용하면 변경 범위를 줄일 수 있다.

## Initial Plan
1. 생성 schema에 `session_configs` optional 필드를 추가한다.
2. 관리자 생성 모달에 세션 추가/이름/안내문/검사 배정 UI를 추가한다.
3. 생성 서비스에서 세션 메타를 정규화해 `selected_scales_json.__sessions`에 저장한다.
4. `load_custom_test_configs`와 별도 helper로 기존 검사 config와 세션 meta를 분리해서 읽는다.
5. 문항 payload 조립 시 test_id별 세션을 part에 태깅하고 세션 경계를 넘어서 part가 병합되지 않게 한다.
6. 수검자 React flow에서 세션별 IntroStep → QuestionStep을 반복한다.
7. 빌드와 Playwright 스크린샷으로 생성 모달과 수검자 세션 안내 흐름을 확인한다.

## Progress Updates
### Update 1
- Time: 2026-05-06
- Change: 기존 생성 모달, custom test schema/service, selected_scales_json parser, assessment payload/Intro/Question flow를 확인했다.
- Reason: 세션이 기존 파트 개념과 다르기 때문에 데이터 저장 위치와 화면 전환 경계를 먼저 확정해야 했다.

### Update 2
- Time: 2026-05-06
- Change: 생성 schema에 `session_configs`를 추가하고, `selected_scales_json.__sessions`에 세션 메타를 저장하도록 구현했다.
- Reason: DB 컬럼 추가 없이 기존 `test_id -> variants` 구조와 호환하면서 세션 정보를 보존하기 위함.

### Update 3
- Time: 2026-05-06
- Change: 관리자 생성 모달에 세션 구성 UI를 추가하고, 선택한 검사별로 세션을 지정할 수 있게 했다.
- Reason: 세션 1에 표준화 결과 제공 검사 묶음, 세션 2에 표준화가 필요한 임시 검사 묶음을 담을 수 있어야 한다.

### Update 4
- Time: 2026-05-06
- Change: assessment payload의 part에 `session_id/session_title/session_description`을 붙이고, 프론트에서 세션별 `IntroStep -> QuestionStep`을 반복하도록 변경했다.
- Reason: 각 세션 시작 전에 별도 검사 안내 화면을 보여주기 위함.

### Update 5
- Time: 2026-05-06
- Change: `1. 검사 선택`에서는 검사 체크만 가능하도록 되돌리고, `2. 세션 구성`에서 선택 검사 칩을 드래그해 세션에 배정하는 UI로 수정했다.
- Reason: 검사 선택과 세션 배정이 한 줄에 섞여 보여 역할이 혼란스러웠기 때문.

### Update 6
- Time: 2026-05-06
- Change: `localhost:5120` Vite dev 서버가 오래된 변환본을 제공하는 상태를 확인하고 `npm run dev`를 재시작했다.
- Reason: 빌드 결과와 코드에는 최신 UI가 있었지만, 사용자가 확인한 dev 서버 화면에는 일부 변경이 반영되지 않은 것처럼 보였기 때문.

## Result
- 생성 모달에서 세션을 추가하고, 선택한 기반 검사를 세션에 배정할 수 있다.
- 생성 payload는 `session_configs`를 포함하며 서버는 이를 `selected_scales_json.__sessions`에 저장한다.
- 수검자 문항 payload는 part별 세션 메타와 전체 `sessions` 배열을 포함한다.
- 수검자는 세션별 안내 화면을 보고 해당 세션 문항을 진행하며, 마지막 세션 완료 시 제출한다.

## Verification
- Checked:
  - 수정 전 생성 모달 스크린샷: `artifacts/screenshots/2026-05-06-session-create-before.png`
  - 세션 select가 검사 선택에 섞인 중간 UI 스크린샷: `artifacts/screenshots/2026-05-06-session-dnd-before.png`
  - 수정 후 빌드 앱 생성 모달 스크린샷: `artifacts/screenshots/2026-05-06-session-create-after.png`
  - 수정 후 Vite 재시작 생성 모달 스크린샷: `artifacts/screenshots/2026-05-06-session-create-after-dev.png`
  - 드래그 배정 UI 수정 후 스크린샷: `artifacts/screenshots/2026-05-06-session-dnd-after.png`
  - Vite dev 서버 재시작 후 생성 모달 스크린샷: `artifacts/screenshots/2026-05-06-session-dnd-after-dev.png`
  - `localhost:5120/src/pages/TestManagement.tsx` 응답에서 `선택한 검사`, `data-session-test-chip`, `data-session-drop-zone` 포함 확인
  - `localhost:5120/admin/create`에서 생성 모달을 열고 검사 선택 후 `1. 검사 선택`은 체크 목록만, `2. 세션 구성`에는 `선택한 검사` 칩과 세션 drop zone이 표시되는 것 확인
  - Playwright로 `PAT-2` 칩을 세션 2 drop zone에 드래그해 `포함 검사: PAT-2`, 세션 수 `2개` 확인
  - `npm run build:frontend` 성공
  - `.venv/bin/python -m compileall app` 성공
  - DB를 쓰지 않는 임시 row 객체로 `build_custom_assessment_question_payload` 확인:
    - `sessions`: 세션 1/세션 2 반환
    - `parts`: 각 part에 `session_id`, `session_title` 포함
- Not checked:
  - 실제 커스텀 검사 생성 POST를 통해 DB에 신규 검사를 남기는 E2E는 수행하지 않음.
  - 세션 2까지 실제 문항 응답을 완료해 제출하는 전체 E2E는 수행하지 않음.

## Retrospective
### Classification
- `No Major Issue`

### What Was Wrong
- 기존 구조에서 `part`와 새 `session`의 책임을 분리해야 했다.

### Why
- 기존 `part`는 응답 옵션/렌더 타입 기준 자동 분할 단위라서, 검사 안내 화면을 제어하는 업무 단위로 쓰면 세션 경계와 충돌한다.

### Next Time
- 저장 구조는 기존 파서와 호환되는 meta key 방식으로 먼저 설계하고, UI step은 표시 단위와 업무 단위를 분리해서 다룬다.

## Quality Score
- Requirement Fit: 4/5
- Functional Correctness: 4/5
- Architectural Consistency: 4/5
- Readability And Maintainability: 4/5
- Validation And Testing: 3/5
- Edge Case Handling: 3/5
- Documentation Quality: 4/5
- UI And Design Consistency: 4/5
- Regression Risk: 3/5
- Completion Level: 4/5

### Summary
- Average: 3.7
- Notes: 핵심 구조와 화면은 반영됐지만, DB에 실제 신규 커스텀 검사를 생성하고 세션 2 제출까지 완료하는 E2E는 아직 남아 있다.

## Related Documents
- [Documentation Hub](/mnt/c/Users/user/workspace/2.0-modular/docs/README.md)
- [docs/exec-plans/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/exec-plans/README.md)
- [QUALIT_SCORE.md](/mnt/c/Users/user/workspace/2.0-modular/QUALIT_SCORE.md)
- [DESIGN.md](/mnt/c/Users/user/workspace/2.0-modular/DESIGN.md)
- [AGENTS.md](/mnt/c/Users/user/workspace/2.0-modular/AGENTS.md)
