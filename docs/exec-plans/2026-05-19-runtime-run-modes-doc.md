# Runtime Run Modes Documentation

## Request Summary
서버를 띄우는 방식이 여러 가지로 보이므로 로컬 개발 서버, 빌드 후 통합 서버, 운영 도메인 기준을 구분해서 문서화한다. 이 문서를 GitHub에 올려도 되는지도 판단한다.

## Goals
- 실행 방식별 URL, 소스 반영 방식, 사용 목적을 구분한다.
- 상세 기준은 서버 실행 모드 source-of-truth인 `docs/runtime-run-modes.md`에 둔다.
- 구조 문서와 문서 허브에는 상세 규칙을 복제하지 않고 링크만 둔다.
- GitHub에 올려도 되는 정보와 올리면 안 되는 정보를 명확히 적는다.

## Preflight Checklist
- `AGENTS.md` 확인: 완료
- `docs/doc-governance.md` 확인: 완료
- 구조/엔트리포인트 source-of-truth 확인: `ARCHITECTURE.md`
- 문서 허브 확인: `docs/README.md`

## Initial Hypothesis
처음에는 실행 방식을 `ARCHITECTURE.md`의 `Local Development Runtime` 섹션에 흡수하는 것으로 판단했다. 그러나 사용자의 지적대로 구조 설명 문서와 실행 운영 문서의 역할이 다르므로 별도 source-of-truth 문서로 분리하는 것이 맞다.

## Execution Plan
1. `ARCHITECTURE.md`의 로컬 런타임 섹션을 실행 모드별로 정리한다.
2. Vite 개발 서버, FastAPI 통합 서버, 빌드 전용, 운영 도메인 기준을 분리한다.
3. GitHub 공개 가능/불가 정보 기준을 같은 섹션에 추가한다.
4. `docs/README.md`의 Tooling 항목은 상세 복제 없이 `ARCHITECTURE.md` 링크로 연결한다.
5. 변경 후 링크와 문구를 확인한다.

## Revised Execution Plan
1. 새 운영 문서 `docs/runtime-run-modes.md`를 만든다.
2. 실행 모드별 상세 설명과 GitHub 공개 기준을 새 문서로 옮긴다.
3. `ARCHITECTURE.md`에는 구조상 필요한 고정 포트와 새 문서 링크만 남긴다.
4. `docs/README.md`와 `docs/doc-governance.md`에서 새 source-of-truth를 연결한다.
5. 변경 후 중복 여부와 민감 정보 포함 여부를 확인한다.

## Changes During Work
- 최초에는 `ARCHITECTURE.md`의 로컬 런타임 섹션에 실행 모드 표와 모드별 설명을 추가했다.
- 사용자 피드백에 따라 상세 설명을 `docs/runtime-run-modes.md`로 분리했다.
- `ARCHITECTURE.md`는 구조 문서 역할에 맞게 `Local Ports` 섹션에 고정 포트와 새 문서 링크만 남겼다.
- `docs/README.md`와 `docs/doc-governance.md`에 새 source-of-truth 링크를 추가했다.
- 구매/연결 완료된 실제 운영 도메인이 문서에 반영되어야 한다는 피드백을 반영해 `Production Domain Runtime`에 실제 도메인 기록 위치를 추가했다.
- 문서 용어가 표는 한국어, 본문 제목은 영어로 섞여 읽기 어렵다는 피드백에 따라 `docs/runtime-run-modes.md`를 한국어 섹션 기준으로 재작성했다.
- 운영 도메인 모드에 DNS, 서버 네트워크, 환경 변수, 프런트 빌드, FastAPI 실행, reverse proxy, 운영 확인 URL 순서를 추가했다.

## Result
- 로컬 개발 모드, 로컬 통합 확인 모드, 프런트 빌드, 운영 도메인 모드를 별도 운영 문서에 구분해서 문서화했다.
- GitHub에 올려도 되는 문서 정보와 문서에 쓰면 안 되는 민감 정보를 명시했다.

## Verification
- `docs/runtime-run-modes.md`의 신규 섹션 내용을 확인했다.
- 표와 본문 섹션명이 한국어 기준으로 일치하는지 확인했다.
- 운영 도메인으로 띄우는 순서가 DNS -> 네트워크 -> 환경 변수 -> 빌드 -> FastAPI 실행 -> reverse proxy -> 도메인 확인 순서로 들어갔는지 확인했다.
- `ARCHITECTURE.md`가 상세 실행 절차를 중복하지 않고 새 문서로 연결하는지 확인했다.
- `docs/README.md`의 허브 링크가 상세 규칙을 중복하지 않는지 확인했다.
- 저장소 공개 문서에서 실제 운영 도메인 값을 찾지 못해 `https://<production-domain>` placeholder로 남겼다.
- RDS 호스트, 계정/비밀번호 같은 민감 값이 문서에 포함되지 않았는지 확인했다.

## Retrospective
- Plan Problem: 처음에는 `ARCHITECTURE.md`가 런타임/엔트리포인트 기준을 담는다는 이유로 실행 방식까지 흡수하려 했다. 하지만 사용자의 요청은 구조 설명이 아니라 목적별 서버 실행 운영 가이드였으므로 별도 문서가 더 맞았다.
