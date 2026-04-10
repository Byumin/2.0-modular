# Explanation Rule

이 문서는 기능 설명, 디버깅 흐름 추적, 리팩토링/소스 정리 전 구조 분석 시 따라야 하는 상세 규칙을 정리한다.

## Purpose
사용자가 특정 기능, 흐름, 생성/수정/조회 과정의 설명을 요청하면 반드시 현재 코드베이스를 기준으로 실제 호출 흐름을 추적해서 설명한다.
사용자가 단순 설명을 넘어서 `코드 정리`나 `인터랙션으로 보여줘` 같은 요청을 하면, 설명만으로 끝내지 말고 [docs/interactive-flow-spec.md](/mnt/c/Users/user/workspace/2.0-modular/docs/interactive-flow-spec.md)를 기준으로 인터랙션 웹 산출물 생성을 우선 검토한다.

## Default Explanation Order
설명 순서는 아래를 기본으로 한다.

1. 시작점: 어떤 화면, JavaScript, 클라이언트 요청에서 시작되는지
2. 라우터: 어떤 URL과 HTTP 메서드가 요청을 받는지
3. 스키마: 어떤 Pydantic 스키마로 요청을 검증하는지
4. 서비스: 어떤 서비스 함수가 호출되는지
5. CRUD/DB: 어떤 조회, 저장, 수정, 삭제 함수가 실행되는지
6. 응답: 최종적으로 어떤 응답이 반환되는지

## Runtime Timeline Rule
사용자가 "처리되는 순서대로", "실행 순서대로", "타임라인으로" 같은 표현으로 요청하면 위 카테고리형 묶음 설명보다 실제 런타임 실행 순서를 우선한다.

이 경우 설명은 라우터/서비스/CRUD를 분리해서 나열하지 말고, 실제 코드가 실행되는 순서대로 한 줄씩 이어서 설명한다.

## Step Granularity Rule
순차 실행 흐름을 step으로 설명할 때는 함수 단위가 아니라 책임 단위로 나눈다.

- 한 step에는 하나의 주된 책임만 둔다.
- 스키마 검증, 입력 정규화, DB 조회, 데이터 대조, 분기/예외 판단, 저장용 구조 재구성, DB 저장, 응답 반환은 가능하면 각각 독립 step으로 분리한다.
- 특히 서로 다른 두 데이터 집합을 비교하거나 교집합/차집합 판단을 수행하는 경우, 그 대조 로직은 별도 step으로 분리한다.
- 서비스 함수 하나가 여러 작업을 수행하더라도 설명은 함수 경계가 아니라 실제 런타임 책임 전환 시점을 기준으로 나눈다.
- step 안에서 데이터 구조나 의미가 바뀌면 반드시 입력과 출력이 어떻게 달라졌는지 적는다.
- 어떤 step 설명에 예시가 한 종류만 붙고 다른 처리의 예시를 생략하게 되면, 그 step은 과도하게 많은 책임을 가진 것으로 보고 분리한다.
- `정규화`라고만 쓰지 말고 공백 제거, 중복 제거, 허용 타입 보정, 빈 옵션 제거, canonical JSON 변환처럼 실제 변환 내용을 적는다.
- `검증` 또는 `대조`라고만 쓰지 말고 무엇과 무엇을 비교하는지 적는다.

## Example Coverage Rule
step 설명에는 해당 책임에 맞는 예시를 빠뜨리지 않는다.

- 정규화 step에는 입력 예시와 정규화 후 출력 예시를 함께 적는다.
- 대조/검증 step에는 비교 대상 양쪽의 예시와 판정 결과를 함께 적는다.
- 누적/병합 step에는 누적 전 상태와 누적 후 상태를 함께 적는다.
- 예외 발생 step에는 어떤 입력에서 어떤 조건 때문에 실패하는지 예시를 적는다.
- step마다 가능하면 `입력 데이터 -> 수행 작업 -> 결과 또는 다음 호출` 형식을 유지한다.

## Additional Rules
- 가능하면 실제 파일 경로와 함수명을 함께 적는다.
- 개념 설명보다 현재 저장소의 실제 구현 흐름 추적을 우선한다.
- 사용자가 헷갈려하면 추상 설명보다 요청 예시, 응답 예시, 실제 payload 구조를 먼저 보여준다.
- 설명 대상이 프론트엔드 이벤트에서 시작되면 HTML/JS 시작점도 포함한다.
- 사용자가 순차 실행 흐름을 원하면, "어느 계층인지"보다 "다음에 실제로 무엇이 실행되는지"를 기준으로 작성한다.
- 순차 실행 흐름 설명에서는 서비스 중간의 DB 조회/검증/분기/재조회/저장을 생략하지 않고 호출 시점 그대로 적는다.
- 순차 실행 흐름 설명에서는 같은 서비스 함수 안에서 CRUD 호출이 여러 번 나오면, 그 호출들을 실제 실행 순서대로 모두 분리해서 적는다.
- 순차 실행 흐름 설명에서는 한 단계마다 가능하면 "입력 데이터(주요 필드) -> 수행 작업 -> 다음 호출" 형태를 유지한다.
- 스키마, 클래스, 함수가 상속 또는 확장 관계에 있으면 반드시 부모/기반 소스부터 먼저 설명하고, 그 다음 자식/확장 소스를 설명한다.
- 특히 Pydantic 스키마 설명 시에는 `부모 스키마 -> 자식 스키마 -> 라우터에서 실제 사용하는 최종 스키마` 순서를 명확히 지킨다.
- 사용자가 직접 검색할 필요가 없도록, 설명에 등장하는 핵심 소스는 가능한 한 모두 클릭 가능한 파일 경로와 줄 번호로 적는다.
- 파일 참조는 단순 파일명만 쓰지 말고, 사용자가 바로 열 수 있도록 절대 경로 링크와 가능한 정확한 시작 줄 번호를 포함한다.
- 사용자가 특정 클래스, 함수, 필드, 라우터를 물으면 그 정의 위치뿐 아니라 실제 호출 위치도 함께 적는다.
- `파일명:줄번호` 같은 일반 텍스트 표기만 쓰지 않는다. 반드시 `[라벨](/absolute/path/to/file.py#L123)` 형식의 클릭 가능한 링크로 적는다.
- 줄 번호를 언급할 때는 가능한 한 매번 링크 형식을 유지하고, 사용자가 바로 해당 줄로 이동할 수 없게 만드는 축약 표기는 피한다.

## Related Documents
- [Documentation Hub](/mnt/c/Users/user/workspace/2.0-modular/docs/README.md)
- [AGENTS.md](/mnt/c/Users/user/workspace/2.0-modular/AGENTS.md)
- [docs/interactive-flow-spec.md](/mnt/c/Users/user/workspace/2.0-modular/docs/interactive-flow-spec.md)
- [docs/code-cleanup/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/code-cleanup/README.md)
- [docs/code-cleanup/playbook.md](/mnt/c/Users/user/workspace/2.0-modular/docs/code-cleanup/playbook.md)
- [ARCHITECTURE.md](/mnt/c/Users/user/workspace/2.0-modular/ARCHITECTURE.md)
- [docs/features/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/README.md)
- [docs/diagrams/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/diagrams/README.md)
- [docs/database/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/database/README.md)
