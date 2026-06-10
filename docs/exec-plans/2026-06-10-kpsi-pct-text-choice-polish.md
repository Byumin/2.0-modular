# Execution Plan

## Task Title
- K-PSI/PCT 문항 및 보기 문구 정리

## Request Summary
- K-PSI 33번 문항의 마침표, 띄어쓰기, 괄호 설명 줄바꿈을 반영한다.
- K-PSI/PCT 보기 문구의 마침표를 제거한다.
- choice 이름 불일치는 사용자가 직접 수정했으므로 추가 변경하지 않는다.

## Goal
- RDS 운영 데이터에서 지정된 문항/보기 문구만 제한적으로 수정한다.
- 수정 전후 값을 확인하고, 사용자 요청 범위 밖 데이터는 건드리지 않는다.

## Preflight Checklist
- [x] `AGENTS.md` 확인
- [x] DB 기준: `docs/database/runtime-db.md` 확인
- [x] 운영/실행 서버 DB가 필요한 작업이면 `docs/database/runtime-db.md`의 DB 조회 전 확인 규칙 적용
- [x] 검증 방법과 미검증 가능 항목 정의

## Initial Hypothesis
- K-PSI 33번 문항은 화면에서 괄호 설명을 다음 줄로 분리하는 것이 더 읽기 쉽다.
- K-PSI/PCT 선택지의 마침표는 버튼/보기 문구에서는 없는 쪽이 더 일관적이다.

## Initial Plan
1. RDS에서 현재 K-PSI 33번 문항과 K-PSI/PCT choice 값을 확인한다.
2. K-PSI 33번 문항 텍스트를 마침표/띄어쓰기/줄바꿈 반영 형태로 업데이트한다.
3. K-PSI/PCT choice JSON에서 보기 문구 끝의 마침표만 제거한다.
4. 수정 후 대상 값을 재조회해 검증한다.

## Progress Updates
### Update 1
- Time: 2026-06-10
- Change: 수정 전 현재 값을 확인.
- Reason: 사용자가 직접 반영한 choice 이름 변경과 충돌하지 않기 위해.

### Update 2
- Time: 2026-06-10
- Change: K-PSI 33번 문항을 마침표/띄어쓰기/줄바꿈 반영 형태로 업데이트.
- Reason: 괄호 설명을 다음 줄에 표시하고 문장 가독성을 높이기 위해.

### Update 3
- Time: 2026-06-10
- Change: K-PSI/PCT choice JSON의 보기 문구 끝 마침표 제거.
- Reason: 보기 버튼 문구 스타일을 일관되게 맞추기 위해.

## Result
- RDS `item`의 `K-PSI-4-SF` 33번 문항을 수정했다.
- RDS `choice`의 `CHOICE_KPSI4-SF`, `CHOICE_PCT`에서 보기 문구 끝 마침표를 제거했다.
- 사용자가 직접 수정한 choice 이름은 유지했다.

## Verification
- Checked:
  - K-PSI 33번 문항 줄바꿈/문장부호 재조회
  - `CHOICE_KPSI4-SF` 끝 마침표 잔여 0건
  - `CHOICE_PCT` 끝 마침표 잔여 0건
- Not checked:
  - 코드 변경 없음. 빌드/테스트 미실행.

## Retrospective
### Classification
- `No Major Issue`

### What Was Wrong
- 일부 문항/보기 문구에 화면에서 어색한 문장부호와 띄어쓰기 문제가 있었다.

### Why
- 원문 데이터 입력 시 화면 버튼 문구와 설명 문장 표현이 섞여 관리됐다.

### Next Time
- 보기 버튼 문구는 마침표 없이 통일하고, 문항 본문 설명은 줄바꿈으로 분리한다.

## Related Documents
- [AGENTS.md](../../AGENTS.md)
- [docs/database/runtime-db.md](../database/runtime-db.md)
