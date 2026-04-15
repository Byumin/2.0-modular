# Custom Test Management Tabs Plan

## Document Role
- 역할: 기획 문서
- 독자: 검사 관리 화면을 설계/구현/검토하는 작업자
- Source of truth: 검사 관리 탭 정보 구조의 제품 방향
- 연결 문서: 상세 구현 기준은 [custom-test-management-tabs-spec.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/custom-test-management-tabs-spec.md)를 따른다.

## Problem
검사 관리는 지금까지 커스텀 검사 목록과 생성/수정 액션을 중심으로 구성되어 있다. 그러나 운영자가 검사 관리에서 확인하려는 정보는 세 가지로 나뉜다.

- 커스텀 검사 자체를 만들고 관리한다.
- 커스텀 검사별 실시 현황을 확인한다.
- 제출/채점된 검사 결과를 확인한다.

이 세 흐름이 하나의 목록 안에 섞이면 커스텀 검사 수와 제출 수가 늘어날수록 원하는 정보를 찾기 어렵다.

## Product Direction
검사 관리 화면은 아래 세 탭으로 분리한다.

### 1. 커스텀 검사
검사 정의와 설정을 관리하는 탭이다.

주요 작업:
- 커스텀 검사 생성
- 검사명/기반 검사/척도 수 확인
- 접근 URL 생성
- 상세 설정 진입
- 삭제

### 2. 실시 현황
검사 운영 상태를 확인하는 탭이다.

주요 질문:
- 검사별 배정 내담자가 몇 명인가?
- 미실시/실시완료 인원은 몇 명인가?
- 마지막 실시일은 언제인가?
- 어떤 검사가 진행 병목인지 빠르게 찾을 수 있는가?

### 3. 검사 결과
제출/채점 결과를 확인하는 탭이다.

주요 질문:
- 최근 제출된 결과는 무엇인가?
- 어떤 내담자가 어떤 커스텀 검사를 제출했는가?
- 채점 상태는 무엇인가?
- 결과 확인이나 리포트 확인 화면으로 빠르게 이동할 수 있는가?

## Target UI Model
상단 구조:

```text
검사 관리
[커스텀 검사] [실시 현황] [검사 결과]
검색 입력
탭별 목록
```

탭별 검색 의미:
- `커스텀 검사`: 검사명, 기반 검사 검색
- `실시 현황`: 검사명, 기반 검사 검색
- `검사 결과`: 내담자명, 응답자명, 검사명, 기반 검사 검색

## Phase Plan
### Phase 1
- 검사 관리 화면에 세 탭을 추가한다.
- `커스텀 검사` 탭은 기존 목록과 액션을 유지한다.
- `실시 현황` 탭은 검사별 배정/미실시/실시완료/마지막 실시일 요약을 표시한다.
- `검사 결과` 탭은 제출/채점 결과 목록을 표시하고 내담자 상세/결과 화면으로 이동할 수 있게 한다.

### Phase 2
- 탭별 상세 필터를 분리한다.
- 실시 현황 탭에 상태 필터와 정렬을 추가한다.
- 검사 결과 탭에 제출일 범위, 채점 상태, 기반 검사 필터를 추가한다.

### Phase 3
- 검사 결과 목록에 서버 페이지네이션을 추가한다.
- 검사별 현황에서 선택 검사 내담자 목록으로 드릴다운한다.
- 대량 데이터 기준 성능을 검증한다.

## Non Goals
- 검사 생성 모달의 세부 생성 로직은 이번 탭 구조 변경의 직접 범위가 아니다.
- 채점 로직과 리포트 생성 로직은 변경하지 않는다.
- 내담자 중심 검색/탐색 방향은 [client-search-navigation-plan.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/client-search-navigation-plan.md)를 따른다.

## Related Documents
- [docs/features/custom-test-management.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/custom-test-management.md)
- [docs/features/custom-test-management-tabs-spec.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/custom-test-management-tabs-spec.md)
- [docs/features/client-search-navigation-plan.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/client-search-navigation-plan.md)
- [docs/features/scoring-flow.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/scoring-flow.md)
