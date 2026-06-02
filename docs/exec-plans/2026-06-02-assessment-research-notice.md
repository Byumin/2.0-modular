# Execution Plan

## Task Title
- 수검자 진입 화면 연구 참여 안내 추가

## Request Summary
- `docs/design/reference/2,0-modular-notice`에 있는 디자인 소스를 확인하고, 검사 실시 링크 진입 첫 화면에 안내 문구 UI를 추가한다.

## Goal
- `ProfileStep` 좌측 hero 영역에 제공된 `ResearchNotice` 디자인을 통합한다.
- 기존 수검자 프로필 입력 플로우와 개인정보 동의/검사 시작 동작은 유지한다.
- 수정 전/후 화면을 캡처해 실제 UI를 확인한다.

## Preflight Checklist
- [x] `AGENTS.md` 확인
- [x] 작업 종류별 source-of-truth 확인:
  - 코드/구조: `ARCHITECTURE.md` 간접 확인된 기존 구조 기준
  - DB: 해당 없음
  - UI/디자인: `DESIGN.md`, `QUALIT_SCORE.md`
  - 문서 체계: 해당 없음
  - 설명/디버깅: 해당 없음
  - 코드 정리 산출물: 해당 없음
- [x] 운영 DB가 필요한 작업이면 RDS 기준 확인: 해당 없음
- [x] 검증 방법과 미검증 가능 항목 정의

## Initial Hypothesis
- 제공된 `ResearchNotice.tsx`는 현재 `ProfileStep` 좌측 hero 컨테이너에 직접 삽입 가능하다.
- 기존 좌측 hero는 장식 요소가 많지만 안내 카드가 `relative z-10` 내부에 들어가므로 가시성은 유지된다.

## Initial Plan
1. 디자인 handoff 파일과 현재 `ProfileStep.tsx` 구조를 비교한다.
2. 수정 전 수검자 진입 화면을 캡처한다.
3. `ResearchNotice` 컴포넌트를 `frontend/src/pages/assessment/components/`에 추가하고 `ProfileStep`에서 import/렌더링한다.
4. 프론트 빌드로 타입/번들 검증한다.
5. 수정 후 화면을 캡처하고 전/후 차이를 확인한다.

## Progress Updates
### Update 1
- Time: 2026-06-02
- Change: 디자인 소스와 현재 `ProfileStep` 구조를 확인했다.
- Reason: handoff가 현재 코드 구조와 맞는지 먼저 확인해야 한다.

### Update 2
- Time: 2026-06-02
- Change: 최신 활성 검사 링크로 수정 전 desktop/mobile 화면을 캡처했다.
- Reason: UI 변경 전 기준 화면을 확보해 전후 비교가 가능하게 한다.

### Update 3
- Time: 2026-06-02
- Change: `ResearchNotice` 컴포넌트를 추가하고 `ProfileStep` 좌측 hero 설명 영역 아래에 렌더링했다.
- Reason: 검사 실시 링크 첫 진입 화면에서 연구 참여 안내와 제공 검사 정보를 바로 보여주기 위함이다.

### Update 4
- Time: 2026-06-02
- Change: 프론트 빌드를 통과했고, 수정 후 desktop/mobile/accordion-expanded 화면을 캡처해 시각적으로 확인했다.
- Reason: 타입/번들 오류와 반응형 레이아웃 깨짐 여부를 확인하기 위함이다.

### Update 5
- Time: 2026-06-02
- Change: 연구 참여 안내 카드의 desktop 폭을 넓히고, desktop 이상에서 오른쪽으로 이동하도록 조정했다.
- Reason: 좌측 hero 영역 안에서 안내 카드가 더 넓고 중심부에 가깝게 보이도록 하기 위함이다.

### Update 6
- Time: 2026-06-02
- Change: 안내 카드의 오른쪽 이동값을 제거하고, 좌측 절반 영역의 중앙축에 맞도록 desktop 이상에서 `mx-auto` 정렬로 변경했다.
- Reason: 요청 의도는 카드가 오른쪽으로 치우치는 것이 아니라 좌측 절반 hero/glass 영역의 중심축에 들어오는 것이었기 때문이다.

## Result
- 검사 실시 링크 첫 진입 화면에 연구 참여 안내 카드가 추가됐다.
- 안내 카드는 제공된 handoff의 문구와 구조를 기준으로 구성했고, 제공되는 검사 3종은 접이식 영역으로 확인할 수 있다.
- 안내 카드는 desktop에서 최대 폭이 더 넓어지고 좌측 절반 영역의 중앙축에 맞도록 조정됐다.
- 기존 프로필 입력, 개인정보 동의, 검사 시작 흐름은 변경하지 않았다.

## Verification
- Checked:
  - 수정 전 캡처: `artifacts/screenshots/2026-06-02-research-notice-before-desktop.png`
  - 수정 전 캡처: `artifacts/screenshots/2026-06-02-research-notice-before-mobile.png`
  - 수정 후 캡처: `artifacts/screenshots/2026-06-02-research-notice-after-desktop.png`
  - 수정 후 캡처: `artifacts/screenshots/2026-06-02-research-notice-after-mobile.png`
  - 펼침 상태 캡처: `artifacts/screenshots/2026-06-02-research-notice-after-expanded-desktop.png`
  - 폭/위치 조정 전 캡처: `artifacts/screenshots/2026-06-02-research-notice-width-before-desktop.png`
  - 폭/위치 조정 전 캡처: `artifacts/screenshots/2026-06-02-research-notice-width-before-mobile.png`
  - 폭/위치 조정 후 캡처: `artifacts/screenshots/2026-06-02-research-notice-width-after-desktop.png`
  - 폭/위치 조정 후 캡처: `artifacts/screenshots/2026-06-02-research-notice-width-after-mobile.png`
  - 중앙축 정렬 캡처: `artifacts/screenshots/2026-06-02-research-notice-centered-desktop.png`
  - `npm --prefix frontend run build`
- Not checked:
  - 원격 배포 환경 반영 여부

## Retrospective
### Classification
- `No Major Issue`

### What Was Wrong
- 첫 진입 화면에 연구 참여 안내 문구가 없어서 사용자가 검사 시작 전에 연구 목적과 제공 혜택을 확인하기 어려웠다.

### Why
- 기존 `ProfileStep`은 브랜딩/동의/인적사항 입력에 집중되어 있었고, 별도 연구 안내 UI가 아직 통합되지 않았다.

### Next Time
- handoff 파일을 실제 화면 컴포넌트로 분리해 두면 문구와 레이아웃 변경 시 재사용하기 쉽다.

## Related Documents
- [AGENTS.md](/mnt/c/Users/user/workspace/2.0-modular/AGENTS.md)
- [DESIGN.md](/mnt/c/Users/user/workspace/2.0-modular/DESIGN.md)
- [QUALIT_SCORE.md](/mnt/c/Users/user/workspace/2.0-modular/QUALIT_SCORE.md)
- [ResearchNotice.tsx](/mnt/c/Users/user/workspace/2.0-modular/docs/design/reference/2,0-modular-notice/handoff/ResearchNotice.tsx)
