# Execution Plan

## Task Title
- 검사 실시 인적사항 React UI 레거시 스타일 복구

## Request Summary
- 검사 실시의 인적사항 입력 화면도 기존 레거시 정적 HTML/CSS보다 디자인이 이상해졌는지 확인하고 보정한다.

## Goal
- React 인적사항 입력 화면에 레거시의 안내 박스, 연한 패널 배경, 적절한 폼 폭과 조밀한 입력 구성을 반영한다.
- 모바일에서는 가로 스크롤 없이 안정적으로 유지한다.

## Initial Hypothesis
- React 화면은 `max-w-lg` 단일 폼 카드와 별도 내부 제목 때문에 레거시의 통합 shell/panel 느낌이 사라졌다.
- 안내 박스가 사라져 검사 화면의 신뢰/목적 안내가 약해졌다.
- `ProfileStep`만 좁게 수정하면 문항 단계 변경과 충돌 없이 복구 가능하다.

## Initial Plan
1. React/레거시 인적사항 화면의 데스크톱/모바일 캡처와 DOM 크기 지표를 비교한다.
2. `ProfileStep`의 wrapper/form 폭과 배경을 레거시 패널에 가깝게 조정한다.
3. 안내 박스를 복구하고 내부 제목/설명은 헤더와 중복되지 않도록 제거한다.
4. 성별 선택지와 버튼 스타일을 레거시의 조밀한 pill/button 느낌으로 조정한다.
5. 빌드와 수정 후 데스크톱/모바일 캡처로 확인한다.

## Progress Updates
### Update 1
- Time: 2026-04-12 16:20 KST
- Change: 초기 계획 작성.
- Reason: 코드 수정 전 실행 계획 문서 작성 규칙 준수.

### Update 2
- Time: 2026-04-12 16:24 KST
- Change: `ProfileStep`에 안내 박스, 연한 패널 배경, 넓은 폼 폭, 레거시형 `다음` 버튼 문구를 반영했다.
- Reason: 수정 전 비교에서 React 화면이 안내 문구 없이 좁은 범용 폼 카드로 보였고 레거시보다 화면 밀도가 낮았음.

### Update 3
- Time: 2026-04-12 16:26 KST
- Change: 빌드, 수정 후 데스크톱/모바일 스크린샷, 모바일 문항 단계 진입 검증을 완료했다.
- Reason: UI Review Rule에 따라 실제 화면과 반응형 안정성을 확인해야 함.

## Result
- React 인적사항 입력 화면에 레거시의 안내 박스와 연한 패널 구조를 복구했다.
- 데스크톱 폼 폭이 `512px`에서 `700px`로 확장되어 레거시 화면 밀도에 가까워졌다.
- 모바일에서는 가로 스크롤 없이 유지된다.

## Verification
- Checked:
  - 수정 전 React/레거시 인적사항 데스크톱/모바일 캡처.
  - 수정 전 React 데스크톱 form `512px`, 레거시 데스크톱 form `632px`.
  - 수정 전 React `hasTrustNote=false`, 레거시 `hasTrustNote=true`.
  - `npm run build` 성공.
  - 수정 후 데스크톱 캡처: `artifacts/screenshots/assessment-compare/react-profile-after-desktop-1440.png`.
  - 수정 후 모바일 캡처: `artifacts/screenshots/assessment-compare/react-profile-after-mobile-390.png`.
  - 수정 후 React 데스크톱 form `700px`.
  - 수정 후 React `hasTrustNote=true`.
  - 수정 후 모바일 `bodyScrollWidth=390`, `innerWidth=390`, `overflowX=false`.
  - 모바일에서 인적사항 입력 후 `다음` 클릭 시 문항 단계 진입 확인.
- Not checked:
  - 없음.

## Retrospective
### Classification
- `No Major Issue`

### What Was Wrong
- React 인적사항 화면이 레거시의 안내/패널 구조를 잃고 좁은 범용 폼 카드와 중복 제목 구조로 바뀌어 보였다.

### Why
- SPA 전환 과정에서 `ProfileStep`을 독립 폼 카드로 단순화하면서 레거시 화면의 안내 박스와 패널 톤이 빠졌다.

### Next Time
- 검사 실시 화면처럼 사용자 대면 플로우는 프로필 단계와 문항 단계를 함께 캡처 비교한다.

## Related Documents
- [Documentation Hub](/mnt/c/Users/user/workspace/2.0-modular/docs/README.md)
- [docs/exec-plans/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/exec-plans/README.md)
- [QUALIT_SCORE.md](/mnt/c/Users/user/workspace/2.0-modular/QUALIT_SCORE.md)
- [AGENTS.md](/mnt/c/Users/user/workspace/2.0-modular/AGENTS.md)
