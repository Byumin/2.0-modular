# 보안 기술 부채 메모

나중에 반드시 처리해야 할 보안 이슈. 현재 내부 운영 도구 수준이라 즉각 위험은 낮지만 운영 확대 전 필수 수정.

## 1. 어드민 세션 메모리 저장

**위치:** `app/services/admin/auth.py:14`

```python
ADMIN_SESSIONS: dict[str, int] = {}
```

**문제:**
- 서버 프로세스 재시작 시 모든 로그인 세션 소멸 → 어드민 강제 로그아웃
- 다중 프로세스(gunicorn workers) 또는 다중 서버 환경에서 세션 공유 불가

**해결 방향:**
- Redis 기반 세션 스토어
- 또는 DB 테이블(`admin_session`)에 token → admin_id 매핑 저장

---

## 2. SHA256 패스워드 해싱 (Salt 없음)

**위치:** `app/services/admin/auth.py:17-18`

```python
def make_password_hash(raw: str) -> str:
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()
```

**문제:**
- Salt 없는 단순 SHA256 → 레인보우 테이블·사전 공격 취약
- 현재 기본 비밀번호(`admin1234`)가 환경변수로 설정됨 (`auth.py:23`)

**해결 방향:**
- `passlib[bcrypt]` 또는 `argon2-cffi` 도입
- 기존 해시 마이그레이션: 로그인 성공 시 구 해시 감지 → 새 해시로 교체

---

_발견일: 2026-04-11 / 코드 리뷰 중 식별_
