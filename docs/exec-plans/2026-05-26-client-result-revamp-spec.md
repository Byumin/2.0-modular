# ClientResult 개선 상세 명세

- 대상 파일: `frontend/src/pages/ClientResult.tsx`
- 신규 컴포넌트(선택): `frontend/src/components/result/`
- 부모 실행계획: `2026-05-26-client-result-revamp.md`
- 작성일: 2026-05-26
- 구현 담당: frontend-developer 서브에이전트

---

## A. 정보 아키텍처(IA) 변경

### 결정사항

페이지를 4개의 명확한 수직 레이어로 재구성한다.

```
[1] 헤더 영역       — 뒤로 가기 / 이름+메타 / 리포트 버튼
[2] 요약 스트립     — 검사 수 / 최근 검사일 / 평균 T점수 / 주의 척도 수
[3] 필터 바        — 검사명 필터 chip / 정렬 select / 빈 결과 숨김 toggle
[4] 검사 그룹 카드  — 접기/펴기 가능, 척도 테이블 포함
```

#### 헤더 영역

- 좌: `Button variant="ghost" size="icon"` 뒤로가기(IconArrowLeft) + `<h2 className="text-xl font-semibold">` + 메타 한 줄
- 헤더 타이틀 텍스트: `summary?.name ? \`${summary.name} — 검사 결과\` : "검사 결과"` (E절 버그 수정 참조)
- 우: 리포트 버튼들 (`ml-auto flex items-center gap-2`)
- 헤더를 `flex items-start gap-3`으로 감싸고, 뒤로가기 버튼은 `mt-0.5` 정도로 제목 기준선에 맞춘다.
- 메타 행: 성별 한국어 + birth_day + 나이 — 모두 `text-xs text-muted-foreground`

#### 요약 스트립

카드 컴포넌트를 사용하지 않는다. Card-in-card 중첩을 피하기 위해(DESIGN.md 8.Surfaces) 평탄한 `div`로 구성한다.

4개 항목: 검사 수 / 최근 검사일 / 평균 T점수 / 주의 척도 수

- "주의 척도 수"는 `level`이 "높음" 또는 "high"를 포함하는 ScaleScore의 총합.
- "평균 T점수"는 전체 검사 그룹에서 `t_score !== null`인 척도의 평균, 소수점 1자리 반올림. 데이터 없을 경우 `—` 표시.
- "최근 검사일"은 `assessed_on` 중 가장 최신 날짜를 `toLocaleDateString("ko-KR")` 변환.

레이아웃:

```tsx
<div className="grid grid-cols-2 sm:grid-cols-4 gap-4 rounded-xl border bg-muted/40 px-6 py-4">
  {/* 각 항목 */}
  <div className="flex flex-col gap-0.5">
    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">검사 수</span>
    <span className="text-xl font-semibold tabular-nums">{totalTests}</span>
  </div>
  {/* 반복 */}
</div>
```

이유: DESIGN.md 3.Typography — micro label에서만 `tracking-wider` 허용. 스트립은 카드 위의 독립 strip이므로 `bg-muted/40`으로 페이지 배경과 구분하되 카드 shadow는 쓰지 않는다.

#### 필터 바

스트립 바로 아래, 카드 목록 위에 `flex flex-wrap items-center gap-2` div로 배치. sticky 아님.

항목 3가지:

1. **검사명 필터 chip**: 고유 test_name 목록을 chip으로 렌더. 선택된 chip은 `bg-primary text-primary-foreground rounded-md px-3 py-1 text-xs font-medium`, 비선택은 `border bg-background hover:bg-accent rounded-md px-3 py-1 text-xs font-medium`. "전체" chip 하나를 항상 첫 번째로 배치.
2. **정렬 select**: `<select className="h-8 rounded-md border bg-background px-2 text-xs font-medium">` — 옵션: "최신순 (기본)", "이름순". 기본값 최신순.
3. **빈 결과 숨김 toggle**: `<label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer"><input type="checkbox" className="rounded" /> 빈 결과 숨기기</label>`

