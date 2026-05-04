# Modular Design System

## 1. Document Role

이 문서는 이 저장소의 디자인 관련 source-of-truth 문서다.

- 독자: 프론트엔드 UI를 수정하거나 새 화면을 만드는 작업자
- 범위: 폰트, 색상, 테마 토큰, UI 컴포넌트, UX 원칙, 화면별 디자인 톤
- 기준 코드:
  - `frontend/src/index.css`
  - `frontend/src/components/ui/*`
  - `frontend/src/components/layout/AppSidebar.tsx`
  - `frontend/src/pages/*`
  - `frontend/src/pages/assessment/*`
- 기존 보조 문서: `docs/design/design-system.md`

루트 `DESIGN.md`가 디자인, 폰트, UI, UX, 테마, 스타일 기준의 source-of-truth다.

## 2. Product Tone

이 앱은 FastAPI 백엔드와 React SPA로 구성된 검사 운영 웹 애플리케이션이다.
디자인 톤은 크게 두 갈래로 나뉜다.

1. 관리자 화면
   - 조용하고 실무적인 SaaS 운영 도구
   - 정보 밀도는 높지만 표, 카드, 필터, 액션 버튼의 정렬이 명확해야 함
   - 장식보다 빠른 탐색, 비교, 관리 액션이 우선

2. 수검자 화면
   - 검사 응답에 집중시키는 단순한 플로우
   - 관리자 화면보다 부드럽고 몰입감 있는 teal 계열 사용
   - 응답 진행률, 문항 이동, 입력 피드백이 명확해야 함

공통 원칙:
- 랜딩 페이지처럼 보이는 장식적 레이아웃을 만들지 않는다.
- 카드 안에 카드를 과하게 중첩하지 않는다.
- 과도한 그림자, 과한 gradient, 불필요한 hero 장식은 운영 화면에서 피한다.
- 텍스트와 UI 요소가 겹치지 않도록 고정 폭, grid track, min/max width를 명확히 둔다.

## 3. Typography

### Font Family

현재 전역 body 폰트는 다음 순서다.

```css
font-family: 'Pretendard', 'Noto Sans KR', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif;
```

역할:
- `Pretendard`: 기본 한글/영문 UI 폰트
- `Noto Sans KR`: Pretendard 미사용 환경 fallback
- `Apple SD Gothic Neo`, `Malgun Gothic`: OS fallback
- `sans-serif`: 최종 fallback

### Base Type

전역 기본값:

```css
font-size: 14px;
line-height: 1.5;
-webkit-font-smoothing: antialiased;
-moz-osx-font-smoothing: grayscale;
```

### Type Scale

현재 UI에서 반복되는 크기 기준:

| Role | Size | Weight | Usage |
| --- | ---: | ---: | --- |
| Page title | `20px` / `text-xl` | `600` | 관리자 주요 페이지 제목 |
| Modal title | `18px` / `text-lg` | `600` | 생성/상세 모달 제목 |
| Section title | `14px` / `text-sm` | `600` | 카드 내부 섹션 제목 |
| Label | `14px` / `text-sm` | `500` | 입력 label, 리스트 항목 |
| Body | `14px` / `text-sm` | `400` | 기본 본문, 표 cell |
| Hint | `12px` / `text-xs` | `400~500` | 보조 설명, 메타 정보 |
| Badge micro | `10px~12px` | `600~700` | 작은 상태 표시, 카운트 badge |
| Assessment title | `24px~36px` | `700` | 수검자 진입/프로필 화면 제목 |

### Typography Rules

- 관리자 화면은 `text-sm` 중심의 밀도 있는 UI를 기본으로 한다.
- display scale의 큰 제목은 수검자 intro/profile처럼 몰입이 필요한 곳에만 쓴다.
- letter spacing은 기본 0을 유지한다.
- micro label에서만 `tracking-wider`, `tracking-widest`를 제한적으로 사용한다.
- 버튼, label, table header는 `font-medium` 또는 `font-semibold`를 사용한다.
- 본문 텍스트는 긴 줄보다 카드/섹션 안에서 짧게 끊는다.

## 4. Theme Tokens

현재 Tailwind v4 `@theme` 기준 토큰은 `frontend/src/index.css`에 있다.

### Core Colors

