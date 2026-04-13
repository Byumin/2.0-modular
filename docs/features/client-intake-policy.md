# Client Intake Policy

## Purpose
이 문서는 검사 링크 운영에서 내담자를 어떤 방식으로 생성하고 검사에 연결할지 정하는 서비스 정책의 source of truth다.

핵심 주제는 아래 3가지다.

- 내담자 사전 등록 필수 방식
- 검사 진행 중 자동 생성 방식
- 두 방식을 함께 운영하는 혼합 방식

## Why This Matters
현재 프로젝트의 모듈형 검사 구조는 아래 특성이 강하다.

- 척도 선택이 유동적이다.
- 검사 조합이 다양하다.
- 관리자마다 운영 방식이 다를 수 있다.

이 구조에서는 모든 수검자를 사전에 등록하고 검사별로 미리 배정하는 방식이 운영 부담을 빠르게 키운다. 반대로 자동 생성만 허용하면 중복 내담자 데이터가 쌓일 가능성이 높다. 따라서 서비스 정책 차원에서 어떤 운영 모드를 지원할지 먼저 정해야 한다.

## Industry Pattern
실제 SaaS에서는 링크 접근 후 정보 입력과 동시에 응답 주체를 생성하는 방식이 매우 흔하다.

대표 예:

- Google Form
- Typeform
- SurveyMonkey
- 일반적인 심리검사 SaaS

공통 패턴은 대체로 아래와 같다.

1. 관리자가 링크를 전달한다.
2. 수검자가 링크에 접근한다.
3. 수검자가 인적사항을 입력한다.
4. 시스템이 응답 주체를 자동 생성하거나 기존 주체를 재사용한다.
5. 검사 또는 설문이 바로 진행된다.

## Option Comparison

### 1. 관리자 사전 등록 필수

운영 방식:

1. 관리자가 먼저 내담자를 등록한다.
2. 관리자가 특정 검사에 배정한다.
3. 배정된 내담자만 검사에 진입하거나 제출할 수 있다.

장점:

- 데이터 통제가 쉽다.
- 중복 내담자 생성이 적다.
- 기관형 운영에서 책임 추적이 쉽다.

단점:

- 검사 조합이 많아질수록 관리자 부담이 커진다.
- 링크만 보내고 바로 운영하기 어렵다.
- 대량 운영 시 사전 배정 작업이 병목이 된다.

적합한 경우:

- 학교, 병원, 기관처럼 대상자가 고정된 운영
- 관리자가 대상자 목록을 미리 확보하는 경우
- 중복 레코드보다 통제가 더 중요한 경우

### 2. 검사 진행 시 자동 생성

운영 방식:

1. 관리자가 링크를 전달한다.
2. 수검자가 인적사항을 입력한다.
3. 시스템이 내담자를 자동 생성하거나 기존 동일 인적사항 내담자를 재사용한다.
4. 현재 검사에 자동 배정하고 즉시 진행한다.

장점:

- 운영이 가장 단순하다.
- 모듈형 검사 구조와 잘 맞는다.
- 관리자 입장에서는 링크 전달만으로 운영이 가능하다.

단점:

- 중복 내담자 생성 가능성이 높다.
- 이름 오타, 연락처 누락, 학번 오기입 같은 문제가 누적될 수 있다.
- 사후 정리 기능이 없으면 데이터 품질이 악화된다.

적합한 경우:

- 대량 링크 배포가 필요한 경우
- 검사 조합과 척도 구성이 자주 바뀌는 경우
- 초기 운영 효율이 더 중요한 경우

### 3. 혼합 방식

운영 방식:

- 검사 생성 시 관리자에게 내담자 생성 방식을 선택하게 한다.
- 검사별 정책에 따라 사전 등록 필수 또는 자동 생성 허용을 분기한다.
- 필요하면 자동 생성 후 관리자 승인 단계를 추가한다.

장점:

- 운영 효율과 데이터 통제를 함께 가져갈 수 있다.
- 고객사나 조직별 운영 요구에 맞게 정책을 달리 적용할 수 있다.
- 현재 구조와 향후 확장성 모두에 유리하다.

단점:

- 정책 필드, 분기, 관리자 UI가 추가된다.
- 승인 모드까지 포함하면 구현 복잡도가 증가한다.

적합한 경우:

- 이 프로젝트처럼 검사 조합이 유동적이지만 기관형 운영도 함께 고려해야 하는 경우
- 서비스형 운영과 통제형 운영을 같이 지원해야 하는 경우

## Recommended Direction
이 프로젝트에는 혼합 방식을 기본 전략으로 두는 것이 가장 적절하다.

현재 정책은 아래와 같다.

- 현재 구현 기본 모드: `pre_registered_only`
- 현재 구현 옵션 모드: `auto_create`
- 후속 확장 후보: `auto_create_with_approval`

즉, 현재 구현은 기존 운영과 데이터 통제를 우선해 사전 등록 필수를 기본값으로 두고, 링크 기반 운영 효율이 필요한 검사에서 자동 생성을 명시적으로 선택하는 방식이다.

## Service Modes
검사 생성/수정 시 현재 구현은 아래 정책 필드를 둔다.

- `client_intake_mode = pre_registered_only`
- `client_intake_mode = auto_create`

후속 확장 후보는 아래와 같다.

- `client_intake_mode = auto_create_with_approval`

각 모드의 의미:

### `pre_registered_only`
- 현재 구조와 가장 가깝다.
- 배정된 내담자만 검사 진행 가능
- 미배정 상태에서는 진행 차단

