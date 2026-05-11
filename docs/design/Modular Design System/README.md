# Modular Design System

> 인싸이트 2.0 모듈러 — 검사 운영 웹 앱의 디자인 시스템

## What is this?

Modular는 FastAPI 백엔드 + React SPA로 구성된 **검사 운영 웹 애플리케이션**입니다. 두 개의 명확하게 구분된 사용자 흐름으로 구성됩니다:

1. **관리자 화면 (Admin)** — 조용하고 실무적인 SaaS 운영 도구. 정보 밀도가 높고, 표/카드/필터/액션 버튼의 정렬이 명확. blue primary (`hsl(215 70% 35%)`) + neutral 토큰 사용.
2. **수검자 화면 (Assessment)** — 검사 응답에 집중시키는 단순한 플로우. 부드럽고 몰입감 있는 **teal 계열 (`#175e63`)** 으로 차별화.

이 두 갈래가 같은 앱 안에 공존하기 때문에, **운영 화면에 마케팅 hero 장식 / decorative blob / gradient를 가져오지 않는 것**이 디자인 시스템의 핵심 규칙입니다.

## Sources

- **Codebase**: `2.0-modular/` (mounted via Import) — `frontend/` 가 React SPA
  - `frontend/src/index.css` — Tailwind v4 `@theme` 토큰
  - `frontend/src/components/ui/*` — shadcn 스타일 primitives (Button, Card, Input, Badge, Sidebar)
  - `frontend/src/components/layout/AppSidebar.tsx` — 관리자 네비게이션
  - `frontend/src/pages/TestManagement.tsx` — **검사 생성 모달** (현재 복잡해진 화면 — 이 시스템의 핵심 redesign 대상)
  - `frontend/src/pages/assessment/*` — 수검자 단계형 플로우
- **Design SoT**: `2.0-modular/DESIGN.md` (이 시스템 정의의 원본 — 552줄)
- **Repo**: Byumin/2.0-modular @ harness-engineering branch

## Index

| File | What |
|---|---|
| `README.md` | 이 문서 — 컨텍스트, 가이드, manifest |
| `colors_and_type.css` | CSS 변수 — admin/assessment 양 팔레트 + 타입 스케일 |
| `SKILL.md` | 에이전트가 이 시스템으로 작업할 때 읽는 진입점 |
| `assets/` | 로고/아이콘 (현재는 Tabler Icons CDN 사용) |
| `preview/` | Design System 탭의 카드들 (HTML preview cards) |
| `ui_kits/admin/` | 관리자 화면 UI kit + 검사 생성 모달 redesign |

## Content Fundamentals

### Voice & Tone
- **언어**: 한국어 위주 (UI 라벨, 버튼, 안내문). 영문은 코드/식별자 (test_id, STS, MMPI 같은 검사명) 에서만 노출.
- **존댓말**: 관리자 화면도 수검자 화면도 모두 정중한 존댓말 (`~합니다`, `~해주세요`). 명령조 (`~하라`, `~해`) 는 사용 안 함.
- **간결함**: 한 문장에 하나의 행동만. 페이지 제목 → 한 줄 설명문 패턴.
  - 예: "검사 관리" → "맞춤형 검사를 생성하고 관리합니다"
  - 예: "검사 생성" → "검사군, 척도, 추가 인적사항을 선택해 커스텀 검사를 생성합니다."
- **2인칭/1인칭**: "당신/저희" 같은 대명사 거의 안 씀. 행위 중심 — 무인칭으로 작성.
- **Emoji**: 사용하지 않음. 상태/카운트는 badge + 숫자.
- **Casing**: 영문 검사 코드는 대문자 (`STS`, `MMPI-2`, `K-WISC`). 한글은 normal.

### Examples (real strings from codebase)

```
# Page titles
"검사 관리"
"내담자 관리"
"동일인 검토"

# Subtitles
"맞춤형 검사를 생성하고 관리합니다"
"검사군, 척도, 추가 인적사항을 선택해 커스텀 검사를 생성합니다."

# Section labels (modal)
"기본 정보"
"1. 검사 선택"
"2. 세션 구성"
"3. 척도 선택"
"4. 추가 인적사항"
"구성 요약"

# Inline hints
"자동 생성 허용은 검사 링크에서 내담자 등록과 배정을 진행합니다."
"동의서 내용은 설정 메뉴에서 관리합니다."
"먼저 검사 선택에서 검사 항목을 체크해주세요."

# Empty states
"등록된 검사가 없습니다."
"추가 인적사항이 없습니다."
"조건에 맞는 실시 현황이 없습니다."

# Buttons
"검사 생성"   # primary
"닫기"        # outline
"생성"        # primary submit
"생성 중..."  # loading state
"항목 삭제"   # outline destructive variant
"옵션 추가"

# Errors
"검사 생성에 실패했습니다."

# Step modal — "단계별 번호 + 한국어 동사형 제목" 패턴이 일관됨.
```