| Token | Value | Role |
| --- | --- | --- |
| `--color-background` | `hsl(0 0% 100%)` | 기본 페이지 배경 |
| `--color-foreground` | `hsl(222.2 84% 4.9%)` | 기본 텍스트 |
| `--color-card` | `hsl(0 0% 100%)` | 카드 배경 |
| `--color-card-foreground` | `hsl(222.2 84% 4.9%)` | 카드 텍스트 |
| `--color-popover` | `hsl(0 0% 100%)` | 드롭다운/팝오버 배경 |
| `--color-popover-foreground` | `hsl(222.2 84% 4.9%)` | 팝오버 텍스트 |

### Brand And Interaction

| Token | Value | Role |
| --- | --- | --- |
| `--color-primary` | `hsl(215 70% 35%)` | 주요 버튼, 현재 선택, 핵심 액션 |
| `--color-primary-foreground` | `hsl(210 40% 98%)` | primary 위 텍스트 |
| `--color-ring` | `hsl(215 70% 35%)` | focus ring |
| `--color-secondary` | `hsl(210 40% 96.1%)` | secondary 버튼/면 |
| `--color-accent` | `hsl(210 40% 96.1%)` | hover, selected surface |
| `--color-destructive` | `hsl(0 84.2% 60.2%)` | 삭제, 위험, 오류 |

### Neutral And Borders

| Token | Value | Role |
| --- | --- | --- |
| `--color-muted` | `hsl(210 40% 96.1%)` | 연한 배경, table header |
| `--color-muted-foreground` | `hsl(215.4 16.3% 46.9%)` | 보조 텍스트 |
| `--color-border` | `hsl(214.3 31.8% 91.4%)` | 기본 테두리 |
| `--color-input` | `hsl(214.3 31.8% 91.4%)` | 입력 테두리 |
| `--color-sidebar` | `hsl(0 0% 98%)` | 관리자 sidebar 배경 |
| `--color-sidebar-accent` | `hsl(210 40% 93%)` | sidebar active/hover |

### Radius And Dimensions

```css
--radius: 0.75rem;
--header-height: 3.5rem;
```

현재 실제 컴포넌트에서는 `rounded-md`, `rounded-lg`, `rounded-xl`가 많이 쓰인다.

## 5. Color Usage

### Admin Screens

관리자 화면은 white/neutral 배경에 muted border를 얹고, primary blue를 주요 액션에만 쓴다.

권장:
- 페이지 배경: `bg-background`
- 카드/패널: `bg-card`, `border`
- 표 header: `bg-muted`
- 보조 설명: `text-muted-foreground`
- 주요 액션: `bg-primary text-primary-foreground`
- 위험 액션: `text-destructive`, `bg-destructive`

피해야 할 것:
- 한 화면에서 primary와 teal hard-coded 색을 섞는 것
- 표, 카드, 필터마다 다른 blue tone을 임의로 쓰는 것
- 운영 화면에서 decorative blob/orb를 쓰는 것

### Assessment Screens

수검자 화면은 별도 teal visual language를 사용한다.

주요 색:
- Deep teal: `#175e63`
- Deep teal hover: `#124b4f`
- Dark text: `#161d1b`
- Secondary text: `#5f6f73`, `#8a9a96`
- Light panel: `#f3f5f4`, `#f5f7fa`, `#fafbfc`
- Border: `#dfe5e3`, `#e2e8f0`, `#e8ebee`
- Accent cyan: `#5ce1e6`

사용 위치:
- 수검 시작/프로필 CTA
- 응답 진행률
- 선택된 문항 option
- 완료/제출 액션

## 6. Layout System

### Admin Layout

관리자 화면은 sidebar + content layout이다.

- Sidebar:
  - `h-screen`
  - `border-r`
  - header/footer에 `border-b`, `border-t`
  - 메뉴 group label은 small uppercase 느낌
- Main content:
  - 페이지 title + 설명
  - tab/filter/search 영역
  - table-like list 또는 dashboard cards

관리자 list 화면은 card 안에 grid row를 둔다.

예시 패턴:
```tsx
grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr_1fr_152px]
```

규칙:
- header row와 data row는 같은 grid track을 공유한다.
- 액션 열은 고정 폭을 둔다.
- 이름/설명처럼 길어질 수 있는 열에 더 많은 공간을 준다.
- hover는 `hover:bg-muted/40` 정도로 약하게 둔다.

### Assessment Layout

수검자 화면은 단계형 플로우다.

- Intro
- Profile
- Question
- Complete

