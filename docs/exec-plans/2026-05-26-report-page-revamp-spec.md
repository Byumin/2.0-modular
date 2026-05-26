# Report Page Revamp — Design Specification
**Date:** 2026-05-26
**Target file:** `frontend/src/pages/report/ReportPage.tsx`
**Authored by:** ui-designer agent

---

## Scope Clarification

The linked exec-plan (`2026-05-26-report-page-revamp.md`) originally scoped out `AdminReportPage`. That decision is reversed here: both `/report/:id?token=...` (token mode) and `/admin/report/:id` (admin mode) share the same `ReportDashboard` component, which in turn renders `Header`, `Sidebar`, `OverviewPanel`, and `ProfileChart`. All four improvements apply to both routes simultaneously. Frontend-developer must not fork a separate implementation for the admin path.

---

## Color Convention Resolution

Before reading sections A–D, note that the current file has an inverted color convention between `ProfileChart` `ReferenceArea` fills (L312–314) and `T_ZONES` (L66–72):

| Range | T_ZONES bg | Current ReferenceArea fill | Correct semantic |
|-------|-----------|---------------------------|-----------------|
| 20–40 | blue tones | red (`#fee2e2`) | LOW — concern |
| 40–60 | slate | slate | AVERAGE — neutral |
| 60–80 | red tones | blue (`#dbeafe`) | HIGH — concern |

The semantic truth is: both extremes (very low and very high) signal concern; the midrange is neutral. `T_ZONES` already encodes this correctly. Section D mandates replacing the three `ReferenceArea` fills with values taken directly from `T_ZONES` so that the chart matches every other component on the page.

---

## A. Header

### A-1. Decision

Replace the single-row `divide-x` meta strip with a compact definition list. Each of the four fields (`name`, `gender`, `age_text`, `birth_day`) is rendered as a small vertical pair: a micro uppercase label on top, the value below. The four pairs sit in a horizontal `flex` row with a `gap-5` separation — no divider lines needed because the visual column structure is self-separating.

Field order (left to right): 이름 · 성별 · 나이 · 생년월일

Each field is individually conditional (`&&` guard), exactly as today. The grouping element changes from `flex items-center gap-0 divide-x` to `flex items-center gap-5`.

The test name stays on the left alongside the brand icon. Visual hierarchy: test name is `text-sm font-bold text-foreground`, date is `text-[11px] text-muted-foreground` — unchanged.

For narrow screens below `sm` breakpoint: the meta block remains `hidden sm:flex`, identical to today. No new breakpoint logic is added. The `print:hidden` class on the print button is preserved verbatim.

### A-2. Reasoning

The divide-x pattern conflates values from different semantic dimensions (identity vs. gender vs. age vs. date) into what reads as a single sentence. A definition-list layout assigns a micro-label to each datum so any reader, including someone who opened the report without knowing whose it is, immediately parses the structure. DESIGN.md mandates that color alone must not carry meaning, and text labels must accompany data; this directly applies.

Using `gap-5` instead of dividers avoids adding new visual elements while still providing adequate white-space separation at the narrow header height (`py-3`).

### A-3. Tailwind / markup example

```tsx
<div className="hidden sm:flex items-center gap-5 shrink-0">
  {data.profile.name && (
    <div className="flex flex-col items-start">
      <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/70">이름</span>
      <span className="text-xs font-semibold text-foreground leading-tight">{data.profile.name}</span>
    </div>
  )}
  {data.profile.gender && (
    <div className="flex flex-col items-start">
      <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/70">성별</span>
      <span className="text-xs text-muted-foreground leading-tight">{data.profile.gender}</span>
    </div>
  )}
  {data.profile.age_text && (
    <div className="flex flex-col items-start">
      <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/70">나이</span>
      <span className="text-xs text-muted-foreground leading-tight">{data.profile.age_text}</span>
    </div>
  )}
  {data.profile.birth_day && (
    <div className="flex flex-col items-start">
      <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/70">생년월일</span>
      <span className="text-xs text-muted-foreground leading-tight">{data.profile.birth_day}</span>
    </div>
  )}
</div>
```