필터/정렬 상태는 `React.useState`로 로컬 관리. URL 파라미터 직렬화 불필요.

이유: DESIGN.md 10.Admin UX — "모든 리스트 화면은 검색/필터 → 결과 리스트 → row action 흐름이 즉시 보여야 한다."

#### 검사 그룹 카드 접기/펴기

- 카드 헤더 우측에 `Button variant="ghost" size="icon" className="size-7"` + `IconChevronDown` (펼침) / `IconChevronUp` (접힘).
- 접힌 상태: `CardContent`를 렌더하지 않거나 `hidden`으로 처리. `CardContent className={collapsed ? "hidden" : "pt-0"}`.
- 초기 상태: 모든 카드 펼침.
- 접기 버튼에는 `aria-label={collapsed ? "검사 결과 펼치기" : "검사 결과 접기"}` 추가.
- `IconChevronDown`/`IconChevronUp`은 Tabler Icons에서 그대로 사용 (같은 의미 action에 다른 아이콘 혼용 금지, DESIGN.md 12.Icons).

---

## B. T점수 막대 디자인

### 결정사항

T점수 열의 숫자 오른쪽에 인라인 막대를 삽입한다. 백분위는 막대 없이 텍스트만 유지한다.

**이유**: 두 지표 모두 막대로 표현하면 시각적 과밀이 발생한다(요청 지문 명시). 백분위는 T점수와 높은 상관을 보이므로 T점수 막대 하나로 충분하다.

#### 막대 구조 (ScaleBar 컴포넌트)

T점수 셀을 기존 `text-right` 단일 값에서 아래 구조로 교체:

```tsx
<td className="py-2.5 px-4">
  <div className="flex items-center justify-end gap-2">
    <span className="tabular-nums text-sm w-8 text-right">{s.t_score ?? "—"}</span>
    {s.t_score !== null && (
      <div className="w-20 h-1.5 rounded-full bg-muted relative shrink-0" aria-hidden="true">
        {/* 50 기준 마커 */}
        <div className="absolute top-0 bottom-0 left-1/2 w-px bg-border" />
        {/* 채움 막대 */}
        <div
          className={`absolute top-0 bottom-0 left-0 rounded-full ${tScoreBarColor(s.t_score)}`}
          style={{ width: `${tScoreToPercent(s.t_score)}%` }}
        />
      </div>
    )}
  </div>
</td>
```

**행 높이를 흔들지 않는 방법**: 막대 래퍼 `h-1.5`로 고정, `relative`/`absolute` fill로 처리 (DESIGN.md 9.Tables — "액션 버튼은 row 높이를 흔들지 않아야 한다"). 막대가 `inline-flex` row 안에서 `shrink-0`으로 고정폭 유지.

#### tScoreToPercent 함수

T점수 범위를 20~80으로 고정하고 선형 매핑:

```ts
function tScoreToPercent(t: number): number {
  const min = 20, max = 80
  return Math.min(100, Math.max(0, ((t - min) / (max - min)) * 100))
}
```

50점은 정확히 50% 위치. 범위 내 대부분의 임상 분포(41–68)를 트랙 중앙에 자연스럽게 표현한다.

#### 색상 매핑 (tScoreBarColor)

기존 `levelVariant` 함수의 Badge 색상 체계와 일치시킨다. Badge와 막대가 같은 행에서 다른 의미를 내는 것을 방지.

| T점수 범위 | 의미 | 막대 Tailwind 클래스 |
|---|---|---|
| `< 40` | 낮음 | `bg-muted-foreground/50` |
| `40 ~ 59` | 보통(정상) | `bg-primary/70` |
| `≥ 60` | 높음/주의 | `bg-destructive/80` |

```ts
function tScoreBarColor(t: number): string {
  if (t >= 60) return "bg-destructive/80"
  if (t >= 40) return "bg-primary/70"
  return "bg-muted-foreground/50"
}
```

