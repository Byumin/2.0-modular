# Frontend Design System

## Purpose
이 문서는 관리자 화면과 수검자 화면 전반에서 디자인 통일성을 유지하기 위한 기준 문서다.

새 화면을 만들거나 기존 화면을 수정할 때 아래 원칙을 우선 적용한다.

## Design Concept
이 프로젝트의 화면은 아래 성격을 유지한다.

- 전문적이고 차분한 업무용 인터페이스
- 과장된 장식보다 정보 전달이 우선인 구조
- 관리자 화면은 명확한 정보 계층과 빠른 탐색성 중심
- 수검자 화면은 긴장감을 줄이고 입력 흐름이 자연스럽게 이어지는 구성
- 한 화면 안에서 컴포넌트 스타일이 제각각 보이지 않도록 일관된 간격, 색상, 테두리 규칙 유지

## Visual Tone
- 전체 분위기는 깔끔하고 절제된 업무형 스타일을 기본으로 한다.
- 너무 강한 원색, 과한 그림자, 과도한 라운드, 과한 애니메이션은 피한다.
- 강조는 색상 남발보다 간격, 대비, 타이포 계층으로 해결한다.
- 관리자 화면과 수검자 화면은 동일한 시스템을 공유하되, 수검자 화면은 더 부드럽고 단순하게 유지한다.

## Typography
## Font Family
- 기본 폰트는 한글 가독성이 좋은 산세리프 계열로 통일한다.
- 우선순위 예시:
  `Pretendard`, `Noto Sans KR`, `Apple SD Gothic Neo`, `Malgun Gothic`, `sans-serif`
- 화면별로 폰트를 임의로 바꾸지 않는다.

## Font Weight
- 기본 본문: `400`
- 강조 본문/버튼/테이블 헤더: `500` 또는 `600`
- 페이지 제목: `700`

## Type Scale
- 페이지 메인 타이틀: `28px`
- 섹션 타이틀: `20px`
- 카드 타이틀: `16px` ~ `18px`
- 기본 본문: `14px` ~ `16px`
- 보조 설명/힌트 텍스트: `12px` ~ `13px`
- 너무 많은 폰트 크기를 섞지 말고 위 범위 안에서 반복 사용한다.

## Line Height
- 제목: `1.3` 전후
- 본문: `1.5` ~ `1.6`
- 표/리스트: `1.4` 전후

## Color System
## Core Colors
- Primary: 핵심 액션과 현재 상태 강조용
- Neutral: 배경, 텍스트, 경계선용
- Success: 저장 완료, 정상 상태
- Warning: 주의 필요
- Danger: 삭제, 실패, 위험 상태

## Recommended Palette
- Primary 700: `#1F4E79`
- Primary 600: `#2F6EA3`
- Primary 500: `#4D8AC0`
- Primary 100: `#EAF3FB`
- Neutral 900: `#1F2937`
- Neutral 700: `#4B5563`
- Neutral 500: `#6B7280`
- Neutral 300: `#D1D5DB`
- Neutral 200: `#E5E7EB`
- Neutral 100: `#F3F4F6`
- Neutral 50: `#F9FAFB`
- Success: `#217A4A`
- Warning: `#B7791F`
- Danger: `#B42318`

## Color Usage Rules
- 기본 텍스트는 `Neutral 900` 또는 `Neutral 700`을 사용한다.
- 본문 배경은 `white` 또는 `Neutral 50` 계열을 사용한다.
- 테두리는 `Neutral 200` 또는 `Neutral 300` 위주로 사용한다.
- 링크, 현재 선택, 주요 버튼은 `Primary` 계열을 사용한다.
- 경고/오류 색상은 상태 표현에만 제한적으로 사용한다.
- 하나의 화면에서 Primary 계열을 2개 이상 섞어 난잡하게 쓰지 않는다.

