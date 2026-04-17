import * as React from "react"
import { useParams, useSearchParams } from "react-router-dom"
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  ReferenceLine, ReferenceArea, ResponsiveContainer,
  Tooltip,
} from "recharts"

// ── 타입 ─────────────────────────────────────────────────────────────────────

interface FacetRow {
  code: string
  name: string
  raw_score: number | null
  t_score: number | null
  percentile: number | null
  category: string | null
  interpretation: string
}

interface ScaleRow {
  code: string
  name: string
  raw_score: number | null
  t_score: number | null
  percentile: number | null
  category: string | null
  interpretation: string
  answered_item_count: number | null
  expected_item_count: number | null
  facets: FacetRow[]
}

interface ReportProfile {
  name: string
  gender: string
  birth_day: string
  age_text: string
}

interface ReportData {
  submission_id: number
  test_name: string
  test_date: string
  profile: ReportProfile
  scales: ScaleRow[]
  error?: string
}

type NavNode =
  | { type: "overview" }
  | { type: "scale"; code: string }
  | { type: "facet"; scaleCode: string; facetCode: string }

// ── 상수 ─────────────────────────────────────────────────────────────────────

const T_MIN = 20
const T_MAX = 80
const BRAND = "#2d3580"

const T_ZONES = [
  { label: "Very Low",  from: 20, to: 30, bg: "#dbeafe", text: "#1d4ed8" },
  { label: "Low",       from: 30, to: 40, bg: "#eff6ff", text: "#3b82f6" },
  { label: "Average",   from: 40, to: 60, bg: "#f1f5f9", text: "#64748b" },
  { label: "High",      from: 60, to: 70, bg: "#fef2f2", text: "#ef4444" },
  { label: "Very High", from: 70, to: 80, bg: "#fee2e2", text: "#dc2626" },
]

// ── 유틸 ─────────────────────────────────────────────────────────────────────

type CategoryStyle = {
  badge: string
  dot: string
  card: string        // 카드 배경 tint
  border: string      // 카드 왼쪽 accent border
  value: string       // 숫자 강조 색상
  label: string       // 뱃지용 border
}

function categoryStyle(c: string | null): CategoryStyle {
  if (c === "낮음") return {
    badge:  "bg-red-50   text-red-700   ring-1 ring-red-200",
    dot:    "bg-red-500",
    card:   "bg-red-50/40",
    border: "border-l-red-400",
    value:  "text-red-700",
    label:  "border-red-200",
  }
  if (c === "높음") return {
    badge:  "bg-blue-50  text-blue-700  ring-1 ring-blue-200",
    dot:    "bg-blue-500",
    card:   "bg-blue-50/40",
    border: "border-l-blue-400",
    value:  "text-blue-700",
    label:  "border-blue-200",
  }
  return {
    badge:  "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    dot:    "bg-emerald-500",
    card:   "bg-emerald-50/20",
    border: "border-l-emerald-400",
    value:  "text-emerald-700",
    label:  "border-emerald-200",
  }
}

function tPosPercent(t: number) {
  return Math.min(100, Math.max(0, ((t - T_MIN) / (T_MAX - T_MIN)) * 100))
}

function navEqual(a: NavNode, b: NavNode) {
  if (a.type !== b.type) return false
  if (a.type === "scale"  && b.type === "scale")  return a.code === b.code
  if (a.type === "facet"  && b.type === "facet")
    return a.scaleCode === b.scaleCode && a.facetCode === b.facetCode
  return true
}

function tZoneLabel(t: number | null): string {
  if (t === null) return "—"
  if (t < 30)  return "Very Low"
  if (t < 40)  return "Low"
  if (t <= 60) return "Average"
  if (t <= 70) return "High"
  return "Very High"
}

// ── 메트릭 카드 ───────────────────────────────────────────────────────────────

function MetricCard({
  label, value, sub, category,
}: {
  label: string
  value: React.ReactNode
  sub?: string
  category?: string | null
}) {
  const cs = categoryStyle(category ?? null)
  const hasCategory = !!category
  return (
    <div className={`rounded-xl border border-l-4 ${hasCategory ? cs.border + " " + cs.card : "border-l-slate-200 bg-white"} border-border px-4 py-3.5 shadow-sm`}>
      <p className="text-[11px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold leading-none ${hasCategory ? cs.value : "text-foreground"}`}>
        {value ?? "—"}
      </p>
      {sub && <p className="text-[10px] text-muted-foreground mt-1.5">{sub}</p>}
    </div>
  )
}

