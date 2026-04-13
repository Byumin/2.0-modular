# Execution Plan

## Task Title
- React 전환 — Shadcn UI 기반 관리자 프론트엔드 마이그레이션

## Request Summary
- 현재 정적 HTML + vanilla JS 구조의 관리자 화면을 Vite + React + Shadcn UI 기반으로 전환한다.
- 레퍼런스: `docs/design/reference/ui-main` (shadcn-ui/ui GitHub 소스)
- FastAPI 백엔드 API는 그대로 유지하고 프론트엔드만 교체한다.

## Goal
- 관리자 화면 전체를 React 컴포넌트 기반으로 재구성
- Shadcn UI 컴포넌트를 기반으로 디자인 품질 향상
- 기존 FastAPI `/api/...` 엔드포인트와 그대로 연결
- 장기적으로 기능 확장이 용이한 구조 확보

## Initial Hypothesis
- FastAPI는 API 서버 역할만 유지하고, React 앱은 별도 Vite 프로젝트로 분리
- `frontend/` 디렉토리에 React 프로젝트 생성
- 빌드 결과물을 FastAPI가 서빙하거나 별도 포트로 개발 서버 운영
- Shadcn UI의 sidebar, card, table, dialog, form 컴포넌트 활용

## Tech Stack
- **빌드**: Vite + React 18
- **언어**: TypeScript
- **스타일**: Tailwind CSS v4
- **UI 라이브러리**: Shadcn UI (new-york-v4 스타일)
- **라우팅**: React Router v6
- **아이콘**: @tabler/icons-react (Shadcn 레퍼런스 기준)
- **HTTP**: fetch API (기존 admin.js 패턴 유지)

## Page Mapping
| 현재 HTML | React 페이지 |
|---|---|
| `/admin` (로그인) | `pages/Login.tsx` |
| `/admin/workspace` (대시보드) | `pages/Dashboard.tsx` |
| `/admin/create` (검사 관리) | `pages/TestManagement.tsx` |
| `/admin/clients` (내담자 관리) | `pages/ClientManagement.tsx` |
| `/admin/client-detail` | `pages/ClientDetail.tsx` |
| `/admin/client-result` | `pages/ClientResult.tsx` |
| `/admin/test-detail` | `pages/TestDetail.tsx` |
| `/admin/settings` | `pages/Settings.tsx` |
| `/admin/artifact-viewer` | `pages/ArtifactViewer.tsx` |
| `/admin/client-detail?id=...` | `pages/LegacyRedirect.tsx` → `/admin/clients/:id` |
| `/admin/client-result?id=...` | `pages/LegacyRedirect.tsx` → `/admin/clients/:id/result` |
| `/admin/test-detail?id=...` | `pages/LegacyRedirect.tsx` → `/admin/create/:id` |

## Component Mapping (Shadcn 레퍼런스 기준)
| UI 요소 | Shadcn 컴포넌트 | 레퍼런스 파일 |
|---|---|---|
| 사이드바 레이아웃 | Sidebar, SidebarProvider | `registry/new-york-v4/ui/sidebar.tsx` |
| 대시보드 카드 | Card, CardHeader, CardTitle | `examples/dashboard/components/section-cards.tsx` |
| 데이터 테이블 | Table + TanStack | `examples/dashboard/components/data-table.tsx` |
| 모달 | Dialog | `registry/new-york-v4/ui/dialog.tsx` |
| 폼 입력 | Input, Select, Label | `registry/new-york-v4/ui/input.tsx` |
| 버튼 | Button | `registry/new-york-v4/ui/button.tsx` |
| 상태 배지 | Badge | `registry/new-york-v4/ui/badge.tsx` |
| 로그인 화면 | - | `blocks/login-01~05/` |

## Initial Plan
1. `design-system.md` React 전환 섹션 추가 및 레퍼런스 구조 문서화
2. `frontend/` Vite + React + Tailwind + Shadcn 프로젝트 초기 세팅
3. 레이아웃 구현: 사이드바 + 헤더 + 라우터
4. 로그인 페이지 구현 (인증 흐름 포함)
5. 대시보드 페이지 구현
6. 검사 관리 페이지 구현 (테이블 + 모달)
7. 내담자 관리 페이지 구현
8. 상세 페이지들 구현
9. FastAPI 연동 검증 및 page_router.py 정리

