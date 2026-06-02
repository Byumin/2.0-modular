# Execution Plan

## Task Title
- Stretch assessment question sidebar and quick navigation area

## Request Summary
- 문항 응답 화면 오른쪽 사이드바의 위아래 높이를 문항 영역과 맞추고, `빠른 이동` 영역의 높이를 늘린다.

## Goal
- 데스크톱 문항 화면에서 오른쪽 사이드바 카드가 문항 영역 높이에 맞춰 길어지고, 남는 높이가 `빠른 이동` 문항 번호 영역에 배분되도록 한다.

## Preflight Checklist
- [x] `AGENTS.md` 확인
- [x] 작업 종류별 source-of-truth 확인:
  - 코드/구조: `QuestionStep.tsx` 직접 확인
  - DB: 해당 없음
  - UI/디자인: `DESIGN.md`, `QUALIT_SCORE.md` 확인
  - 문서 체계: 해당 없음
  - 설명/디버깅: 해당 없음
  - 코드 정리 산출물: 해당 없음
- [x] 운영 DB가 필요한 작업이면 루트 `modular.db` 기준 확인: 운영 DB 직접 작업 없음
- [x] 검증 방법과 미검증 가능 항목 정의

## Initial Hypothesis
- 현재 그리드가 `items-start`이고 사이드바 카드가 콘텐츠 높이만큼만 렌더링된다. 그리드 아이템을 stretch로 바꾸고 사이드바 내부를 flex column으로 구성하면 남는 공간을 `빠른 이동`에 줄 수 있다.

## Initial Plan
1. 문항/사이드바 그리드의 `items-start`를 stretch 가능한 구조로 변경한다.
2. 사이드바와 내부 카드를 `h-full`, `min-h`, `flex-col`로 변경한다.
3. `빠른 이동` 섹션을 `flex-1 min-h-0`로 만들고 기존 `max-h-[88px]`를 제거해 세로 공간을 더 쓰게 한다.
4. 프론트 빌드로 검증하고, 실제 검사 링크 확인 가능 여부를 기록한다.

## Progress Updates
### Update 1
- Time: 2026-06-01
- Change: 실행계획 생성.
- Reason: UI 레이아웃 변경 작업 기록.

### Update 2
- Time: 2026-06-01
- Change: `QuestionStep.tsx`의 데스크톱 그리드를 `items-stretch`로 바꾸고, 사이드바 카드에 `h-full`, viewport 기반 최소 높이, flex column을 적용했다. `빠른 이동` 섹션은 `flex-1 min-h-[180px]`로 변경하고 기존 `max-h-[88px]` 제한을 제거했다.
- Reason: 문항 영역과 사이드바 높이를 맞추면서 남는 세로 공간을 빠른 이동 목록이 사용하게 하기 위해.

### Update 3
- Time: 2026-06-01
- Change: 스크린샷 `20260601_134637.png` 확인 후 viewport 기반 최소 높이를 제거하고, 실제 문항 카드 영역 높이를 `ResizeObserver`로 측정해 사이드바 카드 높이에 적용하도록 변경.
- Reason: 사이드바가 화면 높이 기준으로 과하게 길어지는 것이 아니라, 옆의 문항 제시 영역 높이에 동적으로 맞아야 하기 때문.

### Update 4
- Time: 2026-06-01
- Change: 동적 높이 측정 방식을 제거하고 사이드바를 콘텐츠 기준 고정 높이로 복귀했다. `빠른 이동`은 5줄 높이(`max-h-[136px]`)만 보이도록 제한하고, 현재 페이지 첫 문항 버튼이 3번째 줄에 위치하도록 내부 스크롤을 자동 보정한다.
- Reason: 사이드바/빠른 이동 영역이 길어지면서 문항 버튼이 너무 많이 보여 시각 밀도가 높아졌기 때문.

### Update 5
- Time: 2026-06-01
- Change: Playwright 캡처 중 문항 ID에 JSON 문자열이 포함될 때 `querySelector`가 깨지는 런타임 오류를 확인하고 `CSS.escape`를 적용했다.
- Reason: 빠른 이동 스크롤 보정 셀렉터가 복잡한 문항 ID에서도 안전하게 동작해야 하기 때문.