이유: `levelVariant`에서 높음 → `destructive`, 보통 → `success`, 낮음 → `outline`. 막대는 success 대신 `primary/70`을 쓴다 — success green과 primary blue가 같은 행에서 충돌하지 않도록, 그리고 관리자 화면 primary blue 단일 accent 원칙(DESIGN.md 5.Color Usage)을 따른다. 낮음은 두드러질 필요가 없으므로 muted 처리.

#### 접근성

`aria-hidden="true"`로 막대 div를 스크린리더에서 숨긴다. 수준 정보는 같은 행의 `level` Badge 텍스트로 전달된다 (색상만으로 의미 전달 금지, DESIGN.md 14.Accessibility). T점수 숫자 자체도 셀에 남아 있으므로 정보 손실 없음.

---

## C. 카드/그룹 디자인

### 결정사항

#### 카드 헤더 레이아웃

```
[좌] 검사명(text-sm font-semibold) + 검사 종류 chip(선택)
[우] 상태 Badge + 검사일 Badge + 접기 버튼 + 리포트 버튼
```

- 검사명: 현재 `text-sm font-medium` → `text-sm font-semibold`로 강화해 섹션 제목 역할 명확히.
- 검사 종류 chip: `reportLinksFor(test_name)` 결과가 있을 때만 `Badge variant="secondary" className="text-xs"` 형태로 검사명 바로 오른쪽에 표시. "GOLDEN", "STS" 등 종류 식별용. 버튼이 아니라 정보 chip.
- 상태 Badge: 기존 로직 유지 (`scales.length ? "success" : "warning"`). 현재 레이블 "결과 준비" / "채점 대기" 유지.
- 검사일 Badge: `variant="secondary"` — 기존과 동일.
- 리포트 버튼: `Button variant="ghost" size="sm"` + `IconFileDescription size-4` — 카드 헤더 우측 끝. 종류(GOLDEN/STS 등)가 없으면 렌더하지 않음.
- 접기 버튼: 리포트 버튼 왼쪽, `Button variant="ghost" size="icon" className="size-7"`.

헤더 우측 `flex items-center gap-1.5`:

```tsx
<div className="flex items-center gap-1.5 flex-wrap justify-end">
  <Badge variant={group.scales.length ? "success" : "warning"} className="text-xs">
    {group.scales.length ? "결과 준비" : "채점 대기"}
  </Badge>
  {group.assessed_on && (
    <Badge variant="secondary" className="text-xs">
      {new Date(group.assessed_on).toLocaleDateString("ko-KR")}
    </Badge>
  )}
  <Button variant="ghost" size="icon" className="size-7" onClick={() => toggleCollapse(gi)}
    aria-label={collapsed[gi] ? "검사 결과 펼치기" : "검사 결과 접기"}>
    {collapsed[gi] ? <IconChevronDown className="size-4" /> : <IconChevronUp className="size-4" />}
  </Button>
  {id && reportLinksFor(group.test_name).map((report) => (
    <Button key={report} variant="ghost" size="sm" asChild className="h-7 px-2 text-xs">
      <Link to={`/admin/artifact-viewer?report=${report}&id=${encodeURIComponent(id)}`}>
        <IconFileDescription className="size-4" />
        {report}
      </Link>
    </Button>
  ))}
</div>
```

#### 빈 척도 카드 (채점 대기) 표시

현재: 단순 `<p>척도 데이터가 없습니다.</p>`.

개선: 테이블 래퍼와 동일한 padding 구역에 구별되는 빈 상태 블록 배치.

```tsx
<div className="rounded-lg border border-dashed bg-muted/30 px-4 py-6 flex flex-col items-center gap-1.5">
  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">채점 대기</span>
  <span className="text-xs text-muted-foreground">척도 점수가 아직 산출되지 않았습니다.</span>
</div>
```

이유: dashed border로 "미완성/대기" 상태를 solid border 카드와 시각적으로 구분. 색상만으로 구분하지 않고 텍스트 레이블 병기 (DESIGN.md 14.Accessibility). 카드 안 카드 추가 중첩 없이 단순 div.

#### 카드 간 spacing