규칙:
- 수검자 입력 카드의 최대 폭은 관리 화면보다 좁게 둔다.
- 한 화면에서 질문, 선택지, 진행 상태가 명확해야 한다.
- 키보드 조작과 빠른 이동 UI는 보조 패널로 정리한다.
- 모바일에서는 질문 카드와 진행 UI가 겹치지 않아야 한다.

## 7. Spacing

반복 사용 간격:

| Token-like size | Tailwind | Usage |
| ---: | --- | --- |
| `4px` | `gap-1`, `p-1` | icon/text micro gap |
| `8px` | `gap-2`, `p-2` | compact list, sidebar item |
| `12px` | `gap-3`, `p-3` | table cell, small card |
| `16px` | `gap-4`, `p-4` | standard inner panel |
| `24px` | `gap-6`, `p-6` | card default |
| `32px` | `gap-8`, `p-8` | large section |

Rules:
- 관리자 화면은 `gap-3`~`gap-6` 범위 안에서 정렬감을 우선한다.
- modal 내부는 2-column layout을 쓰더라도 각 section의 상단선이 맞아야 한다.
- card padding은 기본 `p-4` 또는 component default `px-6 py-6`를 따른다.

## 8. Surfaces And Elevation

### Cards

현재 `Card` 기본:

```tsx
flex flex-col gap-6 rounded-xl border bg-card py-6 text-card-foreground shadow-sm
```

Card subcomponents:
- Header: `grid auto-rows-min gap-2 px-6`
- Content: `px-6`
- Footer: `flex items-center px-6`

Rules:
- 기본 카드는 white surface + 1px border + light shadow.
- 카드 radius는 `rounded-xl` 또는 좁은 tool panel의 `rounded-lg`를 사용한다.
- 카드 안 카드 중첩은 반복 item, modal section, tree panel처럼 의미가 있을 때만 허용한다.
- 강한 box-shadow를 추가하지 않는다.

### Modals

현재 검사 생성 modal은 fixed overlay + centered panel이다.

Rules:
- overlay: black alpha background
- modal width: 업무용 modal은 넓을 수 있으나 viewport padding을 둔다.
- modal body가 길어질 경우 내부 scroll을 허용한다.
- footer action은 우측 정렬.

### Borders

기본 border는 `border` token을 사용한다.

Rules:
- section 분리는 shadow보다 border와 spacing으로 처리한다.
- list row는 border-bottom 또는 muted hover로 구분한다.
- tree UI는 상위 section border + 내부 hover surface를 쓴다.

## 9. Components

### Button

현재 Button variant:

- `default`: `bg-primary text-primary-foreground hover:bg-primary/90`
- `destructive`: `bg-destructive text-white hover:bg-destructive/90`
- `outline`: `border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground`
- `secondary`: `bg-secondary text-secondary-foreground hover:bg-secondary/80`
- `ghost`: `hover:bg-accent hover:text-accent-foreground`
- `link`: `text-primary underline-offset-4 hover:underline`

Current base:

```tsx
inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium
transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring/50
disabled:pointer-events-none disabled:opacity-50
```

Sizes:
- default: `h-9 px-4 py-2`
- sm: `h-8 rounded-md px-3 text-xs`
- lg: `h-10 rounded-md px-6`
- icon: `size-9`

Rules:
- 주요 생성/저장/제출은 default button.
- 삭제는 destructive.
- 표 row의 URL/상세 같은 보조 액션은 outline 또는 ghost.
- icon-only button은 접근 가능한 label/tooltip을 둔다.

### Input

현재 Input 기본:

```tsx
flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs
placeholder:text-muted-foreground
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50
disabled:cursor-not-allowed disabled:opacity-50
```

Rules:
- form label은 `text-sm font-medium`.
- 설명은 `text-xs text-muted-foreground`.
- input height는 `h-9`를 기본으로 하고, 수검자 CTA/large form은 `h-10`~`h-13`까지 허용한다.

### Badge

현재 Badge 기본:

```tsx
inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-colors
```

Rules:
- 상태 badge는 작은 pill/rounded chip으로 사용한다.
- danger/success/warning 색상은 상태 표현에만 쓴다.
- 긴 텍스트를 badge 안에 넣지 않는다.

### Sidebar

관리자 sidebar:
- 브랜드: `IconBrain` + `Modular Admin`
- 메뉴 icon: Tabler Icons
- active menu: sidebar accent background
- pending count: destructive circular badge