The surrounding `<div className="flex items-center gap-4 shrink-0">` that wraps meta + print button is unchanged. The print button's `print:hidden` class is unchanged.

---

## B. Sidebar

### B-1. Decision: group header

Replace `text-[9px]` with `text-[10px]`. Keep `font-bold`, `uppercase`, `tracking-widest`, and the BRAND color `text-[#2d3580]`. Add `sticky top-0 z-10 bg-white` so the group header stays visible as the user scrolls within that group. The group count badge (`· N개`) changes from `text-muted-foreground/60` to `text-[10px] text-muted-foreground` for slightly higher legibility.

### B-2. Decision: active/highlight states

No change to the active color logic. The current three-state pattern (active = `bg-[#2d3580] text-white`, parent-of-active-facet = `bg-[#2d3580]/5 text-[#2d3580]`, default = text-foreground) is correct and should be preserved verbatim.

Add a left accent bar for the active scale item to reinforce the selection beyond color alone (DESIGN.md: color alone must not carry meaning). Achieved by adding `relative` to the scale button wrapper `<div>` and inserting an absolutely-positioned `<span>` as a 2px left bar when `isScaleActive` is true:

```tsx
// Inside the scale button's parent <div key={scaleId}>
{isScaleActive && (
  <span className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full" style={{ background: BRAND }} />
)}
```

The parent `<div key={scaleId}>` gains `relative` to contain the bar. Facet items do not get the bar; the category dot already differentiates them.

### B-3. Decision: sidebar widths

Keep `w-[240px]` expanded and `w-12` collapsed. These values already match the design intent and no data suggests a wider collapsed state would help.

### B-4. Decision: scroll behavior

The `<aside>` has `overflow-y-auto` today. This is correct. Add `scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent` if the Tailwind scrollbar plugin is already present in the project; if not, skip (no new dependency). Frontend-developer should check whether `@tailwindcss/scrollbar` or equivalent is configured before adding those classes.

### B-5. Decision: collapsed icon

The current `scale.code.slice(-2)` is fragile for codes like `PSY-A` (produces `-A`) or single-char codes. Replace with a numeric 1-based index within the full scale list:

```tsx
// Compute once before the map:
const scaleIndexMap = new Map(data.scales.map((s, i) => [scaleKey(s), i + 1]))

// Inside the collapsed nav map:
<span ...>{scaleIndexMap.get(scaleId) ?? "·"}</span>
```

This guarantees a stable 1–N label regardless of code format. The `title={scale.name}` tooltip is still present for hover identification.

### B-6. Tailwind class reference for modified elements

```
Group header wrapper: "px-3 pt-2 pb-1.5 flex items-center gap-1.5 sticky top-0 z-10 bg-white"
Group header text:    "text-[10px] font-bold text-[#2d3580] uppercase tracking-widest"
Group count badge:    "text-[10px] text-muted-foreground"
Scale button parent:  "relative" (added)
Active left bar:      "absolute left-0 top-1 bottom-1 w-0.5 rounded-full"
```

---

## C. MetricCard / OverviewPanel Summary Cards

### C-1. Decision: layout switch

Replace the single `flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory` row with a responsive grid that wraps:

- 1–3 scales: `grid grid-cols-1 sm:grid-cols-3 gap-4`
- 4 scales: `grid grid-cols-2 sm:grid-cols-4 gap-4`
- 5+ scales: `grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4` (wraps, no horizontal scroll)

The scale count is known at render time (`data.scales.length`). Compute the grid class with a small helper:

```tsx
function summaryGridClass(count: number): string {
  if (count <= 3) return "grid grid-cols-1 sm:grid-cols-3 gap-4"
  if (count === 4) return "grid grid-cols-2 sm:grid-cols-4 gap-4"
  return "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
}
```