### Update 6
- Time: 2026-06-01
- Change: 캡처에서 현재 문항 16~20 표시 중 빠른 이동이 56~80으로 잘못 스크롤되는 문제를 확인했다. 문항 ID가 중복될 수 있어, 스크롤 보정 기준을 문항 ID가 아니라 화면 표시 전역 번호(`data-quick-index`)로 변경했다.
- Reason: 현재 왼쪽에 제시되는 문항 번호가 빠른 이동 영역 3번째 줄에 안정적으로 위치해야 하기 때문.

### Update 7
- Time: 2026-06-01
- Change: 추가 캡처에서 빠른 이동 번호 자체가 왼쪽 표시 번호와 다른 번호대(56~80)를 쓰는 문제를 확인했다. 빠른 이동 번호와 스크롤 기준을 `item.global_order_index`가 아니라 현재 전달된 parts 내 누적 번호로 통일했다.
- Reason: 빠른 이동은 현재 문항 화면에 표시되는 번호 체계와 일치해야 하기 때문.

### Update 8
- Time: 2026-06-01
- Change: 여러 파트의 문항을 한 빠른 이동 목록에 섞어 표시하지 않고, 현재 선택된 파트의 문항만 빠른 이동에 표시하도록 변경했다.
- Reason: `파트 이동`이 별도 제공되므로 빠른 이동은 현재 파트 안에서만 이동해야 왼쪽 문항 번호와 항상 일치한다.

### Update 9
- Time: 2026-06-01
- Change: 현재 파트 전용 목록에서도 스크롤 기준이 내부 bundle index를 써서 16번이 첫 줄에 오는 문제를 확인했다. 왼쪽 카드와 같은 `item.global_order_index` 기준으로 빠른 이동 번호와 스크롤 기준을 맞췄다.
- Reason: 실제 화면에 표시되는 문항 번호가 빠른 이동의 3번째 줄에 오도록 하기 위해.

### Update 10
- Time: 2026-06-01
- Change: 추가 캡처에서 데이터 기준 번호와 실제 카드 표시 번호가 여전히 다를 수 있음을 확인했다. 실제 렌더된 문항 카드에 `data-question-display-index`를 부여하고, 빠른 이동 스크롤은 이 DOM 표시 번호를 기준으로 맞추도록 변경했다.
- Reason: 최종 기준은 내부 데이터가 아니라 사용자가 왼쪽 화면에서 보는 문항 번호여야 하기 때문.

### Update 11
- Time: 2026-06-01
- Change: 캡처에서 번호는 맞지만 스크롤 위치가 첫 줄에 남는 문제를 확인했다. 스크롤 보정을 `useLayoutEffect` 즉시 실행에서 다음 animation frame의 `useEffect`로 옮기고 smooth scrolling을 제거했다.
- Reason: 최종 렌더된 DOM 기준으로 즉시 스크롤 위치를 확정하기 위해.

## Result
- 데스크톱 문항 화면의 사이드바는 콘텐츠 기준 고정 높이로 유지한다.
- `빠른 이동`은 5줄만 보이도록 제한하고, 페이지 이동 시 현재 제시 문항의 첫 번호가 3번째 줄에 오도록 스크롤을 보정한다.

## Verification
- Checked: `npm run build:frontend` 성공.
- Checked: 현재 `8120` 서버가 새 빌드 번들 `index-FAS2VY-A-v2.js`, `index-CE6mXxi_-v2.css`를 서빙하는 것 확인.
- Not checked: 실제 문항 화면 스크린샷은 운영 RDS에 새 수검자/응답 데이터를 쓰는 흐름을 만들 수 있어 미실행.

## Retrospective
### Classification
- `No Major Issue`

### What Was Wrong
- 1차 수정에서 viewport 기반 최소 높이를 넣어 사이드바가 문항 제시 영역보다 과하게 길어질 수 있었다.

### Why
- 문항 영역 자체의 실제 높이를 기준으로 삼지 않고 화면 높이 기준을 섞었다.

### Next Time
- 좌우 컬럼이 함께 읽히는 화면은 grid stretch와 내부 flex 배분을 처음부터 같이 설계한다.

## Related Documents
- [Documentation Hub](/mnt/c/Users/user/workspace/2.0-modular/docs/README.md)
- [docs/exec-plans/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/exec-plans/README.md)
- [DESIGN.md](/mnt/c/Users/user/workspace/2.0-modular/DESIGN.md)
- [QUALIT_SCORE.md](/mnt/c/Users/user/workspace/2.0-modular/QUALIT_SCORE.md)
- [AGENTS.md](/mnt/c/Users/user/workspace/2.0-modular/AGENTS.md)