// ── T점수 수평 바 ─────────────────────────────────────────────────────────────

function TScoreBar({ tScore, compact = false }: { tScore: number | null; compact?: boolean }) {
  if (tScore === null) return (
    <div className={`${compact ? "h-3" : "h-5"} rounded bg-muted/40 flex items-center pl-2`}>
      <span className="text-[9px] text-muted-foreground">점수 없음</span>
    </div>
  )
  const pos = tPosPercent(tScore)
  const zone = tZoneLabel(tScore)

  if (compact) {
    return (
      <div className="mt-2">
        <div className="relative h-3 flex rounded-md overflow-visible">
          {T_ZONES.map((z) => (
            <div
              key={z.label}
              className="h-full first:rounded-l-md last:rounded-r-md"
              style={{ width: `${((z.to - z.from) / (T_MAX - T_MIN)) * 100}%`, background: z.bg }}
            />
          ))}
          <div
            className="absolute -top-0.5 -bottom-0.5 w-2.5 h-4 rounded-full border-2 border-white shadow-md -translate-x-1/2 z-10"
            style={{ left: `${pos}%`, background: BRAND }}
          />
        </div>
        <div className="flex justify-between text-[9px] text-muted-foreground mt-1 px-0.5">
          <span>20</span><span>40</span><span>50</span><span>60</span><span>80</span>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-4">
      {/* zone labels */}
      <div className="flex text-[10px] text-muted-foreground mb-1.5">
        {T_ZONES.map((z) => (
          <div
            key={z.label}
            className="text-center font-medium"
            style={{ width: `${((z.to - z.from) / (T_MAX - T_MIN)) * 100}%`, color: z.text }}
          >
            {z.label}
          </div>
        ))}
      </div>
      {/* colored band */}
      <div className="relative h-6 flex rounded-lg overflow-visible">
        {T_ZONES.map((z) => (
          <div
            key={z.label}
            className="h-full first:rounded-l-lg last:rounded-r-lg"
            style={{ width: `${((z.to - z.from) / (T_MAX - T_MIN)) * 100}%`, background: z.bg }}
          />
        ))}
        {/* marker: prominent circle */}
        <div
          className="absolute -top-1 bottom-auto w-4 h-8 flex items-center justify-center -translate-x-1/2 z-10"
          style={{ left: `${pos}%` }}
        >
          <div
            className="w-4 h-4 rounded-full border-2 border-white shadow-lg"
            style={{ background: BRAND }}
          />
        </div>
      </div>
      {/* tick labels */}
      <div className="flex justify-between text-[10px] text-muted-foreground mt-2 px-0.5">
        <span>20</span><span>30</span><span>40</span><span>50</span><span>60</span><span>70</span><span>80</span>
      </div>
      {/* current zone indicator */}
      <div className="mt-2 text-center">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
          현재 위치:
          <span className="font-semibold" style={{ color: BRAND }}>T = {tScore}</span>
          <span className="text-muted-foreground">({zone})</span>
        </span>
      </div>
    </div>
  )
}

// ── 프로파일 라인차트 ─────────────────────────────────────────────────────────

// 척도 수에 따라 차트 최소 폭 계산 (항목당 160px, 최소 480px)
const CHART_PER_ITEM_PX = 160
const CHART_MIN_PX = 480
const CHART_HEIGHT = 260

function ProfileChart({ items }: { items: { name: string; t_score: number | null }[] }) {
  const data = items.filter((i) => i.t_score !== null)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [containerW, setContainerW] = React.useState(0)

  React.useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setContainerW(entry.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  if (data.length === 0) return (
    <div className="h-32 flex items-center justify-center text-sm text-muted-foreground">
      점수 데이터 없음
    </div>
  )

  // 차트 폭: 척도가 많으면 항목당 160px로 확장, 적으면 컨테이너 폭 사용
  const chartW = Math.max(CHART_MIN_PX, containerW, data.length * CHART_PER_ITEM_PX)

  // 척도가 적을 때 양 끝에 빈 항목 추가 → 데이터 점이 안쪽으로, ReferenceArea는 전체 폭 유지
  const padCount = data.length <= 2 ? 2 : data.length <= 4 ? 1 : 0
  const paddedData = [
    ...Array.from({ length: padCount }, (_, i) => ({ name: `__l${i}`, t_score: null })),
    ...data,
    ...Array.from({ length: padCount }, (_, i) => ({ name: `__r${i}`, t_score: null })),
  ]

  return (
    <div ref={containerRef} className="overflow-x-auto">
      <div style={{ minWidth: chartW }}>
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <LineChart data={paddedData} margin={{ top: 28, right: 40, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <ReferenceArea y1={20} y2={40} fill="#fee2e2" fillOpacity={0.35} />
            <ReferenceArea y1={40} y2={60} fill="#e2e8f0" fillOpacity={0.45} />
            <ReferenceArea y1={60} y2={80} fill="#dbeafe" fillOpacity={0.35} />
            <ReferenceLine y={50} stroke="#94a3b8" strokeDasharray="5 3" strokeWidth={1} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12, fill: "#374151", fontWeight: 500 }}
              tickFormatter={(v: string) => v.startsWith("__") ? "" : v}
              tickLine={false} axisLine={false}
              interval={0}
            />
            <YAxis
              domain={[20, 80]}
              ticks={[20, 30, 40, 50, 60, 70, 80]}
              tick={{ fontSize: 10, fill: "#94a3b8" }}
              tickLine={false} axisLine={false}
              width={32}
            />
            <Tooltip
              formatter={(v) => [`T = ${v}`, "T점수"]}
              contentStyle={{ fontSize: 12, borderRadius: 10, border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
              cursor={{ stroke: "#e2e8f0", strokeWidth: 1 }}
            />
            <Line
              type="monotone"
              dataKey="t_score"
              stroke={BRAND}
              strokeWidth={2.5}
              dot={{ fill: BRAND, r: 6, strokeWidth: 2, stroke: "#fff" }}
              activeDot={{ r: 8, strokeWidth: 2, stroke: "#fff" }}
              label={{ dataKey: "t_score", position: "top", fontSize: 11, fill: BRAND, fontWeight: 600, dy: -6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ── 패널 헤더 (브레드크럼) ─────────────────────────────────────────────────────

function PanelBreadcrumb({ items }: { items: string[] }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-4 select-none">
      {items.map((item, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="text-border">›</span>}
          <span className={i === items.length - 1 ? "text-foreground font-medium" : ""}>{item}</span>
        </React.Fragment>
      ))}
    </div>
  )
}

// ── 패널: 전체 요약 ───────────────────────────────────────────────────────────

function OverviewPanel({ data, onNavigate }: { data: ReportData; onNavigate: (n: NavNode) => void }) {
  return (
    <div className="space-y-6 animate-in fade-in-0 duration-200">
      <PanelBreadcrumb items={["전체 요약"]} />

      {/* 척도 요약 카드 — 가로 스크롤 */}
      <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory">
        {data.scales.map((s) => {
          const cs = categoryStyle(s.category)
          return (
            <button
              key={s.code}
              onClick={() => onNavigate({ type: "scale", code: s.code })}
              className={`shrink-0 w-[240px] snap-start text-left rounded-xl border border-l-4 ${cs.border} border-border ${cs.card} p-4 shadow-sm hover:shadow-md transition-all duration-150 group`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono text-muted-foreground">{s.code}</span>
                {s.category && (
                  <span className={`text-[9px] font-semibold rounded-full px-2 py-0.5 ${cs.badge}`}>
                    {s.category}
                  </span>
                )}
              </div>
              <p className="text-xs font-semibold text-foreground leading-snug mb-3 group-hover:text-[#2d3580] transition-colors">
                {s.name}
              </p>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wide">T점수</p>
                  <p className={`text-2xl font-bold leading-none ${s.category ? cs.value : "text-foreground"}`}>
                    {s.t_score ?? "—"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wide">백분위</p>
                  <p className="text-sm font-semibold text-muted-foreground">
                    {s.percentile != null ? `${s.percentile}%` : "—"}
                  </p>
                </div>
              </div>
              {/* mini T-score bar */}
              <TScoreBar tScore={s.t_score} compact />
            </button>
          )
        })}
      </div>

      {/* 전체 프로파일 차트 */}
      {data.scales.length > 0 && (
        <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-sm font-semibold text-foreground">T점수 프로파일</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">평균(M) = 50, 표준편차(SD) = 10</p>
            </div>
            <div className="flex gap-3 text-[10px]">
              <span className="flex items-center gap-1"><span className="inline-block w-3 h-2 rounded-sm bg-red-100" />낮음</span>
              <span className="flex items-center gap-1"><span className="inline-block w-3 h-2 rounded-sm bg-slate-100" />보통</span>
              <span className="flex items-center gap-1"><span className="inline-block w-3 h-2 rounded-sm bg-blue-100" />높음</span>
            </div>
          </div>
          <ProfileChart items={data.scales.map((s) => ({ name: s.name, t_score: s.t_score }))} />
        </div>
      )}

      {/* 점수 테이블 */}
      <div className="rounded-xl border border-border bg-white overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 border-b border-border bg-muted/20">
          <h3 className="text-xs font-semibold text-foreground">전체 점수표</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="px-5 py-2.5 text-left text-[11px] font-semibold text-muted-foreground">척도</th>
              <th className="px-4 py-2.5 text-center text-[11px] font-semibold text-muted-foreground">원점수</th>
              <th className="px-4 py-2.5 text-center text-[11px] font-semibold text-muted-foreground">T점수</th>
              <th className="px-4 py-2.5 text-center text-[11px] font-semibold text-muted-foreground">백분위</th>
              <th className="px-4 py-2.5 text-center text-[11px] font-semibold text-muted-foreground">수준</th>
            </tr>
          </thead>
          <tbody>
            {data.scales.map((s) => {
              const cs = categoryStyle(s.category)
              return (
                <React.Fragment key={s.code}>
                  <tr
                    className="border-b border-border/50 hover:bg-muted/20 transition-colors cursor-pointer"
                    onClick={() => onNavigate({ type: "scale", code: s.code })}
                  >
                    <td className="px-5 py-3">
                      <span className="font-semibold text-foreground text-xs">{s.name}</span>
                      <span className="ml-2 text-[10px] font-mono text-muted-foreground">{s.code}</span>
                    </td>
                    <td className="px-4 py-3 text-center text-sm">{s.raw_score ?? "—"}</td>
                    <td className="px-4 py-3 text-center text-sm font-bold" style={{ color: s.t_score ? BRAND : undefined }}>{s.t_score ?? "—"}</td>
                    <td className="px-4 py-3 text-center text-sm">{s.percentile != null ? `${s.percentile}` : "—"}</td>
                    <td className="px-4 py-3 text-center">
                      {s.category ? (
                        <span className={`text-[10px] font-semibold rounded-full px-2.5 py-0.5 ${cs.badge}`}>{s.category}</span>
                      ) : "—"}
                    </td>
                  </tr>
                  {s.facets.map((f) => {
                    const fc = categoryStyle(f.category)
                    return (
                      <tr key={f.code} className="border-b border-border/30 bg-muted/5 hover:bg-muted/20 transition-colors">
                        <td className="px-5 py-2.5 pl-10">
                          <span className="text-[11px] text-muted-foreground">↳ {f.name}</span>
                          <span className="ml-2 text-[10px] font-mono text-muted-foreground/50">{f.code}</span>
                        </td>
                        <td className="px-4 py-2.5 text-center text-xs text-muted-foreground">{f.raw_score ?? "—"}</td>
                        <td className="px-4 py-2.5 text-center text-xs font-medium">{f.t_score ?? "—"}</td>
                        <td className="px-4 py-2.5 text-center text-xs text-muted-foreground">{f.percentile != null ? f.percentile : "—"}</td>
                        <td className="px-4 py-2.5 text-center">
                          {f.category ? (
                            <span className={`text-[10px] font-medium rounded-full px-2 py-0.5 ${fc.badge}`}>{f.category}</span>
                          ) : "—"}
                        </td>
                      </tr>
                    )
                  })}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── 패널: 척도 상세 ───────────────────────────────────────────────────────────

function ScalePanel({ scale }: { scale: ScaleRow }) {
  const cs = categoryStyle(scale.category)
  return (
    <div className="space-y-5 animate-in fade-in-0 duration-200">
      <PanelBreadcrumb items={["전체 요약", scale.name]} />

      {/* 척도 헤더 */}
      <div className={`rounded-xl border border-l-4 ${cs.border} border-border ${cs.card} px-5 py-4 flex items-start justify-between gap-3 shadow-sm`}>
        <div>
          <span className="text-[10px] font-mono text-muted-foreground">{scale.code}</span>
          <h2 className="text-lg font-bold text-foreground mt-0.5">{scale.name}</h2>
          {(scale.answered_item_count != null && scale.expected_item_count != null) && (
            <p className="text-[11px] text-muted-foreground mt-1">
              응답 문항 {scale.answered_item_count} / {scale.expected_item_count}
            </p>
          )}
        </div>
        {scale.category && (
          <span className={`shrink-0 text-xs font-bold rounded-full px-3 py-1.5 ${cs.badge}`}>{scale.category}</span>
        )}
      </div>

      {/* 메트릭 카드 3열 */}
      <div className="grid grid-cols-3 gap-3">
        <MetricCard label="원점수" value={scale.raw_score} />
        <MetricCard label="T점수" value={scale.t_score} sub="M=50, SD=10" category={scale.category} />
        <MetricCard label="백분위" value={scale.percentile != null ? `${scale.percentile}%ile` : null} />
      </div>

      {/* T점수 바 */}
      <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
        <h3 className="text-xs font-semibold text-foreground mb-1">척도 프로파일</h3>
        <p className="text-[11px] text-muted-foreground mb-3">T점수 20–80 구간 내 현재 위치를 나타냅니다.</p>
        <TScoreBar tScore={scale.t_score} />
      </div>

      {/* 해석 */}
      {scale.interpretation && (
        <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
          <h3 className="text-xs font-semibold text-foreground mb-3">해석</h3>
          <div className="bg-slate-50 rounded-lg px-4 py-3 border-l-4 border-slate-300">
            <p className="text-sm leading-relaxed text-slate-700">{scale.interpretation}</p>
          </div>
        </div>
      )}

      {/* 하위척도 (facets) */}
      {scale.facets.length > 0 && (
        <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold text-foreground">하위척도 프로파일</h3>
            <span className="text-[10px] text-muted-foreground">{scale.facets.length}개 하위척도</span>
          </div>
          <ProfileChart items={scale.facets.map((f) => ({ name: f.name, t_score: f.t_score }))} />
          <div className="mt-4 divide-y divide-border/50">
            {scale.facets.map((f) => {
              const fc = categoryStyle(f.category)
              return (
                <div key={f.code} className="flex items-center justify-between py-3">
                  <div>
                    <span className="text-xs font-medium text-foreground">{f.name}</span>
                    <span className="ml-2 text-[10px] font-mono text-muted-foreground">{f.code}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="font-semibold" style={{ color: f.t_score ? BRAND : undefined }}>
                      T = {f.t_score ?? "—"}
                    </span>
                    {f.category && (
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${fc.badge}`}>{f.category}</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ── 패널: 하위척도 상세 ────────────────────────────────────────────────────────

function FacetPanel({ facet, parentName }: { facet: FacetRow; parentName: string }) {
  const cs = categoryStyle(facet.category)
  return (
    <div className="space-y-5 animate-in fade-in-0 duration-200">
      <PanelBreadcrumb items={["전체 요약", parentName, facet.name]} />

      <div className={`rounded-xl border border-l-4 ${cs.border} border-border ${cs.card} px-5 py-4 flex items-start justify-between gap-3 shadow-sm`}>
        <div>
          <span className="text-[10px] font-mono text-muted-foreground">{facet.code}</span>
          <p className="text-[11px] text-muted-foreground mt-0.5">{parentName} › 하위척도</p>
          <h2 className="text-lg font-bold text-foreground mt-0.5">{facet.name}</h2>
        </div>
        {facet.category && (
          <span className={`shrink-0 text-xs font-bold rounded-full px-3 py-1.5 ${cs.badge}`}>{facet.category}</span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <MetricCard label="원점수" value={facet.raw_score} />
        <MetricCard label="T점수" value={facet.t_score} sub="M=50, SD=10" category={facet.category} />
        <MetricCard label="백분위" value={facet.percentile != null ? `${facet.percentile}%ile` : null} />
      </div>

      <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
        <h3 className="text-xs font-semibold text-foreground mb-1">척도 프로파일</h3>
        <p className="text-[11px] text-muted-foreground mb-3">T점수 20–80 구간 내 현재 위치를 나타냅니다.</p>
        <TScoreBar tScore={facet.t_score} />
      </div>

      {facet.interpretation && (
        <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
          <h3 className="text-xs font-semibold text-foreground mb-3">해석</h3>
          <div className="bg-slate-50 rounded-lg px-4 py-3 border-l-4 border-slate-300">
            <p className="text-sm leading-relaxed text-slate-700">{facet.interpretation}</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ── 사이드바 ──────────────────────────────────────────────────────────────────

function Sidebar({
  data,
  selected,
  onSelect,
  collapsed,
  onToggleCollapse,
}: {
  data: ReportData
  selected: NavNode
  onSelect: (n: NavNode) => void
  collapsed: boolean
  onToggleCollapse: () => void
}) {
  const [expanded, setExpanded] = React.useState<Set<string>>(
    () => new Set(data.scales.map((s) => s.code))
  )

  function toggleExpand(code: string, e: React.MouseEvent) {
    e.stopPropagation()
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(code) ? next.delete(code) : next.add(code)
      return next
    })
  }

  const overviewNode: NavNode = { type: "overview" }

  return (
    <aside
      className={`shrink-0 border-r border-border bg-white flex flex-col overflow-y-auto transition-all duration-200 ${collapsed ? "w-12" : "w-[240px]"}`}
    >
      {/* 사이드바 헤더 */}
      <div className="flex items-center justify-between px-3 py-3.5 border-b border-border">
        {!collapsed && (
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">척도 탐색</p>
        )}
        <button
          onClick={onToggleCollapse}
          className="ml-auto size-6 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
          title={collapsed ? "펼치기" : "접기"}
        >
          <span className="text-[12px] select-none">{collapsed ? "»" : "«"}</span>
        </button>
      </div>

      {!collapsed && (
        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {/* 전체 요약 */}
          <button
            onClick={() => onSelect(overviewNode)}
            className={`w-full flex items-center gap-2 rounded-md px-3 py-2.5 text-xs transition-colors ${
              navEqual(selected, overviewNode)
                ? "bg-[#2d3580] text-white font-semibold shadow-sm"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            }`}
          >
            <span className="text-[11px]">☰</span>
            <span>전체 요약</span>
          </button>

          {/* 구분선 */}
          <div className="pt-2 pb-1 px-3">
            <p className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-widest">척도</p>
          </div>

          {/* 척도 트리 */}
          {data.scales.map((scale) => {
            const scaleNode: NavNode = { type: "scale", code: scale.code }
            const isScaleActive = navEqual(selected, scaleNode)
            const isFacetActive = selected.type === "facet" && selected.scaleCode === scale.code
            const isHighlighted = isScaleActive || isFacetActive
            const isOpen = expanded.has(scale.code)
            const hasFacets = scale.facets.length > 0
            const cs = categoryStyle(scale.category)

            return (
              <div key={scale.code}>
                <button
                  onClick={() => {
                    onSelect(scaleNode)
                    if (hasFacets && !isOpen) setExpanded((prev) => new Set([...prev, scale.code]))
                  }}
                  className={`w-full flex items-center gap-2 rounded-md px-3 py-2.5 text-xs transition-colors ${
                    isScaleActive
                      ? "bg-[#2d3580] text-white font-semibold shadow-sm"
                      : isHighlighted
                      ? "bg-[#2d3580]/5 text-[#2d3580] font-medium"
                      : "text-foreground hover:bg-muted/50"
                  }`}
                >
                  {hasFacets ? (
                    <span
                      className={`text-[10px] transition-transform duration-150 shrink-0 ${isOpen ? "rotate-90" : ""} ${isScaleActive ? "text-white/70" : "text-muted-foreground"}`}
                      onClick={(e) => toggleExpand(scale.code, e)}
                    >▶</span>
                  ) : (
                    <span className={`size-1.5 rounded-full shrink-0 ${isScaleActive ? "bg-white" : cs.dot}`} />
                  )}
                  <span className="flex-1 text-left leading-snug truncate">{scale.name}</span>
                  {scale.category && (
                    <span className={`shrink-0 text-[9px] rounded-full px-1.5 py-0.5 font-semibold ${isScaleActive ? "bg-white/20 text-white" : cs.badge}`}>
                      {scale.category}
                    </span>
                  )}
                </button>

                {/* 하위척도 */}
                {hasFacets && isOpen && (
                  <div className="ml-3 mt-0.5 mb-1 space-y-0.5 border-l-2 border-border/40 pl-2">
                    {scale.facets.map((facet) => {
                      const facetNode: NavNode = { type: "facet", scaleCode: scale.code, facetCode: facet.code }
                      const isFacActive = navEqual(selected, facetNode)
                      const fc = categoryStyle(facet.category)
                      return (
                        <button
                          key={facet.code}
                          onClick={() => onSelect(facetNode)}
                          className={`w-full flex items-center gap-2 rounded-md px-2.5 py-2 text-xs transition-colors ${
                            isFacActive
                              ? "bg-[#2d3580] text-white font-semibold shadow-sm"
                              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                          }`}
                        >
                          <span className={`size-1 rounded-full shrink-0 ${isFacActive ? "bg-white" : fc.dot}`} />
                          <span className="flex-1 text-left truncate">{facet.name}</span>
                          {facet.category && (
                            <span className={`shrink-0 text-[9px] rounded-full px-1.5 py-0.5 font-medium ${isFacActive ? "bg-white/20 text-white" : fc.badge}`}>
                              {facet.category}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>
      )}

      {/* collapsed 상태에서 아이콘 네비 */}
      {collapsed && (
        <nav className="flex-1 flex flex-col items-center pt-3 gap-1">
          <button
            onClick={() => { onToggleCollapse(); onSelect(overviewNode) }}
            className={`size-8 rounded-md flex items-center justify-center text-xs transition-colors ${
              navEqual(selected, overviewNode)
                ? "bg-[#2d3580] text-white"
                : "text-muted-foreground hover:bg-muted/50"
            }`}
            title="전체 요약"
          >☰</button>
          {data.scales.map((scale) => {
            const scaleNode: NavNode = { type: "scale", code: scale.code }
            const isActive = navEqual(selected, scaleNode) || (selected.type === "facet" && selected.scaleCode === scale.code)
            const cs = categoryStyle(scale.category)
            return (
              <button
                key={scale.code}
                onClick={() => { onToggleCollapse(); onSelect(scaleNode) }}
                className={`size-8 rounded-md flex items-center justify-center text-[10px] font-bold transition-colors ${
                  isActive ? "bg-[#2d3580] text-white" : `${cs.card} hover:opacity-80`
                }`}
                title={scale.name}
              >
                <span className={isActive ? "text-white" : cs.value.replace("text-", "")}>{scale.code.slice(-2)}</span>
              </button>
            )
          })}
        </nav>
      )}
    </aside>
  )
}

// ── 헤더 ──────────────────────────────────────────────────────────────────────

function Header({ data }: { data: ReportData }) {
  return (
    <header className="shrink-0 border-b border-border bg-white px-6 py-3 flex items-center justify-between gap-4 shadow-sm">
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: BRAND }}
        >
          <span className="text-white text-[11px] font-bold tracking-tight">R</span>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-foreground truncate">{data.test_name}</p>
          <p className="text-[11px] text-muted-foreground">{data.test_date}</p>
        </div>
      </div>

      <div className="flex items-center gap-4 shrink-0">
        {/* 수검자 정보 */}
        <div className="hidden sm:flex items-center gap-0 text-xs divide-x divide-border">
          {data.profile.name && (
            <span className="pr-3 font-semibold text-foreground">{data.profile.name}</span>
          )}
          {data.profile.gender && (
            <span className="px-3 text-muted-foreground">{data.profile.gender}</span>
          )}
          {data.profile.age_text && (
            <span className="px-3 text-muted-foreground">{data.profile.age_text}</span>
          )}
          {data.profile.birth_day && (
            <span className="pl-3 text-muted-foreground">{data.profile.birth_day}</span>
          )}
        </div>

        {/* 인쇄 버튼 */}
        <button
          onClick={() => window.print()}
          className="print:hidden inline-flex items-center gap-1.5 rounded-md border border-input bg-white px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition-colors shadow-sm"
        >
          <span>⎙</span>
          인쇄
        </button>
      </div>
    </header>
  )
}

// ── 메인 대시보드 ─────────────────────────────────────────────────────────────

function ReportDashboard({ data }: { data: ReportData }) {
  const [selected, setSelected] = React.useState<NavNode>({ type: "overview" })
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false)

  function renderPanel() {
    if (selected.type === "overview")
      return <OverviewPanel data={data} onNavigate={setSelected} />
    if (selected.type === "scale") {
      const scale = data.scales.find((s) => s.code === selected.code)
      if (!scale) return null
      return <ScalePanel scale={scale} />
    }
    if (selected.type === "facet") {
      const scale = data.scales.find((s) => s.code === selected.scaleCode)
      const facet = scale?.facets.find((f) => f.code === selected.facetCode)
      if (!scale || !facet) return null
      return <FacetPanel facet={facet} parentName={scale.name} />
    }
    return null
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50 print:h-auto">
      <Header data={data} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          data={data}
          selected={selected}
          onSelect={setSelected}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
        />
        <main className="flex-1 overflow-y-auto print:overflow-visible">
          <div className="max-w-4xl mx-auto px-6 py-6">
            {renderPanel()}
          </div>
        </main>
      </div>
    </div>
  )
}

// ── 공개 / 관리자 진입점 ──────────────────────────────────────────────────────

interface ReportPageProps {
  mode: "token" | "admin"
  submissionId?: number
}

export function AdminReportPage() {
  const { submissionId } = useParams<{ submissionId: string }>()
  return <ReportPage mode="admin" submissionId={submissionId ? Number(submissionId) : undefined} />
}

export function ReportPage({ mode, submissionId }: ReportPageProps) {
  const { submissionId: routeSubmissionId } = useParams<{ submissionId: string }>()
  const [searchParams] = useSearchParams()
  const [data, setData] = React.useState<ReportData | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    const controller = new AbortController()
    const publicSubmissionId = Number(routeSubmissionId)
    const token = searchParams.get("token") ?? ""
    const targetSubmissionId = mode === "token" ? publicSubmissionId : submissionId

    async function loadReport() {
      setLoading(true)
      setError(null)
      setData(null)

      if (!targetSubmissionId || !Number.isFinite(targetSubmissionId)) {
        setError("not_found")
        setLoading(false)
        return
      }
      if (mode === "token" && !token) {
        setError("not_found")
        setLoading(false)
        return
      }

      const url = mode === "token"
        ? `/api/report/by-submission/${targetSubmissionId}?token=${encodeURIComponent(token)}`
        : `/api/admin/report/${targetSubmissionId}`

      try {
        const response = await fetch(url, { signal: controller.signal })
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) {
          setError(response.status === 401 ? "login_required" : "network_error")
          return
        }
        if (isReportData(payload)) {
          setData(payload)
          return
        }
        const apiError = typeof payload.error === "string" ? payload.error : "network_error"
        setError(apiError)
      } catch (err) {
        if ((err as Error).name !== "AbortError") setError("network_error")
      } finally {
        setLoading(false)
      }
    }

    loadReport()
    return () => controller.abort()
  }, [mode, routeSubmissionId, searchParams, submissionId])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="size-8 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-3" style={{ borderColor: BRAND, borderTopColor: "transparent" }} />
          <p className="text-sm text-muted-foreground">결과를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    const msg = error === "not_found" ? "검사 결과를 찾을 수 없습니다."
      : error === "scoring_failed" ? "채점 처리 중 오류가 발생했습니다."
      : error === "login_required" ? "관리자 로그인이 필요합니다."
      : "결과를 불러오지 못했습니다."
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="size-10 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
            <span className="text-red-500 text-lg">!</span>
          </div>
          <p className="text-sm font-medium text-foreground mb-1">오류</p>
          <p className="text-xs text-muted-foreground">{msg}</p>
        </div>
      </div>
    )
  }

  return <ReportDashboard data={data} />
}

function isReportData(value: unknown): value is ReportData {
  if (!value || typeof value !== "object") return false
  const candidate = value as Partial<ReportData>
  return (
    typeof candidate.submission_id === "number" &&
    typeof candidate.test_name === "string" &&
    typeof candidate.test_date === "string" &&
    !!candidate.profile &&
    typeof candidate.profile === "object" &&
    Array.isArray(candidate.scales)
  )
}