## Layout System
## Page Width
- 관리자 메인 화면은 넓은 작업 영역을 허용하되, 콘텐츠 최대 너비 기준을 정해 사용한다.
- 권장 최대 콘텐츠 너비:
  `1200px` ~ `1440px`
- 수검자 입력 화면은 집중도를 위해 더 좁게 유지한다.
- 권장 최대 콘텐츠 너비:
  `720px` ~ `960px`

## Page Padding
- 데스크톱 기본 좌우 패딩: `24px` ~ `32px`
- 태블릿/작은 화면 좌우 패딩: `16px` ~ `20px`
- 모바일 좌우 패딩: `16px`

## Spacing Scale
간격은 아래 단위를 반복 사용해 통일한다.

- `4px`
- `8px`
- `12px`
- `16px`
- `20px`
- `24px`
- `32px`
- `40px`

임의 숫자를 남발하지 말고 위 간격 체계를 우선 적용한다.

## Grid Rule
- 카드형 관리자 화면은 12-column 개념을 기준으로 정렬감을 유지한다.
- 실제 CSS 구현은 flex/grid 어느 쪽이든 가능하지만, 카드 시작선과 끝선은 최대한 맞춘다.
- 표, 필터, 요약 카드, 상세 패널이 서로 다른 정렬 규칙을 갖지 않도록 한다.

## Surface Rule
## Card Style
- 기본 카드 배경: `#FFFFFF`
- 기본 테두리: `1px solid Neutral 200`
- 기본 radius: `12px`
- 강조 카드 radius도 `12px` 또는 `16px` 이내에서 유지한다.
- 기본 그림자:
  `0 4px 16px rgba(15, 23, 42, 0.06)`
- 너무 진한 그림자나 과도한 유리효과는 사용하지 않는다.

## Card Padding
- 작은 카드: `16px`
- 기본 카드: `20px` ~ `24px`
- 큰 상세 카드: `24px` ~ `32px`

## Section Spacing
- 카드와 카드 사이: `16px` ~ `24px`
- 큰 섹션 블록 사이: `32px` ~ `40px`
- 제목과 본문 사이: `8px` ~ `12px`

## Component Rules
## Button
- 기본 높이: `40px` ~ `44px`
- 큰 주요 버튼: `48px`
- 기본 radius: `10px`
- 좌우 패딩은 최소 `14px` 이상 유지한다.
- 한 화면 안에서 버튼 높이가 제각각 되지 않도록 통일한다.

버튼 역할 기준:
- Primary Button: 저장, 생성, 제출, 확인
- Secondary Button: 상세 보기, 편집, 이동
- Tertiary/Button Text: 덜 중요한 보조 액션
- Danger Button: 삭제, 영구 변경

## Input
- 입력 필드 높이: `40px` ~ `44px`
- radius: `10px`
- border: `1px solid Neutral 300`
- focus 상태는 `Primary` 계열 outline 또는 border로 통일한다.
- placeholder 색은 본문 텍스트보다 약하게 유지한다.

## Table
- 헤더 배경은 `Neutral 50` 또는 매우 연한 Primary tint 사용
- 행 높이는 너무 촘촘하지 않게 `44px` 이상 확보
- 표 안 버튼, 배지, 링크 스타일도 같은 시스템을 공유

### 리스트 테이블 열 정렬 규칙
관리자 리스트 화면(내담자 관리, 검사 관리 등)의 CSS Grid 기반 테이블은 아래 규칙을 따른다.

**리스트 테이블 Card 설정 — 반드시 지킬 것**

```jsx
/* 올바른 리스트 카드 구조 */
<Card className="py-0">
  <CardContent className="p-0">
    <div className="hidden md:grid md:grid-cols-[...] gap-2 px-4 h-8 border-b
                    text-xs font-medium text-muted-foreground items-center content-center">
      <span className="text-center">컬럼명</span>
      ...
    </div>
    ...
  </CardContent>
</Card>
```

