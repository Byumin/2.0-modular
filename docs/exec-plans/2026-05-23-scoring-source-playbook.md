# Scoring Source Playbook Documentation

## 작업 제목
- 검사 채점 소스 분석/DB 비교/Scorer 구현 절차 문서화

## 요청 요약
- PCT, PAT-2, K-PSI-4-SF에서 수행한 엑셀 로직 시트 분석과 DB 비교 검토 과정을 앞으로도 반복 가능하게 문서화한다.
- 검사 채점 소스를 만들기 위해 어떤 내용을 반드시 정리해야 하는지 체계화한다.

## 작업 목표
- 새 검사 채점 소스 분석용 운영 문서를 추가한다.
- 기존 기능 문서에서 새 운영 문서로 연결한다.
- 문서에는 엑셀, DB, Scorer 구현, interpret, RDS 반영, 검증 체크리스트를 포함한다.

## 초기 가설
- `docs/features/scoring-flow.md`는 현재 채점 흐름의 source-of-truth 역할을 유지한다.
- 반복 절차는 상세 운영 문서로 분리하는 편이 중복을 줄이고 유지보수하기 쉽다.
- 새 문서는 기능 영역의 운영 문서이므로 `docs/features/`에 둔다.

## 실행 계획
1. 문서 거버넌스와 기존 scoring 문서 확인
2. `docs/features/scoring-implementation-playbook.md` 작성
3. `docs/features/README.md`와 `docs/features/scoring-flow.md`에 링크 추가
4. 작업 결과 확인

## 작업 중 변경 사항
- `scoring-flow.md`에 절차를 길게 넣지 않고 별도 운영 문서로 분리했다.
- 새 문서는 기능 영역에 속하므로 `docs/features/scoring-implementation-playbook.md`로 작성했다.
- `docs/features/README.md`와 `docs/features/scoring-flow.md`에는 링크만 추가해 중복을 줄였다.

## 결과
- `docs/features/scoring-implementation-playbook.md` 추가
  - 엑셀 시트 구조 확인
  - DB 보유 상태 확인
  - 조건축 판정
  - 척도 구조 검산
  - norm 구조 검산
  - interpret 구조 결정
  - Scorer 구현 방식 선택
  - 로컬/RDS DB 반영 순서
  - 검증 체크리스트
  - PCT/PAT-2/K-PSI-4-SF 구현상 핵심 예시
- `docs/features/README.md`에 문서 목록 추가
- `docs/features/scoring-flow.md`에 새 채점 소스 분석 절차 링크 추가

## 검증 내용
- 문서 내용 직접 확인:
  - `sed -n '1,280p' docs/features/scoring-implementation-playbook.md`
  - `sed -n '50,95p' docs/features/scoring-flow.md`
  - `sed -n '1,40p' docs/features/README.md`
- 문서 작업이라 별도 런타임 테스트는 수행하지 않았다.

## 회고
- Plan Problem: 없음.
- Execution Judgment: 절차 전문을 `scoring-flow.md`에 넣으면 현재 동작 설명과 운영 절차가 섞이므로 별도 문서로 분리한 판단이 적절했다.

## Preflight Checklist
- [x] `AGENTS.md` 확인
- [x] `docs/doc-governance.md` 확인
- [x] `docs/features/README.md` 확인
- [x] `docs/features/scoring-flow.md` 확인
