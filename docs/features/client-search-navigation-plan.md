# Client Search And Navigation Plan

## Document Role
- 역할: 기획 문서
- 독자: 관리자 화면 기능을 설계/구현/검토하는 작업자
- Source of truth: 내담자 관리 화면의 검색/탐색 제품 방향
- 연결 문서: 상세 구현 기준은 [client-search-navigation-spec.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/client-search-navigation-spec.md)를 따른다.

## Problem
내담자 관리는 단순 주소록이 아니라 검사 운영의 중심 화면이다. 내담자는 이름, 성별, 생년월일, 연락처, 주소, 태그, 메모, 그룹, 배정 검사, 실시 상태, 마지막 실시일, 생성 경로, 결과/보고서 여부 같은 여러 특성을 가진다.

기존 검색/탐색 구조는 아래 문제가 있다.

- 검색 영역이 `이름/메모`, `그룹`, `성별`, `상태` 중심이라 내담자 특성을 충분히 활용하지 못한다.
- 검사별 보기에서 커스텀 검사가 늘어나면 검사별 내담자 목록이 계속 나열되어 탐색 비용이 커진다.
- 검사 운영 관점에서는 "어떤 검사에 몇 명이 배정됐고, 몇 명이 미실시/완료인지"를 먼저 봐야 하지만 기존 구조는 개별 내담자 행을 바로 보여준다.
- 내담자 중심 탐색과 검사 운영 현황 중심 탐색이 같은 목록 UI 안에 섞여 있어 확장성이 약하다.

## Product Direction
내담자 관리 화면은 두 가지 탐색 목적을 분리한다.

### 1. 내담자 찾기
내담자 자체를 찾고 상세로 들어가는 흐름이다.

주요 질문:
- 특정 내담자가 있는가?
- 어떤 그룹/태그/상태에 속해 있는가?
- 어떤 검사가 배정됐고 마지막 실시일은 언제인가?
- 미실시 또는 배정대기 내담자는 누구인가?

### 2. 검사별 현황
검사 운영 단위로 현황을 보고 해당 검사에 속한 내담자를 좁히는 흐름이다.

주요 질문:
- 어떤 커스텀 검사가 운영 중인가?
- 검사별 배정/미실시/실시완료 수는 얼마인가?
- 특정 검사 안에서 미실시 내담자는 누구인가?
- 기반 검사나 검사명으로 운영 대상을 빠르게 찾을 수 있는가?

## Target UI Model
### Top Search
상단 통합 검색은 빠른 검색만 담당한다.

검색 대상:
- 내담자 이름
- 그룹명
- 태그
- 메모
- 연락처
- 생년월일
- 배정 커스텀 검사명
- 기반 검사명
- 상태

### Advanced Filters
상세 필터는 속성 조건을 담당한다.

필터 후보:
- 그룹
- 성별
- 연령대 또는 생년월일 범위
- 태그
- 배정 커스텀 검사
- 기반 검사
- 실시 상태
- 마지막 실시일 범위
- 생성 경로
- 결과/보고서 존재 여부

1차 구현에서는 현재 데이터 구조와 화면 부담을 고려해 `그룹`, `성별`, `상태`, `검색어`를 유지하되 서버 API 기준으로 정렬하고, 후속 단계에서 나머지 필터를 확장한다.

### View Modes
기존 `내담자별 / 검사별` 토글은 유지하되 의미를 아래처럼 재정의한다.

- `내담자별`: 내담자 목록 중심 검색
- `검사별`: 검사 요약 목록을 먼저 보여주고, 선택한 검사에 속한 내담자만 보여주는 마스터-디테일 탐색

## Test View Direction
검사별 화면은 검사마다 내담자 목록을 아래로 모두 나열하지 않는다.

대신 아래 구조를 사용한다.

1. 검사 현황 요약 테이블
2. 검사 선택
3. 선택한 검사에 속한 내담자 목록
4. 선택 검사 내부에서 상태/검색으로 추가 좁히기

검사 현황 요약에 필요한 열:
- 검사명
- 기반 검사
- 배정 내담자 수
- 미실시 수
- 실시완료 수
- 마지막 실시일

## Implementation Phases
### Phase 1
- 목록 검색을 서버 API 파라미터 기반으로 정렬한다.
- 검색 대상에 그룹, 태그, 배정 검사명, 기반 검사명을 포함한다.
- 검사별 화면을 전체 카드 나열에서 선택형 구조로 변경한다.
- 검사별 현황 요약 API를 추가한다.

### Phase 2
- 상세 필터 패널을 별도 UI로 분리한다.
- 생년월일/연령대, 태그, 기반 검사, 마지막 실시일 범위, 생성 경로 필터를 추가한다.
- 검사별 화면에서 검사 요약 테이블과 선택 검사 내담자 목록을 분리한다.

### Phase 3
- 서버 페이지네이션/정렬을 추가한다.
- 필터 옵션별 count/facet API를 추가한다.
- 대량 데이터 기준 성능을 검증한다.

## Non Goals
- 이번 기획은 검사 생성 플로우 자체를 바꾸지 않는다.
- 내담자 사전 등록/자동 생성/중복 검증 정책 자체는 [client-intake-policy.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/client-intake-policy.md)를 따른다.
- 채점 로직과 결과 산출 방식은 바꾸지 않는다.

## Related Documents
- [docs/features/client-management.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/client-management.md)
- [docs/features/client-search-navigation-spec.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/client-search-navigation-spec.md)
- [docs/features/client-assignment-multi-spec.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/client-assignment-multi-spec.md)
- [docs/features/client-intake-policy.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/client-intake-policy.md)
- [QUALIT_SCORE.md](/mnt/c/Users/user/workspace/2.0-modular/QUALIT_SCORE.md)