- **Card에 반드시 `py-0` 적용**: Card 기본값 `py-6`(24px)이 컬럼명 row 위에 빈 공간을 만들어, 시각적으로 컬럼 텍스트가 "헤더 영역" 하단에 쏠려 보이는 원인이 된다.
- **헤더 row: `h-8 items-center content-center`** 세 가지를 반드시 같이 사용. **`py-X` 방식 금지.**
  - `h-8`(32px): 고정 height로 예측 가능한 헤더 높이 확보
  - `content-center`: grid row 전체를 h-8 컨테이너 세로 중앙에 배치
  - `items-center`: 각 span을 grid 셀 내 세로 중앙에 배치
  - 셋 중 하나라도 빠지면 텍스트가 상단 또는 하단에 쏠림
- 모든 헤더 `<span>`에 `text-center` 적용.

**열 정렬 (Alignment)**
- 헤더 셀과 데이터 셀 모두 **열 기준 중앙정렬**을 기본으로 한다.
- 텍스트 셀(`<span>`): `text-center`
- flex 컨테이너 셀(뱃지·버튼 등): `justify-center`
- `flex-col`로 2줄 표시하는 셀: 컨테이너에 `items-center`, 내부 span에 `text-center`
- ClientManagement와 TestManagement 동일 룰. 화면마다 달리 적용하지 않는다.

**액션 버튼 열 너비 — `auto` 금지**
헤더와 각 row는 서로 다른 독립 grid 컨텍스트다. `auto`를 쓰면 헤더(빈 span → 0px)와 row(실제 버튼 크기)가 각자 다른 너비로 계산돼 열 위치가 어긋난다.
반드시 고정 px 사용:

| 버튼 구성 | 고정 너비 |
|-----------|-----------|
| URL + 상세 + 삭제(아이콘) | `152px` |
| 결과 + 내담자 | `108px` |
| 상세 단독 | `72px` |

**열 너비 배분 기준**
열 너비는 해당 열에 들어오는 텍스트 최대 길이를 기준으로 비율을 설정한다.

| 열 유형 | 기준 | 권장 너비 |
|---------|------|-----------|
| 번호 열(`#`) | 항상 짧은 숫자 | 고정 `40px` |
| 짧은 텍스트 (이름, 2–4자) | 짧음 | `1fr` |
| 뱃지·칩 복합 (그룹 등) | 중간 | `1.5fr` |
| 긴 텍스트 (검사명 등) | 길 수 있음 | `2fr` |
| 날짜 (YYYY-MM-DD) | 고정 10자 | `1fr` |
| 숫자 집계 (X명) | 짧음 | `0.7fr` |
| 상태 뱃지 (4자 이내) | 짧음 | `0.8fr` |
| 액션 버튼 열 | 버튼 크기 기준 | 고정 px (위 표 참조) |

**현행 적용값**
```
내담자 관리 (내담자별):  grid-cols-[40px_1fr_1.5fr_2fr_1fr_0.8fr_72px]
내담자 관리 (검사별 현황): grid-cols-[2fr_1.2fr_0.7fr_0.7fr_0.7fr_1fr]
내담자 관리 (검사별 내담자): grid-cols-[40px_1.5fr_1fr_0.8fr_72px]
검사 관리 (커스텀 검사): grid-cols-[2fr_1fr_1fr_1fr_1fr_152px]
검사 관리 (실시 현황):  grid-cols-[2fr_1.2fr_0.7fr_0.7fr_0.7fr_1fr]
검사 관리 (검사 결과):  grid-cols-[1.1fr_1fr_2fr_1.1fr_0.8fr_108px]
```

새 리스트 화면을 추가하거나 열을 변경할 때 위 기준표를 먼저 참조한다.

## Badge / Status
- 상태 배지는 작은 pill 형태로 통일한다.
- 강한 배경색 단색보다 연한 tint 배경 + 진한 텍스트 조합을 우선한다.
- 예:
  Success badge: 연한 녹색 배경 + 진한 녹색 텍스트
  Warning badge: 연한 주황 배경 + 진한 주황 텍스트
  Danger badge: 연한 빨강 배경 + 진한 빨강 텍스트