## Progress Updates
### Update 1
- Time: 2026-04-10
- Change: design-system.md 업데이트 완료
- Reason: React 전환 기준 문서화 먼저 진행

### Update 2
- Time: 2026-04-10
- Change: UI 컴포넌트, 레이아웃, 핵심 페이지 구현 완료
- Details:
  - UI: button, card, input, label, badge, separator, tooltip, dropdown-menu, sidebar
  - Layout: AppSidebar, AppLayout
  - Pages: Login, Dashboard, ClientManagement, TestManagement
  - Router: React Router v6 기반 라우팅 구성
  - Build: `tsc -b && vite build` 성공 확인
  - Dev server: localhost:5173 정상 기동 확인
- Issues:
  - @tailwindcss/oxide-linux-x64-gnu 플랫폼 바이너리 누락 → 명시적 설치로 해결
  - tsconfig.app.json에 paths 설정 누락 → 추가로 해결
  - radix-ui Slot.default 없음 → Slot.Slot으로 수정

### Update 3
- Time: 2026-04-10
- Change: 나머지 페이지 구현 및 FastAPI 서빙 연동 완료
- Details:
  - Pages: ClientDetail, ClientResult, TestDetail 구현
  - App.tsx: 전체 라우트 등록 완료
  - page_router.py: `/admin`, `/admin/{path:path}` → React SPA index.html 서빙으로 교체
  - main.py: `frontend/dist/assets` → `/assets` 마운트 추가
  - 검증: `GET /admin` → React `<div id="root">` 반환 확인, CSS 에셋 200 OK, `/admin/workspace` 200 OK

### Update 4
- Time: 2026-04-11
- Change: React 전환 누락 방지 규칙 문서화 및 잔여 범위 재점검
- Details:
  - `docs/design/design-system.md`의 React Migration 섹션에 route/App.tsx/버튼/레거시 파일/Playwright 확인 기준을 추가
  - 실제 React 미연결 후보로 `/admin/settings`, `/admin/artifact-viewer`, query string 기반 레거시 상세 URL, 생성/등록 버튼을 확인
- Reason: 정적 파일이 남아 있는 것과 실제 browser route 미전환을 혼동하지 않도록 전환 완료 기준을 명문화

### Update 5
- Time: 2026-04-11
- Change: 확인된 React 미연결 지점 보강 및 Playwright 검증
- Details:
  - `App.tsx`: `/admin/settings`, `/admin/artifact-viewer`, `/admin/client-detail?id=...`, `/admin/client-result?id=...`, `/admin/test-detail?id=...` 호환 라우트 추가
  - `Settings.tsx`: 별도 설정 API가 없는 현재 상태를 안내하는 React 화면 추가
  - `ArtifactViewer.tsx`: 기존 `static/admin-artifact-viewer.html` 흐름을 React 화면으로 대체하고 리포트 iframe 및 점수 요약 API 연결
  - `ClientManagement.tsx`: `내담자 등록` 버튼을 React 모달과 `/api/admin/clients` POST 흐름에 연결
  - `TestManagement.tsx`: `검사 생성` 버튼을 React 모달과 `/api/admin/custom-tests` POST 흐름에 연결하고 기반 검사 목록을 불러오지 못하는 경우 안내 문구 표시
- Reason: URL은 React SPA로 서빙되더라도 App route 또는 버튼 액션이 빠진 경우를 전환 누락으로 판단했기 때문