### Modal Numbering Convention
검사 생성 모달은 단계가 많아도 사용자가 스캔 가능하도록 **번호 + 짧은 명사형 제목** 으로 섹션을 구분합니다:

> 기본 정보 → 1. 검사 선택 → 2. 세션 구성 → 3. 척도 선택 → 4. 추가 인적사항 → 구성 요약

번호 없는 섹션 (`기본 정보`, `구성 요약`) 은 메타/요약 영역. 1~4번은 사용자가 차례대로 결정해야 하는 단계.

## Visual Foundations

### Colors

**Admin palette** — Tailwind v4 `@theme` 토큰 기반. HSL.
- Primary blue: `hsl(215 70% 35%)` — 주요 액션, 현재 선택, focus ring 모두 동일
- Foreground: `hsl(222.2 84% 4.9%)` — 거의 검정에 가까운 짙은 네이비
- Muted: `hsl(210 40% 96.1%)` — 표 header, secondary surface
- Muted foreground: `hsl(215.4 16.3% 46.9%)` — 보조 텍스트
- Border: `hsl(214.3 31.8% 91.4%)`
- Destructive: `hsl(0 84.2% 60.2%)`
- Sidebar: `hsl(0 0% 98%)` (배경), `hsl(210 40% 93%)` (active/hover)
- Status: success는 `bg-green-100 text-green-700`, warning은 `bg-yellow-100 text-yellow-700` (Tailwind palette 직접 사용)

**Assessment palette** — 별도 hard-coded teal 시스템.
- Deep teal: `#175e63` — 주요 CTA
- Deep teal hover: `#124b4f`
- Dark text: `#161d1b`
- Secondary text: `#5f6f73`, `#8a9a96`
- Light panels: `#f3f5f4`, `#f5f7fa`, `#fafbfc`
- Borders: `#dfe5e3`, `#e2e8f0`, `#e8ebee`
- Accent cyan: `#5ce1e6`

두 팔레트는 **절대 한 화면에서 섞이지 않습니다.** Admin 화면에서 teal 사용 금지.

### Typography

```css
font-family: 'Pretendard', 'Noto Sans KR', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif;
font-size: 14px; /* base — 관리자 밀도 우선 */
line-height: 1.5;
```

| Role | Size | Weight |
|---|---|---|
| Page title | 20px (text-xl) | 600 |
| Modal title | 18px (text-lg) | 600 |
| Section title | 14px (text-sm) | 600 |
| Label | 14px (text-sm) | 500 |
| Body | 14px (text-sm) | 400 |
| Hint | 12px (text-xs) | 400~500 |
| Badge micro | 10~12px | 600~700 |
| Assessment title | 24~36px | 700 |

Letter spacing 기본 0. `tracking-wider`/`tracking-widest`는 micro label에서만 제한적 사용. 본문은 카드/섹션 안에서 짧게 끊습니다.

### Spacing

8pt 그리드의 변형. Tailwind 토큰 그대로:
- 4 / 8 / 12 / 16 / 24 / 32 px (= `gap-1` ~ `gap-8`)
- 카드 default padding: `px-6 py-6` 또는 `p-4`
- 관리자 list/grid는 `gap-3` ~ `gap-6` 범위에서 정렬감 우선
- modal 2-column에서도 각 section의 상단선이 맞아야 함

### Surfaces & Elevation

**Cards**
```tsx
flex flex-col gap-6 rounded-xl border bg-card py-6 text-card-foreground shadow-sm
```
- radius: `rounded-xl` (default) / `rounded-lg` (좁은 tool panel)
- shadow: 거의 없음 (`shadow-sm`, `shadow-xs`). **강한 box-shadow 추가 안 함.**
- 카드 안 카드 중첩은 반복 item / modal section / tree panel 같이 의미가 있을 때만

**Borders**
- Section 분리는 shadow보다 border + spacing
- list row는 border-bottom 또는 muted hover
- 대부분 `border` (1px, `hsl(214.3 31.8% 91.4%)`) — 변형 없음

**Modals**
- overlay: `bg-black/40` (assessment intro / warning은 `bg-black/50`)
- centered panel — `rounded-lg border bg-card shadow-lg`
- 길어지면 `max-h-full overflow-auto`, 푸터 액션은 우측 정렬
- 검사 생성 모달은 `max-w-5xl` 까지 넓게, 2-column grid (`lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]`)