## Card and Area Sizing
## Summary Card
- 대시보드 요약 카드 최소 높이: `96px` ~ `120px`
- 숫자, 제목, 보조 텍스트의 계층이 명확해야 한다.
- 한 줄에 여러 카드가 놓이면 높이를 맞춘다.

## Form Area
- 하나의 폼 섹션은 카드 단위로 구분한다.
- 2열 배치 시 입력 필드 시작선이 맞아야 한다.
- 긴 폼은 제목, 설명, 입력 그룹, 액션 버튼 영역을 분리한다.

## Detail Panel
- 상세 정보 패널은 본문보다 약간 넓은 패딩을 사용한다.
- 관련 정보는 2개 이상 섹션으로 나뉘면 구분선이나 간격으로 묶는다.

## Modal / Overlay
- 최대 너비를 정해 과도하게 넓어지지 않게 한다.
- 일반 모달 권장 너비:
  `480px`, `640px`, `720px`
- 위험 작업 확인 모달은 짧고 명확하게 유지한다.

## Screen-Specific Guidance
## Admin Screens
- 정보량이 많아도 우선순위가 보이도록 헤더, 필터, 리스트, 상세영역 순으로 구조를 유지한다.
- 통계 카드, 테이블, 액션 버튼이 서로 다른 시각 언어를 쓰지 않도록 한다.
- 필터 바와 리스트 영역은 하나의 관리 도구처럼 보이게 간격과 테두리를 통일한다.

## Assessment / Respondent Screens
- 입력 피로도를 줄이기 위해 한 번에 너무 많은 정보를 보여주지 않는다.
- 질문, 설명, 선택 영역, 다음 액션 버튼 흐름이 자연스럽게 이어져야 한다.
- 경고/오류 메시지는 사용자 불안을 키우지 않도록 간결하게 보여준다.

## Interaction Rules
- hover, focus, active 상태는 모든 버튼과 입력에서 일관된 패턴을 사용한다.
- 클릭 가능한 요소는 커서, 색상, underline 여부로 명확히 구분한다.
- 로딩 상태는 버튼 비활성화 또는 스피너 위치를 통일한다.
- 비동기 처리 중에는 사용자가 현재 처리 상태를 알 수 있어야 한다.

## Responsive Rules
- 데스크톱 기준 레이아웃을 먼저 설계하되, 태블릿과 모바일에서 무너지는 구성을 피한다.
- 폭이 줄어들면 다열 카드와 폼은 단일 열로 자연스럽게 전환한다.
- 표는 필요한 경우 카드형 요약 구조나 가로 스크롤로 대응한다.
- 버튼은 모바일에서 너무 작아지지 않게 최소 터치 영역을 확보한다.

## Consistency Checklist
새 화면이나 수정 작업 시 아래 항목을 점검한다.

- 폰트 패밀리가 기존 화면과 같은가
- 제목/본문/보조 텍스트 크기 체계가 통일되어 있는가
- Primary/Neutral/Status 색상 사용 규칙이 지켜지는가
- 카드 radius, border, shadow가 기존 시스템과 같은가
- 버튼 높이와 입력 높이가 화면마다 달라지지 않았는가
- 카드 간격, 섹션 간격, 페이지 패딩이 spacing scale 안에서 유지되는가
- 관리자 화면과 수검자 화면이 같은 제품처럼 보이는가
- 모바일/태블릿에서 영역 붕괴가 없는가

## Implementation Recommendation
실제 구현 시 아래 방식을 권장한다.