기존 `gap-6` 유지. DESIGN.md 7.Spacing — 관리자 화면 `gap-3`~`gap-6` 범위.

---

## D. 인쇄 포맷 (`@media print`)

### 결정사항

#### 숨길 요소

사이드바/네비게이션은 `ClientResult.tsx` 수정 범위 밖(AppSidebar는 layout 레벨)이므로 직접 숨김 처리 범위에서 제외한다. 인쇄 시 브라우저 기본 Ctrl+P에서 사이드바가 보이는 것은 허용된 제약으로 명세에 기록한다.

`ClientResult.tsx` 내에서 print 시 숨길 요소:

- 뒤로가기 버튼: `print:hidden`
- 필터 바 전체 div: `print:hidden`
- 카드 접기/펴기 버튼: `print:hidden`
- 리포트 링크 버튼 (카드 헤더): `print:hidden`
- T점수 막대(시각화 div): `print:hidden` — 인쇄에서 색상 재현이 불안정하므로 숫자만 출력
- 요약 스트립 bg: `print:bg-transparent print:border-none`

#### 카드 페이지 분할

```tsx
<Card className="... print:[break-inside:avoid] print:[page-break-inside:avoid]">
```

Tailwind v4에서 `break-inside-avoid` 유틸리티가 없는 경우를 위해 arbitrary value 형태 사용.

#### 인쇄 색상 보정

```tsx
{/* 카드 컨테이너 */}
<div className="... print:[print-color-adjust:exact] print:[-webkit-print-color-adjust:exact]">
```

이유: `bg-muted/40`, `bg-primary/70` 같은 낮은 불투명도 토큰은 인쇄에서 흐리게 나올 수 있다. `print-color-adjust:exact`로 CSS 배경색을 강제 출력. 단, T점수 막대는 어차피 `print:hidden` 처리이므로 영향 범위는 Badge, 스트립 배경 등.

#### 인쇄 머리글

`@media print` 전용 div를 페이지 최상단에 배치 (화면에서는 hidden):

```tsx
<div className="hidden print:block mb-4 pb-3 border-b">
  <div className="text-sm font-semibold">{summary?.name ?? "검사 결과"}</div>
  <div className="text-xs text-muted-foreground">
    출력일시: {new Date().toLocaleString("ko-KR")}
  </div>
</div>
```

#### A4 권장

`ClientResult.tsx`의 루트 컨테이너에 `print:max-w-[720px] print:mx-auto print:px-6`를 추가해 A4 폭(210mm, 약 794px) 기준에 맞는 콘텐츠 폭 확보. 현재 `p-6`은 화면 전용이므로 인쇄에서 `print:p-0`으로 제거하고 카드 패딩으로 여백 관리.

---

## E. 로딩/에러/빈 상태

### 결정사항

#### 헤더 undefined 버그 수정

**현재 코드**: `summary ? \`${summary.name} — 검사 결과\` : "검사 결과"`

**문제**: `summary` 객체 자체는 fetch 후 set되지만 `item.name`이 `undefined`일 경우 `"undefined — 검사 결과"`로 렌더.

**수정**: `summary?.name ? \`${summary.name} — 검사 결과\` : "검사 결과"` — 객체 존재 여부가 아니라 name 값 존재 여부로 조건 변경.

동일한 원칙을 메타 행에도 적용:
- `summary.gender` → truthy check 후 표시 (`summary?.gender &&`)
- `summary.birth_day` → `summary?.birth_day &&`
- `summary.age != null` → 이미 null 체크 있으나 `summary?.age != null`으로 optional chaining 추가

#### 로딩 스켈레톤

현재: `<div>불러오는 중...</div>` 텍스트.

개선: 헤더 영역 스켈레톤 + 카드 3개 스켈레톤 라인. 새 npm 의존성 없이 Tailwind `animate-pulse`로 구현.