Cards become `<button className="w-full text-left ...">` (no `shrink-0`, no fixed `w-[240px]`). This eliminates the overflow-x-auto entirely.

### C-2. Decision: card interior hierarchy

Current layout is: code + badge row / name / T score + percentile side-by-side / TScoreBar. This is good. Keep it. The only change is visual weight: the scale name becomes `text-sm font-semibold` (up from `text-xs font-semibold`) to read more prominently when the card has full column width.

### C-3. Decision: border-l-4 accent

Keep `border-l-4` with `cs.border`. It is the primary category signal and is part of the established design language for this page.

### C-4. Decision: hover effect

Current `hover:shadow-md` and `group-hover:text-[#2d3580]` on scale name are good. Add `hover:border-l-[#2d3580]` as a secondary transition cue for non-categorized cards (where `border-l-slate-200` applies by default):

```tsx
// Only for cards where !s.category:
"border-l-slate-200 bg-white hover:border-l-[#2d3580]/40"
```

Categorized cards already have a color accent so no change needed there.

### C-5. MetricCard component

`MetricCard` itself (used in `ScalePanel` and `FacetPanel` for the 3-column metric grid) does not change structure. The only update is ensuring `text-2xl font-bold` is preserved for the value, which it already is.

---

## D. ProfileChart

### D-1. Decision: ReferenceArea colors — fix the inversion

Replace the three hardcoded `ReferenceArea` fills with values from `T_ZONES`. The T_ZONES array defines five zones; group them into three visual bands matching the chart's existing three-area structure:

| Band | T range | T_ZONES bg to use | fillOpacity |
|------|---------|-------------------|-------------|
| Low concern | 20–40 | `T_ZONES[0].bg` (`#dbeafe`) for Very Low, `T_ZONES[1].bg` (`#eff6ff`) for Low — use the more saturated `#dbeafe` | 0.40 |
| Average | 40–60 | `T_ZONES[2].bg` (`#f1f5f9`) | 0.50 |
| High concern | 60–80 | `T_ZONES[4].bg` (`#fee2e2`) for Very High — use `#fee2e2` | 0.40 |

Concretely, replace L312–314 with:

```tsx
<ReferenceArea y1={20} y2={40} fill={T_ZONES[0].bg}  fillOpacity={0.40} />
<ReferenceArea y1={40} y2={60} fill={T_ZONES[2].bg}  fillOpacity={0.50} />
<ReferenceArea y1={60} y2={80} fill={T_ZONES[4].bg}  fillOpacity={0.40} />
```

The legend in `OverviewPanel` (L424–428) must be updated to match:

```tsx
<span className="flex items-center gap-1">
  <span className="inline-block w-3 h-2 rounded-sm" style={{ background: T_ZONES[0].bg }} />낮음 영역
</span>
<span className="flex items-center gap-1">
  <span className="inline-block w-3 h-2 rounded-sm" style={{ background: T_ZONES[2].bg }} />평균 영역
</span>
<span className="flex items-center gap-1">
  <span className="inline-block w-3 h-2 rounded-sm" style={{ background: T_ZONES[4].bg }} />높음 영역
</span>
```

### D-2. Decision: Tooltip enrichment

Current Tooltip shows only `T = {v}`. Widen the `items` prop of `ProfileChart` to carry the additional fields needed for the tooltip:

```ts
// New prop shape:
interface ProfileChartItem {
  name: string
  t_score: number | null
  category?: string | null
  percentile?: number | null
}
```

Both call sites must be updated:
- `OverviewPanel` L430: `data.scales.map((s) => ({ name: s.name, t_score: s.t_score, category: s.category, percentile: s.percentile }))`
- `ScalePanel` L557: `scale.facets.map((f) => ({ name: f.name, t_score: f.t_score, category: f.category, percentile: f.percentile }))`