### `auto_create`
- 링크 접근 후 인적사항 입력
- 기존 exact match 내담자 있으면 재사용
- 없으면 자동 생성
- 현재 검사에 자동 배정
- 즉시 실시 진행

### `auto_create_with_approval`
- 현재 미구현 후속 후보다.
- 링크 접근 후 인적사항 입력
- 임시 신청 또는 대기 상태 생성
- 관리자가 승인하면 정식 내담자/배정 생성
- 승인 전에는 검사 진행 제한 또는 대기

## Duplicate Risk And Mitigation
자동 생성 방식을 쓰면 중복 내담자 생성은 피하기 어렵다. 이 위험은 정책으로 인정하고, 운영 기능으로 관리해야 한다.

대표적인 중복 원인:

- 같은 사람이 여러 번 검사 수행
- 이름 철자 다르게 입력
- 전화번호나 이메일 누락
- 학번, 생년월일 오기입

대응 전략:

### 1. 기존 내담자 재사용 규칙
초기에는 exact match 기반으로 시작한다.

- 이름
- 성별
- 생년월일

완전 일치 시 기존 내담자 재사용

생년월일이 없는 경우처럼 동일인 여부가 애매한 케이스는 exact match로 바로 재사용하지 않는다. 이런 경우는 후속 단계에서 `애매 매칭 승인` 흐름으로 분리한다.

### 2. 식별자 강화
추후 아래 정보를 선택 필드로 활용할 수 있다.

- 이메일
- 전화번호
- 학번 또는 내부 번호

### 3. 관리자 병합 기능
중복 후보를 관리 화면에서 병합할 수 있어야 한다.

- 대표 내담자 선택
- 검사 이력 이동
- 배정 정보 이동
- 로그/결과 연결 유지

### 4. 생성 출처 기록
내담자 생성 경로를 남긴다.

예:

- `created_source = admin_manual`
- `created_source = assessment_link_auto`

이 값은 나중에 병합 후보 탐지와 운영 감사에 유용하다.

### 5. 다중 동시 배정 지원
기존 내담자를 재사용해 새 검사에 연결할 때는, 다른 검사 배정을 깨지 않고 추가 연결이 가능해야 한다.

이 구조 상세는 [docs/features/client-assignment-multi-spec.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/client-assignment-multi-spec.md)를 본다.

## Recommended Rollout

### Phase 1
목표:

- `pre_registered_only`
- `auto_create`
- exact match 재사용
- 자동 생성 출처 기록

출시 이유:

- 가장 빠르게 운영 효율을 확보할 수 있다.
- 현재 구현 중인 링크 기반 자동 등록 흐름과 잘 연결된다.

### Phase 2
목표:

- 관리자 병합 기능
- 중복 후보 탐지
- 운영 화면에서 중복 정리 지원
- 생년월일 없는 `이름 + 성별` 동일 케이스를 `애매 매칭`으로 분류
- 애매 매칭은 관리자 승인 전까지 검사 진행 보류
- 승인 시 기존 내담자 연결 또는 신규 내담자 생성 결정

출시 이유:

- 자동 생성으로 발생하는 데이터 품질 문제를 운영적으로 흡수한다.

### Phase 3
목표:

- `auto_create_with_approval`
- 승인 대기 큐
- 승인 전/후 링크 동작 분리

출시 이유:

- 기관형 고객이나 통제 요구가 높은 운영 환경까지 대응할 수 있다.

## Immediate Product Decision
지금 시점에서의 권장 제품 결정은 아래와 같다.

1. 현재 구현 기본값은 `pre_registered_only`로 둔다.
2. 운영 부담을 줄일 수 있도록 `auto_create`를 검사별 옵션으로 둔다.
3. 승인 모드는 후속 단계로 분리한다.
4. 단, 생년월일 없는 유사 매칭은 즉시 재사용하지 않고 후속 승인 흐름 대상으로 본다.

이렇게 하면 모듈형 검사 구조의 운영 부담을 낮추면서도, 나중에 데이터 품질 기능을 붙일 수 있다.

## Scope For Upcoming Development
이 문서를 기준으로 다음 개발 항목을 구체화한다.

1. DB/스키마에 `client_intake_mode` 추가
2. 커스텀 검사 생성/수정 UI에 정책 옵션 추가
3. 평가 링크 검증/제출 흐름에 정책 기반 분기 추가
4. 자동 생성 시 기존 내담자 exact match 재사용
5. 자동 생성 내담자 출처 필드 추가
6. 관리자 중복 병합 기능의 후속 명세 작성
7. 생년월일 없는 유사 매칭의 관리자 승인 흐름 후속 명세 작성

Phase 1 상세 변경안은 아래 문서를 본다.

- [docs/features/client-intake-phase1-spec.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/client-intake-phase1-spec.md)

생년월일 없는 유사 매칭의 승인 대기 흐름은 아래 문서를 본다.

- [docs/features/client-intake-phase2-ambiguous-match-spec.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/client-intake-phase2-ambiguous-match-spec.md)

## Related Documents
- [docs/features/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/README.md)
- [docs/features/assessment-link-flow.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/assessment-link-flow.md)
- [docs/features/client-intake-phase1-spec.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/client-intake-phase1-spec.md)
- [docs/features/client-intake-phase2-ambiguous-match-spec.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/client-intake-phase2-ambiguous-match-spec.md)
- [docs/features/client-management.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/client-management.md)
- [ARCHITECTURE.md](/mnt/c/Users/user/workspace/2.0-modular/ARCHITECTURE.md)
- [docs/doc-governance.md](/mnt/c/Users/user/workspace/2.0-modular/docs/doc-governance.md)
