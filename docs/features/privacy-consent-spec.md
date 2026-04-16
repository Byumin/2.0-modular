# 개인정보동의 기능 스펙

## 목적
수검자가 검사를 진행하기 전에 개인정보 수집·이용에 동의하는 절차를 지원한다.
동의 여부는 검사별로 설정하고, 동의서 내용은 관리자가 직접 입력하며, 동의 기록은 내담자별로 저장된다.

## 관련 도메인
- 설정 (Admin Settings)
- 커스텀 검사 관리 (Custom Test Management)
- 수검자 흐름 (Assessment Flow)
- 내담자 관리 (Client Management)

---

## 1. 설정 메뉴 — 동의서 내용 관리

### 위치
`/admin/settings`

### 기능
- 관리자 계정별로 개인정보동의 텍스트를 저장/수정
- 입력 영역: textarea (멀티라인)
- 저장 버튼으로 즉시 반영

### 동의서에 들어가는 내용 (관리자 직접 입력)
관리자가 자유롭게 작성. 일반적으로 포함되는 항목:
- 수집 항목 (이름, 생년월일, 검사 응답 등)
- 수집 목적 (심리검사 결과 분석 및 상담 활용)
- 보유 기간
- 동의 거부 권리 안내

### API
| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/admin/settings/consent` | 동의 텍스트 조회 |
| PUT | `/api/admin/settings/consent` | 동의 텍스트 저장 |

---

## 2. 검사 생성/수정 — 동의 사용 여부

### 위치
검사 생성 화면 및 검사 상세/수정 화면

### 기능
- `개인정보동의 사용` 토글 (on/off)
- 기본값: off
- on 설정 시 해당 검사 수검자에게 동의 화면 노출

### API 변경
- 기존 커스텀 검사 생성/수정 API에 `requires_consent: bool` 필드 추가

---

## 3. 수검자 흐름 — 동의 화면

### 진입점
`/assessment/custom/{token}`

### 흐름
```
검사 링크 접속
    ↓
requires_consent == true?
    ↓ Yes
동의 화면 표시 (설정에서 입력한 텍스트)
    ├─ 동의 → 동의 기록 저장 → 검사 진행
    └─ 거부 → 검사 진행 불가 안내 화면
    ↓ No
바로 검사 진행 (기존 흐름)
```

### 동의 화면 구성
- 동의서 텍스트 (스크롤 가능 영역)
- `동의합니다` 버튼
- `동의하지 않습니다` 버튼

### 동의 거부 시
- "개인정보 수집에 동의하지 않으면 검사를 진행할 수 없습니다." 안내
- 검사 화면으로 진입 불가

### API
| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/assessment/custom/{token}/consent` | 동의 필요 여부 및 텍스트 조회 |
| POST | `/api/assessment/custom/{token}/consent` | 동의 제출 기록 저장 |

---

## 4. 동의 기록 저장

### 저장 시점
- 수검자가 `동의합니다`를 클릭한 시점

### 저장 항목
| 필드 | 설명 |
|------|------|
| admin_user_id | 관리자 ID |
| admin_client_id | 내담자 ID |
| admin_custom_test_id | 검사 ID |
| consented | 동의 여부 (true/false) |
| consented_at | 동의 일시 |

### 조회
- 향후 내담자 상세 페이지에서 해당 내담자의 동의 이력 확인 가능 (추후 구현)

---

## 5. DB 변경 사항

### 신규 테이블: `admin_settings`
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | INTEGER PK | |
| admin_user_id | INTEGER FK | admin_user 참조, UNIQUE |
| consent_text | TEXT | 동의서 내용 |
| updated_at | DATETIME | 마지막 수정 일시 |

### 기존 테이블 변경: `child_test` (AdminCustomTest)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| requires_consent | BOOLEAN | 동의 필요 여부, DEFAULT FALSE |

### 신규 테이블: `client_consent_record`
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | INTEGER PK | |
| admin_user_id | INTEGER FK | |
| admin_client_id | INTEGER FK | |
| admin_custom_test_id | INTEGER FK | |
| consented | BOOLEAN | |
| consented_at | DATETIME | |

---

## 6. 프런트엔드 변경 범위

| 화면 | 변경 내용 |
|------|-----------|
| 사이드바 | 설정 메뉴 링크 추가 |
| `/admin/settings` | 신규 페이지 — 동의서 텍스트 편집 |
| 검사 생성/수정 | `requires_consent` 토글 추가 |
| TestManagement | `검사 결과` 탭 제거 |
| `/assessment/custom/{token}` | 동의 단계 추가 |

---

## 구현 순서
1. DB 모델 + 마이그레이션
2. 백엔드 API (설정, 검사 수정, 수검자 동의)
3. 설정 메뉴 UI
4. 검사 생성/수정 토글
5. TestManagement 검사 결과 탭 제거
6. 수검자 동의 화면

## Related Documents
- [docs/exec-plans/2026-04-15-privacy-consent-feature.md](/mnt/c/Users/user/workspace/2.0-modular/docs/exec-plans/2026-04-15-privacy-consent-feature.md)
- [docs/features/custom-test-management.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/custom-test-management.md)
- [docs/database/schema-overview.md](/mnt/c/Users/user/workspace/2.0-modular/docs/database/schema-overview.md)
- [ARCHITECTURE.md](/mnt/c/Users/user/workspace/2.0-modular/ARCHITECTURE.md)