- 색상, radius, spacing, shadow는 CSS 변수 또는 Tailwind theme token으로 먼저 정의한다.
- 현재 React 화면은 `frontend/src/index.css`의 theme token과 `frontend/src/components/ui/` 컴포넌트를 우선 재사용한다.
- 새 주요 관리자/수검자 화면의 기본 수정 대상은 `frontend/src/`다. `static/`은 React SPA가 아닌 레거시/보고서 정적 자원 용도다.
- 새 React 화면을 추가할 때는 기존 React 컴포넌트 네이밍 규칙과 간격 체계를 우선 재사용한다.
- 화면별 예외 스타일은 최소화하고 공통 컴포넌트 스타일을 늘리는 방향으로 정리한다.

---

## React Migration

### 전환 배경
장기적인 기능 확장성을 위해 기존 정적 HTML + vanilla JS 구조에서 Vite + React + Shadcn UI 기반으로 전환했다.
FastAPI 백엔드 API(`/api/...`)는 그대로 유지하고 프론트엔드만 교체한다.
전환 실행 계획은 [docs/exec-plans/2026-04-10-react-migration.md](/mnt/c/Users/user/workspace/2.0-modular/docs/exec-plans/2026-04-10-react-migration.md)를 기준으로 한다.

### Tech Stack
| 역할 | 선택 |
|---|---|
| 빌드 | Vite + React 18 |
| 언어 | TypeScript |
| 스타일 | Tailwind CSS v4 |
| UI 라이브러리 | Shadcn UI (new-york-v4) |
| 라우팅 | React Router v7 |
| 아이콘 | @tabler/icons-react |
| HTTP | fetch API |

### React 전환 누락 방지 규칙
React 전환 작업은 "컴포넌트 파일 생성"이 아니라 실제 브라우저 진입점 전환까지 완료된 상태를 기준으로 한다.
아래 항목 중 하나라도 빠지면 전환 완료로 표시하지 않는다.

- `app/router/page_router.py`에서 해당 browser route가 React SPA `frontend/dist/index.html`로 서빙되는지 확인한다.
- `frontend/src/App.tsx`에 같은 route가 등록되어 있고 wildcard redirect로 빠지지 않는지 확인한다.
- 기존 정적 HTML URL이 query string 기반이면 React route에서 동일 URL을 처리하거나 명시적 redirect/compat route를 둔다.
- React UI에 노출된 버튼과 사이드바 링크는 실제 route, modal, API action 중 하나에 연결되어야 한다. 클릭해도 아무 일도 안 하는 placeholder 버튼은 전환 완료 범위에 포함하지 않는다.
- 정적 파일이 실제 browser route에서 서빙되면 "미전환"으로 분류하고, React SPA가 아닌 보고서/산출물 보조 자원은 `/static` 보존 필요성을 별도로 확인한다.
- 전환 완료 전 `npm run build`, `npm run lint`, 주요 route Playwright 스크린샷을 확인한다.
- 루트 화면은 `/`, 관리자 화면은 `/admin`, `/admin/*` route를, 수검자 화면은 `/assessment/custom/{token}` route를 별도로 확인한다.
- 신규/수정 route가 `frontend/dist` 빌드 산출물에 의존하면 빌드 누락 시 명확한 오류를 반환해야 한다.

