# 세션 네비게이션 UX 질문 정리

## 작업 제목
- 다중 세션 검사 실시 UX 정책 질문 및 제안 문서화

## 요청 요약
- 세션이 여러 개인 검사에서 이전 세션 복귀, 다음 세션 건너뛰기, 세션 제출 전 경고 문구 등 UI/UX 경우의 수를 정리한다.
- 이후 정책 결정을 위한 질문과 제안을 저장한다.

## 작업 목표
- 현재 구현과 정책 미결정 사항을 분리해 문서화한다.
- 기능 source 문서에 세션 네비게이션 UX 질문 문서를 추가한다.
- 구현 변경은 하지 않는다.

## 초기 가설
- 현재 구현은 세션 단위로는 이전 세션 복귀를 제공하지 않고, 한 세션 안의 part/page 이동만 허용한다.
- 제품 정책은 아직 확정된 source-of-truth 문서가 없으므로 `docs/features/`에 의사결정 후보 문서를 추가하는 것이 적합하다.

## 실행 계획
1. `AGENTS.md`, 문서 거버넌스, 실행계획 규칙을 확인한다.
2. 기존 feature 문서 구조를 확인한다.
3. 세션 네비게이션 UX 질문/제안 문서를 추가한다.
4. `docs/features/README.md`에 링크를 추가한다.
5. 결과를 기록한다.

## 작업 중 변경 사항
- `docs/features/assessment-session-navigation-ux-questions.md`를 새로 추가한다.
- `docs/features/README.md`에 문서 링크를 추가한다.

## 결과
- 완료.
- 다중 세션 검사 실시 UX 정책 질문/제안 문서를 `docs/features/assessment-session-navigation-ux-questions.md`에 저장했다.
- `docs/features/README.md`에 새 문서 링크를 추가했다.
- 구현 변경은 하지 않았다.

## 검증 내용
- `docs/features/assessment-session-navigation-ux-questions.md` 내용을 확인했다.
- `docs/features/README.md`에서 새 문서 링크를 확인했다.

## 회고
- 정책 미결정 사항을 구현과 분리해 문서화했다.
- 현재 구현 사실, 선택지, 장단점, 권장 기본안, 결정 필요 항목을 한 문서에 모아 후속 논의 기준으로 사용할 수 있게 했다.