Rules:
- sidebar item은 icon + text 구조를 유지한다.
- 메뉴 그룹 label은 과하게 크지 않게 둔다.
- 새 메뉴 추가 시 `navMain`, `navSecondary`의 icon 스타일을 맞춘다.

### Tables And Lists

현재 관리자 리스트는 실제 `<table>`보다 grid-based rows를 많이 사용한다.

Rules:
- header row와 item row grid template을 동일하게 유지한다.
- 숫자/상태/액션은 중앙 정렬 가능.
- 이름/설명은 truncate 또는 wrap 기준을 명확히 둔다.
- 액션 버튼은 row 높이를 흔들지 않아야 한다.

### Tree Controls

검사 생성 척도 선택 UI는 tree interaction을 사용한다.

Rules:
- 상위 node는 chevron button으로 접고 펼친다.
- leaf node만 checkbox로 선택한다.
- condition별 section을 분리해 같은 code라도 실시구간별 구성이 섞이지 않게 한다.
- 전체 선택은 검사 단위 선택으로만 제공하고, 내부 leaf checkbox는 disabled 상태로 맞춘다.

## 10. UX Rules

### Admin UX

- 사용자는 반복적으로 조회, 비교, 선택, 생성, 삭제를 수행한다.
- 모든 리스트 화면은 검색/필터 -> 결과 리스트 -> row action 흐름이 즉시 보여야 한다.
- 생성 modal은 단계가 많아도 번호와 섹션을 나눠 스캔 가능해야 한다.
- 생성/삭제/링크 복사처럼 상태가 바뀌는 액션은 성공/실패 피드백을 명확히 준다.
- 대량 정보는 설명문보다 표, badge, 카운트, tree 구조로 정리한다.

### Assessment UX

- 수검자는 관리자가 아니므로 내부 용어나 DB 용어를 노출하지 않는다.
- 필수 인적사항 입력 -> 검사 안내 -> 응답 -> 제출 완료 흐름이 자연스러워야 한다.
- 오류 메시지는 짧고 회복 가능한 문장으로 쓴다.
- 진행률과 현재 위치를 항상 알 수 있어야 한다.
- 문항 선택지는 큰 터치 영역을 확보한다.

### Loading And Empty States

- 로딩 중에는 버튼 disabled 또는 loading text를 둔다.
- empty state는 원인과 다음 액션을 짧게 알려준다.
- fetch 실패 시 조용히 빈 화면으로 두지 말고 메시지를 둔다.

## 11. Motion And Effects

현재 전역 CSS에는 다음 애니메이션 계열이 있다.

1. Generic hero blobs
   - `hero-blob-*`
   - `hero-glass-*`
   - radial gradient, blur, organic morphing

2. Assessment intro teal blobs
   - `assessment-intro-blob-*`
   - deep teal/cyan 분위기

Rules:
- 관리자 운영 화면에서는 decorative blob을 쓰지 않는다.
- 수검자 intro처럼 몰입형 첫 화면에서만 제한적으로 사용한다.
- motion은 사용자의 입력 흐름을 방해하지 않아야 한다.
- 반복 animation은 배경 장식에만 쓰고 핵심 form/control에는 쓰지 않는다.

## 12. Icons

현재 아이콘 라이브러리:
- `@tabler/icons-react`

사용 예:
- `IconBrain`: 브랜드/앱 identity
- `IconDashboard`: 대시보드
- `IconClipboardList`: 검사 운영
- `IconUsers`: 내담자 관리
- `IconUserSearch`: 동일인 검토
- `IconSettings`: 설정
- `IconLogout`: 로그아웃
- `IconLink`: URL 복사/생성
- `IconTrash`: 삭제
- `IconChevronDown`, `IconChevronRight`: tree expand/collapse

Rules:
- 관리 화면 버튼에는 가능하면 icon + label을 함께 둔다.
- icon-only control은 hover/focus와 accessible label을 갖춰야 한다.
- 같은 의미의 action에 다른 아이콘을 섞지 않는다.

## 13. Responsive Behavior

### Admin

- Desktop first.
- 넓은 화면에서는 list/table grid를 유지한다.
- 좁은 화면에서는 grid row가 1-column으로 내려갈 수 있어야 한다.
- modal은 viewport padding을 유지하고 내부 scroll을 허용한다.

### Assessment

