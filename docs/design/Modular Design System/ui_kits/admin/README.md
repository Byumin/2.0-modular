# Admin UI Kit — Modular

관리자 화면의 핵심 화면과 컴포넌트들의 React 재현. 사용자 명시 요청에 따라 **검사 생성 모달의 UX 개선**이 메인 결과물.

## Files

| File | What |
|---|---|
| `index.html` | 통합 앱 — 사이드바 + 검사 관리 페이지 + 검사 생성 모달 (열린 상태) |
| `primitives.jsx` | Button / Input / Select / Textarea / Badge / Card / Checkbox + Tabler 아이콘들 |
| `AppShell.jsx` | AppSidebar (4 메뉴 + destructive count badge) + PageHeader |
| `TestManagementPage.jsx` | "검사 관리" 페이지 — tabs · 검색 · 6-col grid 리스트 |
| `CreateTestModal.jsx` | **검사 생성 모달 redesign** (4-step wizard + persistent rail) |

## 검사 생성 모달 — 무엇이 달라졌나 (v2)

**Source of truth**: `Byumin/2.0-modular @ harness-engineering` — `frontend/src/pages/TestManagement.tsx` (lines 1022-1390).

**Before** (production):

- 단일 모달, 2-column grid (`lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]`) 안에 6 섹션 동시 노출:
  `기본 정보` / `1.검사 선택` / `2.세션 구성` / `3.척도 선택` / `4.추가 인적사항` / `구성 요약`.
- 사용자가 어디까지 진행했는지 알 수 없고 스크롤이 매우 길어짐. 드래그 앤 드롭 (`handleTestDragStart` → `handleSessionDrop`) 도 5개 섹션 사이에 끼어 있음.

**After (v2)**:

- **5-step wizard**: `1 기본 정보` → `2 검사 선택` → `3 세션 구성` → `4 척도 선택` → `5 추가 인적사항`.
- **좌측 persistent rail** (220px): 단계 진행도만 표시 (체크/현재/대기 상태). _요약 카드는 사용자 요청에 따라 제거._
- **드래그 앤 드롭 유지** — step 3 (세션 구성)에서 화면을 좌(검사 칩 풀)/우(세션 drop zones) 로 분리. production 핸들러 (`handleTestDragStart`, `handleSessionDrop`, `draggingTestId`) 시그니처 그대로 사용.
- 푸터는 항상 보이는 `이전 / 다음 / 생성` + 단계별 컨텍스추얼 힌트 한 줄.
- 검사 카드는 outlined card 토글 — 선택 시 primary 가장자리.
- 척도 트리는 검사별 collapsible; 기본은 모두 펼침.

DESIGN.md의 모든 시각 규칙 준수: `rounded-lg` modal, `bg-black/40` overlay, `max-w-5xl`, theme token (hard-coded color 없음).

## Caveats

- **catalog/scale tree는 mock**: 실제 API (`/api/admin/tests/catalog`) 응답 구조는 `CatalogResponse` 타입 참조. Production 옮길 때 `collectScaleGroups` 헬퍼 그대로 사용 가능.
- **`실시구간 제외 확인` 보조 모달**은 본 redesign에서 제외 — 다음(=생성) 시점에서 같은 패턴으로 재사용.
- **자유 점프 단계 검증 없음**: 좌측 rail에서 임의 단계로 점프 가능. Production 시에는 단계별 `buildCreatePayload` 부분 검증을 끼워 넣어야 함.
