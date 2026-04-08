# Explanation Rule

이 문서는 기능 설명, 디버깅 흐름 추적, 리팩토링/소스 정리 전 구조 분석 시 따라야 하는 상세 규칙을 정리한다.

## Purpose
사용자가 특정 기능, 흐름, 생성/수정/조회 과정의 설명을 요청하면 반드시 현재 코드베이스를 기준으로 실제 호출 흐름을 추적해서 설명한다.

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
- [ARCHITECTURE.md](/mnt/c/Users/user/workspace/2.0-modular/ARCHITECTURE.md)
- [docs/features/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/README.md)
- [docs/diagrams/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/diagrams/README.md)
- [docs/database/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/database/README.md)
