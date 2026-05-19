# 내담자 관계 테이블 + 전 섹션 이름/성별/생년월일 강제 수집

## 요청 요약
- 내담자 relation 테이블: 부모-자녀, 선생-학생 등 다양한 관계 지원
- 모든 내담자 등록 조건: 이름+성별+생년월일 3개 필수
- 검사 실시 ProfileStep: 섹션 구성 무관하게 모든 섹션에서 이름+성별+생년월일 항상 수집
- 버그 픽스: mixed profile에서 child_gender/child_birth_day 키 정규화 실패로 register-client 막히는 문제

## 작업 목표 (1단계)
1. `admin_client_relation` 테이블 생성 (schema_migrations + models + repository)
2. ProfileStep: 모든 섹션에 이름+성별+생년월일 항상 렌더링 (섹션 fields config 무관)
3. assessment_links: _resolve_subject_profile() 헬퍼로 child_gender→gender 정규화 (버그픽스)
4. submit 시점: 보조 대상자(parent, teacher 등) 클라이언트 등록 + relation 생성

## 파일 변경 목록
- `app/db/schema_migrations.py` — ensure_admin_client_relation_table()
- `app/main.py` — migration 호출
- `app/db/models.py` — AdminClientRelation 모델
- `app/repositories/client_repository.py` — create_client_relation, get_client_relations_by_client
- `app/services/admin/assessment_links.py` — _resolve_subject_profile, _extract_secondary_subjects, submit 플로우 수정
- `frontend/src/pages/assessment/steps/ProfileStep.tsx` — 베이스 필드 강제 수집

## Relation 테이블 구조
```sql
admin_client_relation(
  id, admin_user_id,
  client_id_a INTEGER,  -- 주 대상자 (자녀, 학생 등)
  role_a VARCHAR(50),   -- 'child', 'student', 'self' 등
  client_id_b INTEGER,  -- 관련 대상자 (부모, 선생 등)
  role_b VARCHAR(50),   -- 'parent', 'teacher' 등
  created_at DATETIME
)
```

## 보조 대상자 추출 규칙
profile에서 `{role}_name` / `{role}_gender` / `{role}_birth_day` 3개 모두 있을 때만 등록
- 대상 role: parent, teacher, classmate, guardian (확장 가능)
- primary subject role: child(mixed일때) or self(단일일때)

## 매칭 우선순위 (호환)
- 기존 클라이언트에 대한 매칭은 현재와 동일 (name+gender+birth_day)
- 보조 대상자는 독립적으로 find_admin_client_by_identity로 매칭 후 없으면 신규 생성

## 작업 중 변경 사항
- `_register_secondary_clients_and_relations` 함수를 submit 함수 직전에 정의하고, submit 완료 후 호출
- ProfileStep에서 base fields(name/gender/birth_day)를 `configuredBaseFields`로 체크해 중복 렌더 방지
- 섹션 map을 화살표 표현식에서 블록으로 변경하여 섹션 라벨/base fields 변수 선언 가능하게 함

## 결과
변경 파일:
- `app/db/schema_migrations.py`: ensure_admin_client_relation_table() 추가
- `app/main.py`: migration 호출 추가
- `app/db/models.py`: AdminClientRelation 모델 추가
- `app/repositories/client_repository.py`: create_client_relation, get_client_relations_by_client 추가
- `app/services/admin/assessment_links.py`: _resolve_subject_profile, _extract_secondary_subjects, _register_secondary_clients_and_relations 추가; validate-profile/register-client/submit 진입부에 profile 정규화 적용
- `frontend/src/pages/assessment/steps/ProfileStep.tsx`: 모든 섹션에 이름/성별/생년월일 항상 렌더링; nameInSections 제거; validate/buildProfile 수정

## 검증 내용
- [ ] mixed profile로 register-client 성공 (버그픽스)
- [ ] ProfileStep: 자녀+부모 섹션 모두 이름/성별/생년월일 입력칸 표시
- [ ] submit 후 자녀, 부모 각각 admin_client에 등록됨
- [ ] admin_client_relation 레코드 생성됨
- [ ] 단일 self 검사도 이름/성별/생년월일 항상 표시

## 회고
(완료 후 기록)
