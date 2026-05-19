# Features Guide

이 폴더는 현재 프로젝트의 주요 기능을 기능 단위로 나눠 설명하는 상세 가이드 문서를 모아둔 곳이다.

## Documents
- `admin-auth.md`: 관리자 로그인, 로그아웃, 세션 인증
- `admin-settings.md`: 관리자 단위 전역 설정(개인정보 동의서 본문 저장/조회)
- `custom-test-management.md`: 커스텀 검사 생성, 조회, 수정, 삭제, 관리 화면 기능
- `custom-test-management-tabs-spec.md`: 검사 관리 탭 구조 API/UI 상세 스펙
- `assessment-link-flow.md`: 접근 링크 발급, 수검자 프로필 검증, 답변 제출, 검사 실시 중간 저장
- `client-intake-policy.md`: 내담자 사전 등록, 자동 생성, 혼합 운영 정책
- `client-management.md`: 내담자 생성, 배정, 그룹, 조회, 평가 로그 및 리포트 컨텍스트
- `client-search-navigation-spec.md`: 내담자 검색/탐색 개선 API/UI 상세 스펙
- `identity-review.md`: 애매 매칭 케이스의 관리자 사후 동일인 검토 처리
- `dashboard.md`: 관리자 대시보드와 평가 통계
- `scoring-flow.md`: 제출 데이터 기반 채점 실행 흐름
- `report-dashboard.md`: 채점 결과 보고서 대시보드 — 수검자/관리자 열람, 척도 트리 네비게이션, T점수 시각화
- `privacy-consent-spec.md`: 개인정보동의 기능 — 검사별 동의 설정, 설정 메뉴, 수검자 동의 흐름, 동의 기록 저장

## Archived Design Docs
구현 완료된 기획/설계 문서는 `docs/exec-plans/`로 이동했다. 현재 동작의 source-of-truth는 위 Documents의 feature 문서를 본다.
- [2026-04-10-client-intake-phase1-detailed-spec.md](/mnt/c/Users/user/workspace/2.0-modular/docs/exec-plans/2026-04-10-client-intake-phase1-detailed-spec.md): Phase 1 DB/스키마/API 상세 변경안
- [2026-04-13-client-intake-phase2-ambiguous-match-spec.md](/mnt/c/Users/user/workspace/2.0-modular/docs/exec-plans/2026-04-13-client-intake-phase2-ambiguous-match-spec.md): 애매 매칭 관리자 승인 흐름 설계
- [2026-04-14-custom-test-management-tabs-plan.md](/mnt/c/Users/user/workspace/2.0-modular/docs/exec-plans/2026-04-14-custom-test-management-tabs-plan.md): 검사 관리 탭 구조 기획
- [2026-04-14-client-search-navigation-plan.md](/mnt/c/Users/user/workspace/2.0-modular/docs/exec-plans/2026-04-14-client-search-navigation-plan.md): 내담자 검색/탐색 개선 기획
- [2026-04-10-client-assignment-multi-detailed-spec.md](/mnt/c/Users/user/workspace/2.0-modular/docs/exec-plans/2026-04-10-client-assignment-multi-detailed-spec.md): 다중 동시 배정 재해석 및 DB/API 변경 방향 설계

## Usage Rule
- 기능을 설명할 때는 이 문서를 먼저 참고하고, 실제 호출 추적이 필요하면 `docs/debug/explanation-rule.md` 기준으로 코드 흐름을 함께 확인한다.
- 구조 관점 설명은 루트 `ARCHITECTURE.md`를 기준으로 본다.

## Related Documents
- [Documentation Hub](/mnt/c/Users/user/workspace/2.0-modular/docs/README.md)
- [ARCHITECTURE.md](/mnt/c/Users/user/workspace/2.0-modular/ARCHITECTURE.md)
- [docs/debug/explanation-rule.md](/mnt/c/Users/user/workspace/2.0-modular/docs/debug/explanation-rule.md)
- [docs/diagrams/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/diagrams/README.md)
- [docs/database/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/database/README.md)