### 레퍼런스 소스 구조
로컬 레퍼런스 경로: `docs/design/reference/ui-main/`
원본: [shadcn-ui/ui](https://github.com/shadcn-ui/ui)

```
ui-main/apps/v4/
├── app/(app)/examples/
│   ├── dashboard/                  ← 대시보드 예제 (메인 레이아웃 참고)
│   │   ├── page.tsx                ← SidebarProvider + SidebarInset 구조
│   │   └── components/
│   │       ├── app-sidebar.tsx     ← 사이드바 (navMain, navSecondary, NavUser)
│   │       ├── site-header.tsx     ← 상단 헤더
│   │       ├── section-cards.tsx   ← 통계 카드 (Card + Badge)
│   │       ├── data-table.tsx      ← 데이터 테이블 (TanStack Table 기반)
│   │       ├── nav-main.tsx        ← 주 메뉴 네비게이션
│   │       ├── nav-secondary.tsx   ← 하단 보조 메뉴
│   │       └── nav-user.tsx        ← 유저 프로필 영역
│   ├── authentication/             ← 로그인 페이지 예제
│   └── tasks/                      ← 필터 + 테이블 예제
└── registry/new-york-v4/
    ├── ui/                         ← 개별 컴포넌트 소스 (40+개)
    │   ├── sidebar.tsx             ← 사이드바 기반 컴포넌트
    │   ├── card.tsx                ← 카드
    │   ├── table.tsx               ← 테이블
    │   ├── dialog.tsx              ← 모달
    │   ├── button.tsx              ← 버튼
    │   ├── input.tsx               ← 입력 필드
    │   ├── select.tsx              ← 셀렉트
    │   ├── badge.tsx               ← 배지/상태 표시
    │   ├── form.tsx                ← 폼 래퍼
    │   └── empty.tsx               ← 빈 상태 컴포넌트
    └── blocks/
        ├── login-01/ ~ login-05/   ← 로그인 화면 블록 5종
        ├── dashboard-01/           ← 대시보드 블록
        └── sidebar-01/ ~ sidebar-13/ ← 사이드바 레이아웃 블록 13종
```

### 페이지별 컴포넌트 매핑
| 화면 | React 페이지 | 주요 Shadcn 컴포넌트 | 레퍼런스 |
|---|---|---|---|
| 로그인 | `Login.tsx` | Card, Input, Button, Label | `blocks/login-01~05/` |
| 대시보드 | `Dashboard.tsx` | SidebarProvider, SectionCards, Card | `examples/dashboard/` |
| 검사 관리 | `TestManagement.tsx` | Card, Input, Button, Badge, custom modal/grid | `examples/tasks/`, `ui/dialog.tsx` |
| 내담자 관리 | `ClientManagement.tsx` | Card, Input, Button, Badge, custom modal/grid | `examples/tasks/` |
| 검사 상세 | `TestDetail.tsx` | Card, Input, Button, Badge | `ui/card.tsx`, `ui/form.tsx` |
| 내담자 상세 | `ClientDetail.tsx` | Card, Input, Button, Badge, assignment list | `ui/card.tsx` |
| 결과 조회 | `ClientResult.tsx` | Card, native table, Badge | - |

### 프로젝트 구조
```
frontend/
├── src/
│   ├── components/
│   │   ├── ui/           ← Shadcn 컴포넌트 (shadcn add로 설치)
│   │   ├── layout/       ← AppSidebar, SiteHeader, Layout
│   │   └── shared/       ← 공통 컴포넌트 (DataTable, StatusBadge 등)
│   ├── pages/            ← 페이지 컴포넌트
│   ├── api/              ← FastAPI 연동 fetch 함수 또는 향후 공통 API 클라이언트
│   ├── types/            ← TypeScript 타입 정의
│   └── main.tsx
├── index.html
├── vite.config.ts
└── package.json
```

### FastAPI 연동 방식
- 개발 중: Vite dev server(`localhost:5173`)에서 FastAPI(`localhost:8000`)로 proxy
- 운영: `frontend/dist/index.html`을 FastAPI page router가 `/`, `/admin`, `/admin/*`, `/assessment/custom/{token}`에서 서빙하고, `frontend/dist/assets`를 `/assets`로 mount한다.
- 기존 `/api/...` 엔드포인트는 변경 없이 그대로 사용

## Related Documents
- [Documentation Hub](/mnt/c/Users/user/workspace/2.0-modular/docs/README.md)
- [ARCHITECTURE.md](/mnt/c/Users/user/workspace/2.0-modular/ARCHITECTURE.md)
- [QUALIT_SCORE.md](/mnt/c/Users/user/workspace/2.0-modular/QUALIT_SCORE.md)
- [scripts/README_CAPTURE.md](/mnt/c/Users/user/workspace/2.0-modular/scripts/README_CAPTURE.md)
- [docs/features/README.md](/mnt/c/Users/user/workspace/2.0-modular/docs/features/README.md)