- Mobile and tablet usability가 중요하다.
- 선택지는 손가락으로 누르기 쉬운 크기를 유지한다.
- 질문 텍스트와 옵션이 겹치지 않아야 한다.
- 진행/빠른 이동 패널은 작은 화면에서 과도하게 공간을 차지하지 않아야 한다.

## 14. Accessibility

Current focus:
- buttons/inputs use `focus-visible:ring-2 focus-visible:ring-ring/50`
- disabled controls use opacity and pointer-events

Rules:
- 모든 interactive control은 keyboard focus가 보여야 한다.
- checkbox/radio는 label과 함께 클릭 영역을 넓힌다.
- icon button에는 `aria-label` 또는 visible text를 둔다.
- 색상만으로 상태를 전달하지 않는다.
- destructive action은 label과 색상을 함께 사용한다.

## 15. Implementation Stack

Frontend stack:
- React
- TypeScript
- Vite
- Tailwind CSS v4
- shadcn-style local UI primitives
- `class-variance-authority`
- `tailwind-merge`
- `@tabler/icons-react`

Primary files:
- Theme tokens: `frontend/src/index.css`
- Utility merge: `frontend/src/lib/utils.ts`
- Button: `frontend/src/components/ui/button.tsx`
- Card: `frontend/src/components/ui/card.tsx`
- Input: `frontend/src/components/ui/input.tsx`
- Badge: `frontend/src/components/ui/badge.tsx`
- Sidebar: `frontend/src/components/ui/sidebar.tsx`
- App sidebar: `frontend/src/components/layout/AppSidebar.tsx`

## 16. Screen-Specific Guidance

### Dashboard

- 요약 카드의 숫자 계층을 가장 크게 둔다.
- 최근 실시/운영 검사 리스트는 빠르게 스캔 가능해야 한다.
- chart-like UI는 단색 primary와 muted background를 중심으로 구성한다.

### Test Management

- 검사 생성 modal은 `기본 정보`, `검사 선택`, `구성 요약`, `척도 선택`, `추가 인적사항` 흐름을 유지한다.
- 척도 선택은 condition section + scale tree 구조를 쓴다.
- 같은 code라도 condition별 구성이 다르면 별도 section에서 보이게 한다.
- row action은 URL, 상세, 삭제 순서로 정리한다.

### Client Management

- 내담자 정보는 목록 스캔과 상세 진입이 빠르게 가능해야 한다.
- 태그/그룹/status는 badge/chip 형태로 유지한다.
- 검사 배정 관련 UI는 명확한 primary action과 보조 action을 분리한다.

### Assessment Profile

- 수검 시작 화면은 teal brand tone을 사용한다.
- 인적사항 입력은 필수 항목을 명확히 표시한다.
- 개인정보 동의 modal/section은 장문 가독성을 우선한다.

### Assessment Question

- 문항 카드와 선택 option이 가장 중요한 정보다.
- 선택 option은 large touch target과 clear selected state를 가져야 한다.
- 빠른 이동/진행 현황은 보조 정보로 배치한다.

## 17. Do And Do Not

### Do

- 기존 token과 component variant를 먼저 사용한다.
- 새 색상을 추가하기 전에 `index.css` theme token으로 해결 가능한지 본다.
- 화면별 목적에 맞는 밀도를 유지한다.
- list/table grid track을 명시해 alignment를 보존한다.
- tree, tab, checkbox, button 같은 control은 익숙한 패턴을 사용한다.

### Do Not

- 운영 화면을 marketing hero처럼 만들지 않는다.
- 한 화면에서 여러 accent color를 경쟁시키지 않는다.
- 카드 안에 불필요하게 카드를 중첩하지 않는다.
- 텍스트가 버튼/카드/표 cell 밖으로 넘치게 두지 않는다.
- 수검자 화면의 teal hard-coded palette를 관리자 화면에 무분별하게 가져오지 않는다.
- decorative blob/orb를 관리자 화면 배경에 쓰지 않는다.

## 18. Current Known Inconsistencies

현재 코드에는 일부 hard-coded 색상이 존재한다.

- 수검자 화면: `#175e63`, `#124b4f`, `#161d1b`, `#5ce1e6` 등
- 관리자 화면: 대부분 Tailwind theme token 사용
- 전역 CSS: legacy/generic hero blob animation이 남아 있음

향후 정리 방향:
- 관리자 화면은 theme token 중심으로 유지한다.
- 수검자 화면 teal palette는 별도 assessment token으로 승격하는 것을 검토한다.
- 새 hard-coded 색상 추가는 피한다.