Replace the recharts `<Tooltip>` with a custom content renderer:

```tsx
<Tooltip
  content={({ active, payload }) => {
    if (!active || !payload?.length) return null
    const item = payload[0].payload as ProfileChartItem
    if (item.t_score === null) return null
    const zone = tZoneLabel(item.t_score)
    const zoneEntry = T_ZONES.find((z) => item.t_score! >= z.from && item.t_score! < z.to)
      ?? T_ZONES[T_ZONES.length - 1]
    return (
      <div className="rounded-xl border border-border bg-white px-3 py-2.5 shadow-lg text-xs space-y-1" style={{ minWidth: 160 }}>
        <p className="font-semibold text-foreground leading-snug">{item.name}</p>
        <p className="text-muted-foreground">
          T점수: <span className="font-bold" style={{ color: BRAND }}>{item.t_score}</span>
          <span className="ml-1.5" style={{ color: zoneEntry.text }}>({zone})</span>
        </p>
        {item.percentile != null && (
          <p className="text-muted-foreground">백분위: {item.percentile}%ile</p>
        )}
        {item.category && (
          <p style={{ color: categoryStyle(item.category).value }}>{item.category}</p>
        )}
      </div>
    )
  }}
  cursor={{ stroke: "#e2e8f0", strokeWidth: 1 }}
/>
```

### D-3. Decision: click-to-navigate from chart points

The chart is rendered in two contexts: `OverviewPanel` (scales) and `ScalePanel` (facets). Navigation targets differ. Pass an optional `onItemClick` callback:

```ts
// ProfileChart updated signature:
function ProfileChart({
  items,
  onItemClick,
}: {
  items: ProfileChartItem[]
  onItemClick?: (index: number) => void
})
```

Inside `ProfileChart`, wire `activeDot` to a click handler:

```tsx
activeDot={{
  r: 9, strokeWidth: 2, stroke: "#fff",
  onClick: (_e: unknown, payload: { index?: number }) => {
    if (onItemClick && payload.index != null) onItemClick(payload.index)
  },
  style: { cursor: "pointer" },
}}
```

At the `OverviewPanel` call site, pass:

```tsx
onItemClick={(idx) => {
  const scale = data.scales.filter((s) => s.t_score !== null)[idx]
  if (scale) onNavigate({ type: "scale", id: scaleKey(scale) })
}}
```

Note: `ProfileChart` filters `items` to only those with non-null `t_score` (L277). The `idx` from recharts refers to position in the filtered `data` array (after padding). Because `padCount` leading phantom entries exist, subtract `padCount` from `payload.index` before looking up the scale:

```tsx
onItemClick={(rawIdx) => {
  const padCount = data.scales.filter(s => s.t_score !== null).length <= 2 ? 2
                 : data.scales.filter(s => s.t_score !== null).length <= 4 ? 1 : 0
  const realIdx = rawIdx - padCount
  const filtered = data.scales.filter(s => s.t_score !== null)
  const scale = filtered[realIdx]
  if (scale) onNavigate({ type: "scale", id: scaleKey(scale) })
}}
```

At the `ScalePanel` call site (facets chart), omit `onItemClick` — facet panel navigation is not in scope for click-through.

### D-4. Decision: X-axis label wrapping

Long Korean scale names (e.g. "사회적 불안" or "부모-자녀 관계") overflow the tick area at the default `fontSize: 12`. Set `tick={{ fontSize: 11, fill: "#374151", fontWeight: 500 }}` and add `angle={-30} textAnchor="end" height={56}` to the `XAxis` when `data.length > 5`:

```tsx
const needsRotation = data.length > 5
<XAxis
  dataKey="name"
  tick={{ fontSize: needsRotation ? 10 : 11, fill: "#374151", fontWeight: 500 }}
  tickFormatter={(v: string) => v.startsWith("__") ? "" : v}
  tickLine={false} axisLine={false}
  interval={0}
  angle={needsRotation ? -25 : 0}
  textAnchor={needsRotation ? "end" : "middle"}
  height={needsRotation ? 52 : 30}
/>
```

