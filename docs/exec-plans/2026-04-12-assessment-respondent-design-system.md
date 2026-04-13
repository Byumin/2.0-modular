# Execution Plan

## Task Title
- 검사 실시 전체 플로우 수검자 전용 React 디자인 정리

## Request Summary
- 디자인 레퍼런스 소스와 디자인 시스템을 확인한 뒤, 인적사항부터 검사 실시 제출까지 기존 구조와 정보를 유지하면서 React 전환 및 디자인 수정을 진행한다.
- 관리자 대시보드와는 다른 컨셉의 수검자 전용 디자인으로 진행한다.

## Goal
- 기존 레거시 정보 구조를 유지한다.
  - 인적사항 안내/입력
  - 프로필 확인
  - 진행 현황
  - 미응답 상태
  - 파트/문항 이동
  - 응답 방식
  - 최종 제출
  - 완료 화면
- 디자인 시스템의 수검자 화면 원칙인 낮은 긴장감, 자연스러운 입력 흐름, 큰 클릭 영역, 모바일 안정성을 반영한다.
- 관리자 대시보드의 일반 카드 조합처럼 보이지 않도록 검사 실시 전용 shell, 헤더, 패널 톤을 만든다.

## Initial Hypothesis
- 현재 React 구현은 구조 복구는 진행됐지만 `bg-card`, `rounded-xl`, 일반 카드/패널 조합이 많아 관리자 화면과 시각적으로 크게 분리되지 않는다.
- `AssessmentPage`에서 플로우 전용 상위 shell을 만들고, 각 step에서 같은 surface/spacing/button 원칙을 적용하면 전체 플로우의 컨셉이 맞춰진다.
- 기능 로직은 이미 제출까지 검증됐으므로 디자인/레이아웃 클래스 중심으로 수정하는 것이 안전하다.

## Initial Plan
1. 디자인 시스템과 로컬 shadcn 레퍼런스의 컴포넌트/토큰 원칙을 반영한다.
2. `AssessmentPage`에 수검자 전용 shell, 단계 표시, 배경/헤더 톤을 만든다.
3. `ProfileStep`은 기존 안내/입력 정보를 유지하되 전용 panel 톤으로 정리한다.
4. `QuestionStep`은 레거시 정보 구조를 유지하면서 패널 중첩감과 관리자 카드 느낌을 줄인다.
5. `CompleteStep`은 제출 완료 화면을 같은 컨셉으로 맞춘다.
6. 빌드, 데스크톱/모바일 스크린샷, 프로필 진입/일부 응답/제출 회귀 여부를 확인한다.

## Progress Updates
### Update 1
- Time: 2026-04-12 16:31 KST
- Change: 초기 계획 작성.
- Reason: 코드 수정 전 실행 계획 문서 작성 규칙 준수.

### Update 2
- Time: 2026-04-12 17:00 KST
- Change: `AssessmentPage`, `ProfileStep`, `QuestionStep`, `CompleteStep` 수검자 전용 디자인 시스템 적용 완료.
- Reason: 관리자 대시보드와 시각적으로 분리된 수검자 전용 컨셉 구현.

## Result
- 수검자 전용 디자인 시스템 적용 완료.
  - 배경: `#f0f4f8` (쿨 블루-그레이 톤)
  - 헤더: Primary 700 상단 액센트 스트라이프 + 테두리 제거, 스테퍼형 단계 표시 (원형 번호 + 연결선, 완료=초록 체크, 현재=파란 채움, 미래=회색 테두리)
  - 인적사항 폼: 동일 액센트 스트라이프, `bg-[#eef5fb]` 안내 박스, 테두리 제거
  - 문항 단계: 파트 헤더 `bg-[#eef5fb]`, 이중 카드 중첩 제거, 우측 패널 섹션별 `bg-[#eef5fb]` 헤더 통일, uppercase tracking 레이블 제거
  - 완료 화면: 동일 액센트 스트라이프, 더 큰 초록 체크 아이콘

## Verification
- Checked:
  - `AGENTS.md`
  - `docs/design/design-system.md`
  - `npm run build` 성공
  - 인적사항 단계 데스크톱 캡처: `artifacts/screenshots/design-system/v2-profile-desktop.png`
  - 인적사항 단계 모바일 캡처: `artifacts/screenshots/design-system/v2-profile-mobile.png`
  - 문항 단계 데스크톱 캡처: `artifacts/screenshots/design-system/v2-question-desktop.png`
  - 문항 단계 모바일 캡처: `artifacts/screenshots/design-system/v2-question-mobile.png`
  - 완료 화면 데스크톱 캡처: `artifacts/screenshots/design-system/v2-complete-desktop.png`
  - 완료 화면 모바일 캡처: `artifacts/screenshots/design-system/v2-complete-mobile.png`
  - 모바일 가로 스크롤 없음 확인
- Not checked:
  - 없음.

## Retrospective
### Classification
- `No Major Issue`

### What Was Wrong
- 기존 React 화면이 admin 대시보드와 동일한 `rounded-lg border bg-background shadow-sm` 카드 패턴, `uppercase tracking-[0.08em]` 레이블을 그대로 사용해 수검자 화면 고유 톤이 없었다.

### Why
- SPA 전환 시 검사 실시 화면도 범용 admin 컴포넌트 패턴으로 구성해서 두 화면의 시각적 분리가 안 됐다.

### Next Time
- 수검자 화면과 관리자 화면은 초기 구현 시부터 배경색/헤더 톤/카드 패턴을 다르게 시작한다.

## Related Documents
- [Documentation Hub](/mnt/c/Users/user/workspace/2.0-modular/docs/README.md)
- [docs/exec-plans/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/exec-plans/README.md)
- [docs/design/design-system.md](/mnt/c/Users/user/workspace/2.0-modular/docs/design/design-system.md)
- [QUALIT_SCORE.md](/mnt/c/Users/user/workspace/2.0-modular/QUALIT_SCORE.md)
- [AGENTS.md](/mnt/c/Users/user/workspace/2.0-modular/AGENTS.md)
