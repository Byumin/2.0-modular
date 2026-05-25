# Scoring Option B Hierarchy Rule Documentation

## 요청 요약
PCT처럼 Option B 구조를 쓰는 검사에서 상위척도 flat `choice_score`와 하위척도 `facet_scale`을 동시에 유지하고, 검사 생성/채점/보고서가 같은 위계 정보를 기준으로 움직이도록 규칙을 먼저 문서화한다.

## 작업 목표
- 새 문서를 만들지 않고 기존 채점 구현 source 문서에 규칙을 흡수한다.
- Option B와 위계 보존 원칙을 명확히 남긴다.
- K-PSI-4-SF, PCT, PAT-2 구조별 처리 기준을 문서화한다.

## Preflight Checklist
- [x] `AGENTS.md` 확인
- [x] `docs/doc-governance.md` 확인
- [x] `docs/exec-plans/README.md` 확인
- [x] 기존 source 문서 `docs/features/scoring-implementation-playbook.md` 확인

## 초기 가설
현재 문제는 DB `scale.struct` 자체를 되돌릴 사안이 아니라, Option B 구조와 위계 정보를 채점 로직이 같은 방식으로 해석하도록 규칙을 고정해야 하는 사안이다.

## 실행 계획
1. `docs/features/scoring-implementation-playbook.md`의 척도 구조 검산 섹션에 Option B 판정 규칙을 보강한다.
2. Scorer 구현 방식 선택 섹션에 선택 코드와 위계 코드가 다를 때의 처리 원칙을 추가한다.
3. Existing Examples에 K-PSI-4-SF/PCT/PAT-2 기준을 더 명확히 정리한다.
4. 문서 변경만 검증하고, 코드 변경은 별도 작업으로 남긴다.

## 작업 중 변경 사항
- 새 문서를 만들지 않고 기존 채점 구현 운영 문서인 `docs/features/scoring-implementation-playbook.md`에 규칙을 흡수했다.
- Required Summary에 `위계 보존` 항목을 추가했다.
- `척도 구조 검산` 섹션에 위계 보존 규칙, Option B 규칙, PAT-2/K-PSI-4-SF/PCT 구조별 예를 추가했다.
- `Scorer 구현 방식 선택` 섹션에 선택 코드와 위계 코드 처리 기준을 추가했다.
- Existing Examples의 PCT/K-PSI-4-SF 설명을 Option B와 parent/facet 기준으로 구체화했다.

## 결과
- Option B와 위계 보존 원칙을 문서화했다.
- 현재 규칙의 source 문서는 `docs/features/scoring-implementation-playbook.md`로 둔다.
- 이번 작업은 문서화만 수행했고, 채점 소스 수정은 아직 수행하지 않았다.

## 검증 내용
- `AGENTS.md`, `docs/doc-governance.md`, `docs/exec-plans/README.md` 확인 완료.
- 변경 후 `docs/features/scoring-implementation-playbook.md`의 관련 섹션을 줄 단위로 재확인했다.
- 코드 실행이나 DB 변경은 없으므로 테스트는 수행하지 않았다.

## 회고
- 이번 판단은 DB 구조를 되돌리는 대신, Option B와 위계 보존을 채점 로직의 명시 규칙으로 삼는 방향이다.
- 다음 구현 단계에서는 이 규칙에 맞춰 공통 채점 인덱스/결과 구조를 수정해야 한다.