```tsx
{loading && (
  <div className="flex flex-col gap-6">
    {/* 헤더 스켈레톤 */}
    <div className="flex items-center gap-3">
      <div className="size-8 rounded-md bg-muted animate-pulse" />
      <div className="flex flex-col gap-1.5">
        <div className="h-5 w-48 rounded bg-muted animate-pulse" />
        <div className="h-3 w-32 rounded bg-muted animate-pulse" />
      </div>
    </div>
    {/* 스트립 스켈레톤 */}
    <div className="h-16 rounded-xl bg-muted animate-pulse" />
    {/* 카드 스켈레톤 x2 */}
    {[0, 1].map((i) => (
      <div key={i} className="rounded-xl border bg-card px-6 py-6 flex flex-col gap-3">
        <div className="h-4 w-40 rounded bg-muted animate-pulse" />
        {[0, 1, 2, 3].map((j) => (
          <div key={j} className="h-3 w-full rounded bg-muted/60 animate-pulse" />
        ))}
      </div>
    ))}
  </div>
)}
```

이유: DESIGN.md 10.Loading And Empty States — "로딩 중에는 버튼 disabled 또는 loading text". 스켈레톤은 레이아웃 시프트 없이 콘텐츠 구조를 미리 보여 주므로 단순 텍스트보다 개선.

로딩 중에는 헤더(뒤로가기+제목+메타)도 로딩 상태이므로 `loading` 조건일 때 제목 영역을 스켈레톤으로 대체한다. 즉, 전체 return을 `loading ? <스켈레톤> : <실제 콘텐츠>` 분기로 처리하거나, 아니면 헤더만 분리해 `summary` null일 때는 스켈레톤으로, not null일 때는 실제 텍스트로 교체한다. 후자 권장 — 뒤로가기 버튼은 loading 중에도 표시 유지.

#### 검사 결과 0개 빈 상태

현재: 단순 `<div>검사 결과가 없습니다.</div>`.

개선:

```tsx
<div className="rounded-xl border bg-muted/30 flex flex-col items-center gap-2 py-16 px-6 text-center">
  <IconClipboardList className="size-8 text-muted-foreground" />
  <p className="text-sm font-medium">등록된 검사 결과가 없습니다</p>
  <p className="text-xs text-muted-foreground">검사 배정 후 수검자가 응답을 제출하면 결과가 표시됩니다.</p>
</div>
```

이유: DESIGN.md 10.Loading And Empty States — "empty state는 원인과 다음 액션을 짧게 알려준다." `IconClipboardList`는 DESIGN.md 12.Icons에 등록된 Tabler Icon.

---

## F. 반응형

### 결정사항

**Admin은 Desktop first** (DESIGN.md 13.Responsive). 좁은 화면(`< 768px`) 처리:

#### 척도 테이블 좁은 화면 처리

- 현재 테이블은 `overflow-x-auto` 래퍼 안에 있음 — 유지.
- T점수 막대 셀: 막대 컬럼이 수평 스크롤을 유발하지 않도록 `<768px`에서 막대만 숨김.

```tsx
{/* 막대 래퍼 */}
<div className="hidden sm:flex items-center gap-2">
  {/* 막대 */}
</div>
<span className="tabular-nums text-sm sm:hidden">{s.t_score ?? "—"}</span>
```

즉, `sm:` 이상에서는 숫자+막대 통합 셀, `< sm`에서는 숫자만 표시.

- 원점수/백분위 열: 모바일에서 숨겨도 핵심 정보 손실이 적다. `hidden sm:table-cell`를 `<th>`, `<td>` 쌍에 적용 권장.

```tsx
<th className="hidden sm:table-cell text-right py-2 px-4 font-medium">원점수</th>
<th className="hidden sm:table-cell text-right py-2 px-4 font-medium">백분위</th>
```

- 척도명과 T점수(숫자), 수준 Badge는 항상 표시.

#### 요약 스트립

`grid grid-cols-2 sm:grid-cols-4` — 모바일에서는 2열, `sm` 이상에서 4열.

#### 필터 바

`flex flex-wrap` — 좁은 화면에서 chip이 자동 줄바꿈. 구체적 min-width 없음.

---

## G. 컴포넌트 분리 권장안

### 결정사항