`needsRotation` is computed from the post-filter, pre-padding `data` array length inside `ProfileChart`.

### D-5. Decision: null / empty state

The existing guard (`if (data.length === 0) return ...`) is adequate. No change.

### D-6. Decision: line color

Keep the single BRAND-color line. Per-point categorical coloring would require a custom `dot` render function that introduces significant complexity; the tooltip already surfaces category information on hover.

---

## E. Loading / Error / Empty States

The existing loading spinner (spinning border circle + text) and error card (red `!` circle + message) are functional and consistent with the design system. No visual change is needed.

One note for the frontend-developer: the loading skeleton is currently a full-height spinner, not a skeleton layout. If a future spec calls for skeleton cards, the structure would need `ReportDashboard` to receive a `loading` prop; that is out of scope here.

The `isReportData` guard at L1029 is sufficient. No change.

---

## F. Component Separation

All four modified components (`Header`, `Sidebar`, `MetricCard`/`OverviewPanel`, `ProfileChart`) remain inside `frontend/src/pages/report/ReportPage.tsx`. Extracting them to `frontend/src/components/report/` would require updating both the report page imports and any future admin page imports; there is no reuse case yet that justifies the split. The file is already 1040 lines and the additions from this spec add roughly 60–80 lines — well within manageable range.

If the file grows past ~1300 lines after this work, frontend-developer may extract `ProfileChart` and `TScoreBar` as a follow-up (they have no page-level state dependencies), but that is not required now.

---

## G. Verification Checklist

Frontend-developer must check each item before marking implementation done:

1. **Header meta labels visible**: Open the token report URL. The header shows four small uppercase labels (이름/성별/나이/생년월일) each directly above its value. No single-sentence run-on reading.

2. **Header print button intact**: The `print:hidden` class and `window.print()` call on the button are present. Running `grep "print:hidden" frontend/src/pages/report/ReportPage.tsx` returns the button line.

3. **Sidebar group headers sticky on scroll**: With enough scales to require scrolling, the test group header label (e.g. "KPSI4-SF") stays visible at the top of its group while scrolling through facets below.

4. **Sidebar active bar visible**: Clicking any scale in the sidebar shows a 2px left accent bar on that item in addition to the `bg-[#2d3580]` background.

5. **Sidebar collapsed index labels correct**: With the sidebar collapsed, each scale button shows a 1-based integer. No `-A` or other code-derived artifact appears.

6. **Summary cards wrap instead of scroll**: With 6+ scales, the overview summary cards fill a 2- or 3-column grid and no horizontal scrollbar appears on the card row. With 3 scales, cards fill a single row at `sm:grid-cols-3`.

7. **Chart zone colors consistent**: The ProfileChart background shading for T 20–40 is blue-tinted (same family as `T_ZONES[0].bg`), and T 60–80 is red-tinted (same family as `T_ZONES[4].bg`). The chart legend labels and colors match the shading.

8. **Chart tooltip shows enriched data**: Hovering a data point on the T-score profile chart shows scale name, T score with zone label, percentile if present, and category if present.

9. **Chart click navigates**: Clicking a data point in `OverviewPanel`'s chart navigates to that scale's panel. Clicking a data point in `ScalePanel`'s facet chart does nothing (no crash, no navigation).

10. **AdminReportPage unchanged in behavior**: Visiting `/admin/report/:id` with a valid admin session renders identically to the token report (same improvements visible). No separate code path exists for admin vs. token rendering of these components.

11. **Build passes**: `npm --prefix frontend run build` exits 0 with no TypeScript errors. The prop shape change on `ProfileChart` (`items: ProfileChartItem[]`) must not break either call site.

12. **No new dependencies**: `package.json` in `frontend/` shows no new entries under `dependencies` or `devDependencies`.