### Hover & Press States

- Primary 버튼 hover: `bg-primary/90` (10% darker via opacity)
- Outline / secondary hover: `bg-accent text-accent-foreground` (= muted neutral)
- Ghost hover: `bg-accent`
- 표 row hover: `hover:bg-muted/40` — 매우 옅게
- Press 상태 별도 정의 없음 (CSS `active:` 거의 미사용)
- 드래그 시: `cursor-grab` → `active:cursor-grabbing`, drop zone 강조는 `border-primary/40 bg-primary/5`

### Focus

- 모든 interactive: `focus-visible:ring-2 focus-visible:ring-ring/50`
- ring 색상은 primary와 동일 (`hsl(215 70% 35%)`)
- 색상만으로 상태 전달 금지 — 항상 label/icon과 함께

### Motion

- 관리자 화면: **decorative blob/orb 사용 금지.** transition은 `transition-colors`, `transition-all` 정도만.
- 수검자 intro: deep teal blob 3개 (`assessment-intro-blob-*`) — `cubic-bezier(0.07,0.8,0.16,1)`, 22~30s 무한 alternate
- 수검자 step transition: 180~220ms, opacity + translateY + blur, `cubic-bezier(0.22, 1, 0.36, 1)`
- `prefers-reduced-motion: reduce` 시 모든 blob / step transition 무력화

### Borders & Radii

- `--radius: 0.75rem` (12px)
- 실제로는 `rounded-md` (6px), `rounded-lg` (8px), `rounded-xl` (12px)을 가장 많이 사용
- Badge: `rounded-md`
- Input/Button: `rounded-md`
- Card: `rounded-xl`

### Imagery & Iconography vibe

- 사진/이미지 거의 없음 — 정보 밀도 중심 SaaS
- 수검자 intro 배경: 추상 teal blur blob 3개 + 연한 cyan/yellow/red 그라데이션
- 색감 분위기: 차분한 cool tone (admin), 깊이있는 teal + cyan accent (assessment)
- 그레인 / 텍스처 / 패턴 사용 안 함

## Iconography

- **Icon library**: `@tabler/icons-react` — line-style, 1.5~2px stroke, 24×24 base, 인터페이스 전체에서 단일 system
- 코드베이스에 자체 SVG/이미지 아이콘 없음 (`frontend/src/assets/` 에 Vite 기본 `react.svg` 만 존재)
- 자주 쓰이는 아이콘:
  - `IconBrain` — 브랜드 / 앱 identity (사이드바)
  - `IconDashboard` / `IconClipboardList` / `IconUsers` / `IconUserSearch` / `IconSettings` / `IconLogout` — 메인 메뉴
  - `IconLink` — URL 복사/생성
  - `IconTrash` — 삭제
  - `IconPlus` — 생성/추가
  - `IconSearch` — 검색
  - `IconChevronDown` / `IconChevronRight` — tree expand/collapse
- **CDN 사용**: 이 디자인 시스템에서는 Tabler Icons를 https://unpkg.com/@tabler/icons-react@latest/dist/esm/* 또는 SVG sprite로 부릅니다. 별도 import 없음.
- Emoji / unicode 아이콘 사용 안 함
- 같은 의미의 action에 다른 icon 섞지 않음

> **🚩 Substitution flag**: 이 디자인 시스템 카드에서는 인라인 SVG로 Tabler 모양을 흉내냅니다. 실제 production 작업에서는 `@tabler/icons-react` 를 그대로 사용하세요.

## UI Kits

| Product | Path | Status |
|---|---|---|
| Admin (관리자) | `ui_kits/admin/` | 검사 관리 페이지 + **검사 생성 모달 redesign** (개선된 UX) |

수검자 (Assessment) UI kit은 이번 사이클에서 제외했습니다 — 사용자 요청은 검사 생성 모달 (admin) 의 UX 개선이 명시적 목표.

## Caveats / Open questions

- **폰트 파일 미포함**: `Pretendard` / `Noto Sans KR` 는 보통 시스템 폰트 또는 CDN으로 로드. 이 시스템은 Pretendard CDN (`https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css`) 을 참조합니다. 자체 호스팅이 필요하면 폰트 파일을 별도 제공해주세요.
- **로고 미포함**: 코드베이스에 Modular 자체 로고가 없습니다. 사이드바는 `IconBrain` (Tabler) + 텍스트 "Modular Admin"이 브랜드 표식입니다. 별도 워드마크/심볼을 만드시려면 의뢰해주세요.