3개 파일로 분리한다. 과도한 추상화를 막기 위해 이 이상 늘리지 않는다.

#### 1. `frontend/src/components/result/ScaleBar.tsx`

역할: T점수 막대 단위 컴포넌트.

```tsx
interface ScaleBarProps {
  tScore: number
}
export function ScaleBar({ tScore }: ScaleBarProps): React.ReactElement
```

`tScoreToPercent`, `tScoreBarColor` 헬퍼를 이 파일 내에 정의. `ClientResult.tsx`가 import해서 사용.

#### 2. `frontend/src/components/result/TestResultCard.tsx`

역할: 검사 그룹 단위 카드 1개. 접기 상태, 척도 테이블, 빈 상태 포함.

```tsx
interface TestResultCardProps {
  group: TestResultGroup
  clientId: string
  collapsed: boolean
  onToggleCollapse: () => void
}
export function TestResultCard(props: TestResultCardProps): React.ReactElement
```

`ScaleBar`를 import. 카드 전체 JSX + 인쇄 클래스 포함.

#### 3. `frontend/src/components/result/ResultSummaryStrip.tsx`

역할: 요약 스트립 4항목 표시.

```tsx
interface ResultSummaryStripProps {
  totalTests: number
  latestDate: string | null   // 이미 포맷된 문자열 또는 null
  avgTScore: number | null
  warningScaleCount: number
}
export function ResultSummaryStrip(props: ResultSummaryStripProps): React.ReactElement
```

파생 계산(totalTests, latestDate, avgTScore, warningScaleCount)은 `ClientResult.tsx`에서 수행 후 props로 전달. 컴포넌트는 렌더 전용.

#### `ClientResult.tsx` 역할 (분리 후)

- API fetch + state 관리
- 필터/정렬 상태 관리
- 파생값 계산 (스트립용)
- 접기 상태 배열 관리 (`const [collapsed, setCollapsed] = React.useState<boolean[]>([])`)
- 3개 컴포넌트 조합 렌더

---

## H. 검증 체크리스트

frontend-developer가 구현 완료 후 아래 항목을 순서대로 직접 확인한다.

1. **헤더 버그**: `item.name`이 없는 fixture로 테스트 시 제목이 "검사 결과"로 표시되고 "undefined — 검사 결과"가 나타나지 않는가.

2. **로딩 중 안전성**: 네트워크 지연을 시뮬레이션(DevTools 네트워크 throttle)했을 때 헤더가 스켈레톤으로 표시되고 "undefined" 텍스트가 깜빡이지 않는가.

3. **막대 행 높이 불변**: T점수 데이터가 있는 행과 없는 행(`t_score: null`)의 행 높이가 동일한가. 막대 유무로 행이 흔들리지 않는가.

4. **수준 Badge ↔ 막대 색상 일치**: 같은 척도 행에서 "높음" Badge(destructive)와 막대 색상이 `bg-destructive/80`으로 일치하는가. "보통" Badge(success)와 막대는 `bg-primary/70`인가.

5. **빈 척도 카드 구별**: `scale_scores`가 비어 있는 검사 그룹 카드가 dashed border + "채점 대기" 텍스트로 결과 있는 카드와 시각적으로 구별되는가.

6. **인쇄 미리보기**: 브라우저 Ctrl+P 인쇄 미리보기에서 (a) 필터 바가 보이지 않는가, (b) 접기/리포트 버튼이 보이지 않는가, (c) 인쇄 머리글(내담자 이름 + 출력 일시)이 표시되는가, (d) 카드가 페이지 경계에서 잘리지 않는가.

7. **필터/정렬 동작**: 검사명 chip 선택 시 해당 이름의 카드만 표시되는가. "빈 결과 숨기기" 체크 시 `scale_scores`가 빈 카드가 사라지는가. 정렬 "이름순" 선택 시 test_name 가나다/알파벳 순으로 재정렬되는가.

8. **새 의존성 없음**: `package.json`의 `dependencies`/`devDependencies`에 이번 작업 전 대비 추가된 항목이 없는가.
