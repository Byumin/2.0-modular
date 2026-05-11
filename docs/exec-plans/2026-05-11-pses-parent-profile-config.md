# 실행계획: PSES 부모 인적사항 설정 추가

## 목적

`PSES`가 부모 인적사항을 사용해야 하는데 `test_profile_config`에 row가 없어 수검자 화면에서 기본 `self` 인적사항 섹션이 추가되는 문제를 수정한다.

## 작업 범위

- 운영 DB `modular.db`의 `test_profile_config`에 `PSES` 필수 인적사항 설정 추가
- 신규 DB 생성 시에도 같은 설정이 들어가도록 `app/db/schema_migrations.py` seed 보정
- 해당 토큰 응답의 `profile_config.sections`에서 불필요한 `self` 섹션이 사라졌는지 확인

## 계획

1. 현재 DB의 `PSES` 설정 부재 확인 - 완료
2. `PSES`를 `parent` subject로 등록 - 완료
3. seed 코드에 동일 설정 추가 - 완료
4. 토큰 `ghr00ATmmQakjaVMzylp4ONDzqkAO83v` payload 재조회로 검증 - 완료

## 검증 기록

- [x] DB row 추가 확인: `PSES` row가 없던 상태에서 `subject_type: "parent"` 설정을 추가함
- [x] API payload의 `profile_config.sections` 확인: `parent`, `child` 2개 섹션 반환
- [x] 불필요한 `self` 섹션 제거 확인