### Update 6
- Time: 2026-04-11
- Change: 검사 생성 폼의 기존 정적 화면 동등 구현 완료
- Initial Hypothesis: React 모달은 현재 기반 검사 1개 전체 척도 생성만 지원하므로, 기존 `static/admin-create.html`/`static/admin.js`의 다중 검사 선택, 검사별 전체/개별 척도 선택, 추가 인적사항 편집, 선택 척도가 없는 실시구간 제외 확인 흐름을 `TestManagement.tsx`에 이식해야 한다.
- Plan / Result:
  - 기존 정적 화면의 payload 생성 규칙을 React 상태 기반으로 재구성
  - 선택된 검사별 scale group을 만들고 전체 척도 선택/개별 척도 선택을 지원
  - 추가 인적사항 필드 타입/옵션/필수 여부 편집 UI 추가
  - 선택 척도가 없는 실시구간은 submit 전 확인 모달에서 제외 승인 후 제출
  - 운영 DB 쓰기를 허용받았으므로 Playwright에서 실제 내담자 등록과 검사 생성 submit을 실행
- Verification:
  - Playwright 실제 제출 성공: `React submit client 20260411033642`, `React submit custom test 20260411033642`
  - DB 확인: `admin_client.id=2`, `child_test.id=2`, `additional_profile_fields_json`에 `보호자 관계` select 옵션 저장 확인
  - 스크린샷:
    - `artifacts/screenshots/2026-04-11-react-test-create-detail-modal-after.png`
    - `artifacts/screenshots/2026-04-11-react-client-submit-after.png`
    - `artifacts/screenshots/2026-04-11-react-test-submit-after.png`

## Result
- React 전환 완료 (기본 구조)
- FastAPI가 `/admin/*` 전체를 React SPA로 서빙
- `/assessment/custom/{access_token}`도 React assessment 화면으로 서빙
- `/admin/settings`, `/admin/artifact-viewer`, query string 기반 레거시 상세 URL 호환 추가
- React 관리자 화면의 `내담자 등록`, `검사 생성` 버튼을 모달/API 흐름에 연결
- 검사 생성 모달을 기존 정적 화면과 같은 다중 검사 선택, 검사별 척도 선택, 추가 인적사항, 실시구간 제외 확인 흐름으로 보강
- 남은 작업:
  - 로그인 상태 guard(unauthenticated redirect)

## Verification
### Checked
- `npm run build` 성공
- `npm run lint` 성공, 기존 fast-refresh 경고 3개만 유지
- Playwright 화면 확인 및 스크린샷 저장:
  - `artifacts/screenshots/2026-04-11-react-settings.png`
  - `artifacts/screenshots/2026-04-11-react-legacy-client-detail.png`
  - `artifacts/screenshots/2026-04-11-react-artifact-viewer.png`
  - `artifacts/screenshots/2026-04-11-react-client-create-modal.png`
  - `artifacts/screenshots/2026-04-11-react-test-create-modal.png`
  - `artifacts/screenshots/2026-04-11-react-test-create-detail-modal-after.png`
  - `artifacts/screenshots/2026-04-11-react-client-submit-after.png`
  - `artifacts/screenshots/2026-04-11-react-test-submit-after.png`

### Not Checked
- 로그인 상태 guard는 아직 별도 구현하지 않음

## Retrospective
### Classification
- 초기 계획 보완 필요

### What Was Wrong
- `/admin/*`가 React SPA로 서빙되는 것만으로 전환 완료로 판단하면 App route, query string 호환 URL, 버튼 액션 누락을 놓칠 수 있었다.

### Why
- 기존 HTML 파일이 남아 있고 일부 UI 버튼이 먼저 렌더링만 구현된 상태였기 때문에, URL 서빙 기준과 실제 React 기능 연결 기준을 분리해서 확인해야 했다.

### Next Time
- React 전환 작업은 `page_router.py` 서빙 여부, `App.tsx` route, 사이드바/버튼 액션, 레거시 URL 호환, Playwright 스크린샷을 한 세트로 확인한다.

## Related Documents
- [AGENTS.md](/mnt/c/Users/user/workspace/2.0-modular/AGENTS.md)
- [ARCHITECTURE.md](/mnt/c/Users/user/workspace/2.0-modular/ARCHITECTURE.md)
- [docs/design/design-system.md](/mnt/c/Users/user/workspace/2.0-modular/docs/design/design-system.md)
- [docs/design/reference/ui-main](/mnt/c/Users/user/workspace/2.0-modular/docs/design/reference/ui-main)
- [docs/exec-plans/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/exec-plans/README.md)
