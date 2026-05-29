import * as React from "react"
import { useParams, useSearchParams } from "react-router-dom"

// ── Types ─────────────────────────────────────────────────────────────────────

interface FacetRow {
  id?: string
  test_id?: string
  parent_code?: string
  code: string
  name: string
  raw_score: number | null
  t_score: number | null
  percentile: number | string | null
  category: string | null
  score_valence?: ScoreValence | null
  interpretation: string
}

interface ScaleRow {
  id?: string
  test_id?: string
  code: string
  name: string
  raw_score: number | null
  t_score: number | null
  percentile: number | string | null
  category: string | null
  score_valence?: ScoreValence | null
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
  test_names?: Record<string, string>
  scales: ScaleRow[]
  error?: string
}

type Direction = "higher_worse" | "higher_better" | "lower_worse" | "lower_better" | "optimal_middle" | "unknown"
type Tone = "negative" | "positive" | "neutral"
type ScoreValence = "positive" | "negative" | "neutral"

interface AugmentedFacet {
  id?: string
  test_id?: string
  parent_code?: string
  code: string
  name: string
  raw_score: number | null
  t_score: number | null
  percentile: number | string | null
  category: string | null
  interpretation: string
  direction: Direction
  tone: Tone
}

interface AugmentedScale {
  id?: string
  test_id?: string
  code: string
  name: string
  raw_score: number | null
  t_score: number | null
  percentile: number | string | null
  category: string | null
  interpretation: string
  answered_item_count: number | null
  expected_item_count: number | null
  facets: AugmentedFacet[]
  direction: Direction
  tone: Tone
}

interface VirtualTest {
  test_id: string
  korean_name: string
  scales: AugmentedScale[]
}

interface DisplayScore {
  value: number | null
  plotValue: number | null
  metric: "T" | "P" | null
}

// ── Constants ─────────────────────────────────────────────────────────────────

const T_MIN = 20
const T_MAX = 80
const BRAND_HEX = "#2d3580"
const MAX_CHART_BAR_W = 65

// ── Direction lookup table (hardcoded for known test instruments) ──────────────

const DIRECTION_MAP: Record<string, Direction> = {
  // K-PSI-4-SF
  B01: "higher_worse", DC: "higher_worse", PCDI: "higher_worse", PD: "higher_worse",
  // PAT-2
  A01: "higher_better", A02: "higher_better",
  A03: "optimal_middle", A04: "optimal_middle", A06: "optimal_middle", A07: "optimal_middle",
  A05: "lower_better", A08: "lower_better",
  // PCT
  C01: "higher_better", EFF: "higher_better",
  ANX: "lower_better",
  C02: "higher_better", PART: "higher_better", AGR: "higher_better", C03: "higher_better",
}

const LOCAL_REPORT_PREVIEW: ReportData = {
  submission_id: 47,
  test_name: "로컬 결과 화면 프리뷰",
  test_date: "2026-05-26",
  profile: {
    name: "프리뷰 내담자",
    gender: "여",
    birth_day: "2018-04-19",
    age_text: "만 8세",
  },
  test_names: {
    PCT: "PCT 부모양육특성 검사",
    "PAT-2": "PAT-2 부모양육태도검사 2판",
    "K-PSI-4-SF": "K-PSI-4-SF 한국판 부모 양육스트레스 검사 4판 (단축형)",
  },
  scales: [
    {
      id: "preview-pct-c01",
      test_id: "PCT",
      code: "C01",
      name: "부모 효능감",
      raw_score: 42,
      t_score: 64,
      percentile: 92,
      category: "높음",
      score_valence: "positive",
      answered_item_count: 12,
      expected_item_count: 12,
      interpretation: "양육 상황에서 스스로 문제를 해결하고 조율할 수 있다는 신념이 비교적 높게 나타납니다. 강점으로 활용하되, 부담이 커지는 시점에는 주변 자원을 함께 쓰는 것이 좋습니다.",
      facets: [
        {
          id: "preview-pct-eff",
          test_id: "PCT",
          parent_code: "C01",
          code: "EFF",
          name: "효능감",
          raw_score: 23,
          t_score: 67,
          percentile: 95,
          category: "높음",
          score_valence: "positive",
          interpretation: "부모 역할에 대한 자신감이 높고 행동 조절 전략을 적극적으로 시도하는 편입니다.",
        },
        {
          id: "preview-pct-anx",
          test_id: "PCT",
          parent_code: "C01",
          code: "ANX",
          name: "양육 불안",
          raw_score: 19,
          t_score: 42,
          percentile: 36,
          category: "보통",
          score_valence: "negative",
          interpretation: "양육 불안은 평균 범위에 있어 일상적인 수준의 걱정으로 해석됩니다.",
        },
      ],
    },
    {
      id: "preview-pat-a03",
      test_id: "PAT-2",
      code: "A03",
      name: "일관성",
      raw_score: 31,
      t_score: 37,
      percentile: 11,
      category: "낮음",
      score_valence: "positive",
      answered_item_count: 10,
      expected_item_count: 10,
      interpretation: "상황에 따라 양육 반응의 기준이 달라질 가능성이 있습니다. 예측 가능한 규칙과 반복되는 안내를 정리하면 아동의 안정감 형성에 도움이 됩니다.",
      facets: [
        {
          id: "preview-pat-a04",
          test_id: "PAT-2",
          parent_code: "A03",
          code: "A04",
          name: "규칙 유지",
          raw_score: 15,
          t_score: 35,
          percentile: 8,
          category: "낮음",
          score_valence: "positive",
          interpretation: "규칙을 정한 뒤 지속적으로 유지하는 데 어려움이 있을 수 있습니다.",
        },
        {
          id: "preview-pat-a06",
          test_id: "PAT-2",
          parent_code: "A03",
          code: "A06",
          name: "반응 예측성",
          raw_score: 16,
          t_score: 45,
          percentile: 31,
          category: "보통",
          score_valence: "positive",
          interpretation: "대체로 평균 범위이나 피로하거나 갈등이 커질 때 변동이 생길 수 있습니다.",
        },
      ],
    },
    {
      id: "preview-psi-b01",
      test_id: "K-PSI-4-SF",
      code: "B01",
      name: "부모 스트레스 총점",
      raw_score: 58,
      t_score: 69,
      percentile: 97,
      category: "높음",
      score_valence: "negative",
      answered_item_count: 36,
      expected_item_count: 36,
      interpretation: "부모 역할 수행 과정에서 체감하는 부담이 높은 편입니다. 수면, 돌봄 분담, 문제 상황별 대응 계획처럼 회복 자원을 먼저 확보하는 접근이 필요합니다.",
      facets: [
        {
          id: "preview-psi-pd",
          test_id: "K-PSI-4-SF",
          parent_code: "B01",
          code: "PD",
          name: "부모 고통",
          raw_score: 21,
          t_score: 72,
          percentile: 98,
          category: "매우 높음",
          score_valence: "negative",
          interpretation: "부모 개인의 피로와 심리적 부담이 두드러집니다.",
        },
        {
          id: "preview-psi-dc",
          test_id: "K-PSI-4-SF",
          parent_code: "B01",
          code: "DC",
          name: "까다로운 아동",
          raw_score: 18,
          t_score: 63,
          percentile: 90,
          category: "높음",
          score_valence: "negative",
          interpretation: "아동의 행동 특성이 양육 부담을 높이는 요인으로 경험될 수 있습니다.",
        },
        {
          id: "preview-psi-pcdi",
          test_id: "K-PSI-4-SF",
          parent_code: "B01",
          code: "PCDI",
          name: "부모-아동 역기능 상호작용",
          raw_score: 19,
          t_score: 54,
          percentile: 66,
          category: "보통",
          score_valence: "negative",
          interpretation: "상호작용 문제는 평균 범위이나 스트레스가 높을 때 악화될 수 있습니다.",
        },
      ],
    },
  ],
}

function canUseLocalReportPreview(mode: ReportPageProps["mode"]): boolean {
  if (mode !== "admin" || typeof window === "undefined") return false
  return window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
}

function localReportPreview(submissionId: number): ReportData {
  return {
    ...LOCAL_REPORT_PREVIEW,
    submission_id: submissionId,
  }
}

function scaleDirection(scale: { code: string; score_valence?: ScoreValence | null }): Direction {
  if (scale.score_valence === "positive") return "higher_better"
  if (scale.score_valence === "negative") return "higher_worse"
  if (scale.score_valence === "neutral") return "unknown"
  return DIRECTION_MAP[scale.code] ?? "unknown"
}

function scaleTone(direction: Direction, tScore: number | null): Tone {
  if (tScore === null || direction === "unknown") return "neutral"
  switch (direction) {
    case "higher_worse":
    case "lower_better":
      if (tScore > 60) return "negative"
      if (tScore < 40) return "positive"
      return "neutral"
    case "higher_better":
    case "lower_worse":
      if (tScore < 40) return "negative"
      if (tScore > 60) return "positive"
      return "neutral"
    case "optimal_middle":
      if (tScore < 40 || tScore > 60) return "negative"
      if (tScore >= 45 && tScore <= 55) return "positive"
      return "neutral"
  }
}

function scoreValenceTone(scoreValence: ScoreValence | null | undefined, score: DisplayScore): Tone | null {
  if (!scoreValence || score.value === null) return null
  if (scoreValence === "neutral") return "neutral"
  if (scoreValence === "positive") {
    if (score.value < 40) return "negative"
    if (score.value > 60) return "positive"
    return "neutral"
  }
  if (score.value < 40) return "positive"
  if (score.value > 60) return "negative"
  return "neutral"
}

function percentileNumber(percentile: number | string | null): number | null {
  if (typeof percentile === "number") return Number.isFinite(percentile) ? percentile : null
  if (typeof percentile !== "string") return null
  const normalized = percentile.trim().replace(/,/g, "")
  if (!normalized) return null
  const match = normalized.match(/\d+(?:\.\d+)?/)
  if (!match) return null
  const parsed = Number(match[0])
  if (!Number.isFinite(parsed)) return null
  if (normalized.startsWith(">")) return Math.min(99.9, parsed + 0.5)
  if (normalized.startsWith("<")) return Math.max(0.1, parsed - 0.5)
  return parsed
}

function displayScore(scale: { t_score: number | null; percentile: number | string | null }): DisplayScore {
  if (scale.t_score !== null && Number.isFinite(scale.t_score)) {
    return { value: scale.t_score, plotValue: scale.t_score, metric: "T" }
  }
  const percentile = percentileNumber(scale.percentile)
  if (percentile === null) return { value: null, plotValue: null, metric: null }
  const clampedPercentile = Math.min(100, Math.max(0, percentile))
  return {
    value: clampedPercentile,
    plotValue: T_MIN + ((T_MAX - T_MIN) * clampedPercentile) / 100,
    metric: "P",
  }
}

function displayScoreText(score: DisplayScore): string {
  if (score.value === null) return "—"
  const value = score.value.toFixed(0)
  return score.metric === "P" ? `P${value}` : value
}

function displayScoreLabel(score: DisplayScore): string {
  if (score.value === null || score.metric === null) return "—"
  return `${score.metric}${score.value.toFixed(0)}`
}

function displayScoreTitle(score: DisplayScore): string {
  if (score.value === null || score.metric === null) return "점수 없음"
  return score.metric === "P" ? `백분위 = P${score.value.toFixed(0)}` : `T점수 = ${score.value.toFixed(0)}`
}

function meanDisplayScore(scales: Array<{ t_score: number | null; percentile: number | string | null }>): string {
  const scores = scales.map(displayScore).filter((score) => score.value !== null && score.metric !== null)
  if (scores.length === 0) return "—"
  const metric = scores.every((score) => score.metric === scores[0].metric) ? scores[0].metric : null
  const mean = scores.reduce((sum, score) => sum + (score.value ?? 0), 0) / scores.length
  return metric ? `${metric}${mean.toFixed(1)}` : mean.toFixed(1)
}

function dirLabel(direction: Direction): string {
  switch (direction) {
    case "higher_worse":   return "↑ 높을수록 우려"
    case "higher_better":  return "↑ 높을수록 양호"
    case "lower_worse":    return "↓ 낮을수록 우려"
    case "lower_better":   return "↓ 낮을수록 양호"
    case "optimal_middle": return "⇔ 중간이 이상적"
    default: return ""
  }
}

function dirMode(direction: Direction): "low_is_good" | "high_is_good" | "middle_is_good" {
  if (direction === "higher_worse" || direction === "lower_better") return "low_is_good"
  if (direction === "higher_better" || direction === "lower_worse") return "high_is_good"
  return "middle_is_good"
}

function testKoreanName(testId: string, dbName: string | undefined): string {
  const normalizedId = testId.trim()
  const name = (dbName ?? "").trim()
  if (!name) return normalizedId
  if (name.toUpperCase().startsWith(normalizedId.toUpperCase())) {
    return name.slice(normalizedId.length).trim()
  }
  return name
}

// ── Data transformation ───────────────────────────────────────────────────────

function augmentFacet(f: FacetRow): AugmentedFacet {
  const direction = scaleDirection(f)
  const score = displayScore(f)
  return { ...f, direction, tone: scoreValenceTone(f.score_valence, score) ?? scaleTone(direction, score.value) }
}

function augmentScale(s: ScaleRow): AugmentedScale {
  const direction = scaleDirection(s)
  const score = displayScore(s)
  return { ...s, direction, tone: scoreValenceTone(s.score_valence, score) ?? scaleTone(direction, score.value), facets: s.facets.map(augmentFacet) }
}

function groupScalesByTestId(scales: ScaleRow[], testNames: Record<string, string> = {}): VirtualTest[] {
  const groups: VirtualTest[] = []
  for (const scale of scales) {
    const tid = scale.test_id ?? "UNKNOWN"
    const aug = augmentScale(scale)
    const last = groups[groups.length - 1]
    if (last && last.test_id === tid) last.scales.push(aug)
    else groups.push({ test_id: tid, korean_name: testKoreanName(tid, testNames[tid]), scales: [aug] })
  }
  return groups
}

// ── Tone color tokens ─────────────────────────────────────────────────────────

function toneColor(tone: Tone) {
  if (tone === "negative") return {
    accent: "#dc2626", text: "text-red-700",
    badge: "bg-red-50 text-red-700 ring-1 ring-red-200", dot: "bg-red-500",
  }
  if (tone === "positive") return {
    accent: "#059669", text: "text-emerald-700",
    badge: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200", dot: "bg-emerald-500",
  }
  return {
    accent: "#64748b", text: "text-slate-600",
    badge: "bg-slate-100 text-slate-600 ring-1 ring-slate-200", dot: "bg-slate-400",
  }
}

function tPos(t: number) {
  return Math.min(100, Math.max(0, ((t - T_MIN) / (T_MAX - T_MIN)) * 100))
}

// ── ZoneBar ───────────────────────────────────────────────────────────────────

const ZONE_BG: Record<string, string[]> = {
  low_is_good:    ["#dcfce7", "#dcfce7", "#f1f5f9", "#f1f5f9", "#fee2e2", "#fee2e2"],
  high_is_good:   ["#fee2e2", "#fee2e2", "#f1f5f9", "#f1f5f9", "#dcfce7", "#dcfce7"],
  middle_is_good: ["#f1f5f9", "#f1f5f9", "#f1f5f9", "#f1f5f9", "#f1f5f9", "#f1f5f9"],
}

function ZoneBar({
  tScore, direction, height = "md", showTicks = true, valueLabel,
}: {
  tScore: number | null
  direction: Direction
  height?: "sm" | "md" | "lg"
  showTicks?: boolean
  valueLabel?: string
}) {
  if (tScore === null || tScore === undefined) {
    return (
      <div className="h-3 rounded bg-slate-100 flex items-center pl-2">
        <span className="text-[10px] text-slate-400">점수 없음</span>
      </div>
    )
  }
  const mode = direction === "unknown" ? "middle_is_good" : dirMode(direction)
  const colors = ZONE_BG[mode]
  const pos = tPos(tScore)
  const hClass = height === "sm" ? "h-2.5" : height === "lg" ? "h-6" : "h-4"
  const mSize = height === "sm" ? "w-2.5 h-2.5" : height === "lg" ? "w-5 h-5" : "w-3.5 h-3.5"

  return (
    <div className="w-full">
      <div className="relative">
        <div className={`relative flex ${hClass} rounded overflow-visible`}>
          {colors.map((c, i) => (
            <div key={i} className="h-full first:rounded-l last:rounded-r" style={{ width: "16.6667%", background: c }} />
          ))}
          <div className="absolute top-0 bottom-0 left-1/2 w-px bg-slate-400/40" />
          <div
            className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 ${mSize} rounded-full border-2 border-white shadow-md ring-1 ring-slate-900/10 bg-slate-900`}
            style={{ left: `${pos}%` }}
          />
        </div>
        {height !== "sm" && (
          <div className="absolute -top-5 -translate-x-1/2 text-[11px] font-bold text-slate-900 leading-none" style={{ left: `${pos}%` }}>
            {valueLabel ?? tScore.toFixed(0)}
          </div>
        )}
      </div>
      {showTicks && (
        <div className="flex justify-between text-[9px] text-slate-400 mt-1 px-0.5">
          <span>20</span><span>30</span><span>40</span><span>50</span><span>60</span><span>70</span><span>80</span>
        </div>
      )}
      {height !== "sm" && (
        <div className="grid grid-cols-3 mt-1 text-[9px] font-medium">
          <span className="text-left" style={{ color: mode === "low_is_good" ? "#059669" : "#dc2626" }}>낮음</span>
          <span className="text-center" style={{ color: "#64748b" }}>평균</span>
          <span className="text-right" style={{ color: mode === "high_is_good" ? "#059669" : "#dc2626" }}>높음</span>
        </div>
      )}
    </div>
  )
}

// ── Small shared UI ───────────────────────────────────────────────────────────

function DirectionTag({ direction }: { direction: Direction }) {
  const label = dirLabel(direction)
  if (!label) return null
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 px-1.5 py-0.5 rounded bg-slate-50 border border-slate-200">
      {label}
    </span>
  )
}

function CategoryBadge({ category, tone, size = "sm" }: { category: string | null; tone: Tone; size?: "sm" | "md" | "lg" }) {
  if (!category) return null
  const tc = toneColor(tone)
  const sz = size === "lg" ? "text-xs font-bold px-3 py-1" : size === "md" ? "text-[11px] font-semibold px-2.5 py-0.5" : "text-[10px] font-semibold px-2 py-0.5"
  return <span className={`inline-flex items-center rounded-full ${sz} ${tc.badge}`}>{category}</span>
}

function tonePanelClass(tone: Tone): string {
  if (tone === "negative") return "border-red-300 bg-red-50/40"
  if (tone === "positive") return "border-emerald-300 bg-emerald-50/40"
  return "border-slate-300 bg-slate-50/50"
}

function Metric({ label, value, tone }: { label: string; value: React.ReactNode; tone?: Tone }) {
  const tc = toneColor(tone ?? "neutral")
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2">
      <div className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">{label}</div>
      <div className={`text-lg font-bold leading-tight mt-0.5 ${tone ? tc.text : "text-slate-900"}`}>
        {value ?? "—"}
      </div>
    </div>
  )
}

function SectionCard({ title, subtitle, action, children }: {
  title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900">{title}</h2>
          {subtitle && <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="w-2.5 h-2.5 rounded" style={{ background: color }} />
      {label}
    </span>
  )
}

// ── ProfileHeader ─────────────────────────────────────────────────────────────

function ProfileHeader({ data }: { data: ReportData }) {
  const metaItems = [
    data.test_date,
    data.profile.name,
    data.profile.gender,
    data.profile.age_text,
  ].filter((item): item is string => Boolean(item))

  return (
    <header className="flex items-center justify-between gap-6 px-6 py-3.5 border-b border-slate-200 bg-white">
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-9 w-9 rounded-lg bg-[hsl(215,70%,35%)] text-white flex items-center justify-center font-bold text-sm shrink-0">R</div>
        <div className="min-w-0">
          <div className="text-sm font-bold text-slate-900 truncate">{data.test_name}</div>
        </div>
      </div>
      <div className="flex items-center gap-4 shrink-0">
        {metaItems.length > 0 && (
          <div className="flex flex-wrap items-center justify-end gap-x-2 gap-y-1 text-[11px] text-slate-500">
            {metaItems.map((item, index) => (
              <React.Fragment key={`${item}-${index}`}>
                {index > 0 && <span className="text-slate-300">|</span>}
                <span className={index === 1 ? "font-semibold text-slate-900" : ""}>{item}</span>
              </React.Fragment>
            ))}
          </div>
        )}
        <button
          onClick={() => window.print()}
          className="print:hidden inline-flex items-center gap-1.5 rounded-md border border-input bg-white px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors shadow-sm"
        >
          <span>⎙</span>인쇄
        </button>
      </div>
    </header>
  )
}

// ── TabButton ─────────────────────────────────────────────────────────────────

function TabButton({ label, sub, active, onClick, badge, badgeTone }: {
  label: string; sub?: string; active: boolean; onClick: () => void; badge?: number | null; badgeTone?: Tone
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 pt-3 pb-3 -mb-px border-b-2 transition flex items-center gap-2 ${
        active ? "border-[hsl(215,70%,35%)] text-[hsl(215,70%,35%)] font-semibold" : "border-transparent text-slate-500 hover:text-slate-900"
      }`}
    >
      <span className="text-sm">{label}</span>
      {sub && <span className="text-[10px] text-slate-400 font-medium">{sub}</span>}
      {badge != null && (
        <span className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 ${
          badgeTone === "negative" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600"
        }`}>{badge}</span>
      )}
    </button>
  )
}

// ── Highlights ────────────────────────────────────────────────────────────────

function Highlights({ tests }: {
  tests: VirtualTest[]
}) {
  const allWithTest = tests.flatMap((t) => t.scales.map((s) => ({ ...s, _test: t })))
  const concerns = allWithTest
    .filter((s) => s.tone === "negative")
    .sort((a, b) => Math.abs((displayScore(b).value ?? 50) - 50) - Math.abs((displayScore(a).value ?? 50) - 50))
    .slice(0, 3)
  const positives = allWithTest.filter((s) => s.tone === "positive").slice(0, 2)

  if (concerns.length === 0 && positives.length === 0) {
    return <p className="text-[12px] text-slate-500">우려 또는 양호 수준의 척도가 없습니다.</p>
  }

  return (
    <div className="space-y-2.5">
      {concerns.length > 0 && (
        <div>
          <div className="flex items-center gap-1 text-[10px] font-bold text-red-700 mb-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            가장 주의가 필요한 영역
          </div>
          <div className="space-y-1">
            {concerns.map((s) => (
              <div
                key={`${s._test.test_id}-${s.code}`}
                className="w-full px-2.5 py-1.5 rounded-md bg-red-50 flex items-center justify-between gap-2"
              >
                <span className="min-w-0 flex items-baseline gap-1.5">
                  <span className="text-[10px] font-mono text-red-600/70">{s._test.test_id}</span>
                  <span className="text-[12px] font-semibold text-red-800 truncate">{s.name}</span>
                </span>
                <span className="text-[11px] font-bold text-red-700 tabular-nums shrink-0">{displayScoreLabel(displayScore(s))}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {positives.length > 0 && (
        <div>
          <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 mb-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            양호한 영역
          </div>
          <div className="space-y-1">
            {positives.map((s) => (
              <div
                key={`${s._test.test_id}-${s.code}`}
                className="w-full px-2.5 py-1.5 rounded-md bg-emerald-50 flex items-center justify-between gap-2"
              >
                <span className="min-w-0 flex items-baseline gap-1.5">
                  <span className="text-[10px] font-mono text-emerald-600/70">{s._test.test_id}</span>
                  <span className="text-[12px] font-semibold text-emerald-800 truncate">{s.name}</span>
                </span>
                <span className="text-[11px] font-bold text-emerald-700 tabular-nums shrink-0">{displayScoreLabel(displayScore(s))}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── TestInfoPanel ─────────────────────────────────────────────────────────────

function TestInfoPanel({ tests, onSelectTest }: { tests: VirtualTest[]; onSelectTest: (tid: string) => void }) {
  const [openTest, setOpenTest] = React.useState<string | null>(tests[0]?.test_id ?? null)

  return (
    <div className="space-y-2">
      {tests.map((test) => {
        const isOpen = openTest === test.test_id
        const concernCount = test.scales.filter((s) => s.tone === "negative").length
        const positiveCount = test.scales.filter((s) => s.tone === "positive").length
        return (
          <div key={test.test_id} className="rounded-lg border border-slate-200 overflow-hidden">
            <button
              onClick={() => setOpenTest(isOpen ? null : test.test_id)}
              className="w-full flex items-center gap-2 px-3 py-2.5 bg-slate-50/60 hover:bg-slate-100 transition text-left"
            >
              <span className={`text-slate-400 text-xs transition-transform shrink-0 ${isOpen ? "rotate-90" : ""}`}>▶</span>
              <span className="text-[13px] font-bold text-slate-900 shrink-0">{test.test_id}</span>
              <span className="text-[12px] font-semibold text-slate-600 flex-1 truncate">{test.korean_name}</span>
              <span className="rounded bg-white border border-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 shrink-0">척도 {test.scales.length}</span>
              <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium shrink-0 ${concernCount > 0 ? "bg-red-50 text-red-700 ring-1 ring-red-200" : "bg-slate-100 text-slate-500"}`}>주의 {concernCount}</span>
              <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium shrink-0 ${positiveCount > 0 ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-slate-100 text-slate-500"}`}>긍정 {positiveCount}</span>
            </button>
            {isOpen && (
              <div className="px-4 py-3.5 bg-white space-y-3">
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">척도 정의 ({test.scales.length}개)</div>
                  <ul className="space-y-1.5">
                    {test.scales.map((s) => (
                      <li key={s.code} className="text-[12px] leading-snug">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-[9px] font-mono text-slate-400 shrink-0">{s.code}</span>
                          <span className="font-semibold text-slate-800">{s.name}</span>
                        </div>
                        {s.facets.length > 0 && (
                          <ul className="ml-[34px] mt-1 space-y-0.5">
                            {s.facets.map((f) => (
                              <li key={f.code} className="text-[11px]">
                                <span className="text-slate-300">└ </span>
                                <span className="font-semibold text-slate-700">{f.name}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
                <button onClick={() => onSelectTest(test.test_id)} className="text-[11px] font-medium text-[hsl(215,70%,35%)] hover:underline">
                  {test.test_id} 결과 자세히 보기 →
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── TestComparisonChart ───────────────────────────────────────────────────────

function TestComparisonChart({ tests }: {
  tests: VirtualTest[]
}) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [svgWidth, setSvgWidth] = React.useState(1100)
  React.useLayoutEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(([e]) => setSvgWidth(Math.max(720, e.contentRect.width)))
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  const totalScales = tests.reduce((a, t) => a + t.scales.length, 0)
  const gapW = 32
  const pad = { l: 38, r: 20, t: 36, b: 64 }
  const innerW = Math.max(600, svgWidth - pad.l - pad.r)
  const innerH = 240
  const barAreaW = innerW - (tests.length - 1) * gapW
  const barSlot = barAreaW / totalScales
  const barW = Math.min(MAX_CHART_BAR_W, Math.max(8, barSlot * 0.62))
  const yFor = (value: number) => pad.t + innerH - (Math.min(100, Math.max(0, value)) / 100) * innerH
  const chartValue = (score: DisplayScore) => (
    score.value === null ? 0 : Math.min(100, Math.max(0, score.value))
  )
  const baseY = pad.t + innerH

  let runningIdx = 0

  return (
    <div ref={containerRef} className="w-full">
      <svg width={svgWidth} height={baseY + pad.b} className="block">
        {[0, 20, 40, 50, 60, 80, 100].map((tv) => (
          <g key={tv}>
            <line x1={pad.l} y1={yFor(tv)} x2={pad.l+innerW} y2={yFor(tv)}
              stroke={tv === 50 ? "#94a3b8" : "#e2e8f0"} strokeWidth={tv === 50 ? 1 : 0.8} strokeDasharray={tv === 50 ? "4 4" : ""} />
            <text x={pad.l-6} y={yFor(tv)+3} textAnchor="end" fontSize="10" fill="#94a3b8" fontWeight="500">{tv}</text>
          </g>
        ))}

        {tests.map((test, ti) => {
          const groupStart = pad.l + (runningIdx * barSlot) + (ti * gapW)
          const groupWidth = test.scales.length * barSlot
          const groupEnd = groupStart + groupWidth
          runningIdx += test.scales.length

          return (
            <g key={test.test_id}>
              <rect x={groupStart} y={6} width={groupWidth} height={22} fill="#f1f5f9" rx="4" />
              <text x={groupStart+groupWidth/2} y={21} textAnchor="middle" fontSize="11" fontWeight="700" fill="#0f172a">{test.test_id}</text>
              {ti < tests.length - 1 && (
                <line x1={groupEnd+gapW/2} y1={6} x2={groupEnd+gapW/2} y2={baseY+48}
                  stroke="#cbd5e1" strokeDasharray="3 4" strokeWidth="1" />
              )}
              {test.scales.map((s, si) => {
                const x = groupStart + si * barSlot + (barSlot - barW) / 2
                const score = displayScore(s)
                const value = chartValue(score)
                const y = yFor(value)
                const tc = toneColor(s.tone)
                const tn = s.name.length > 6 ? s.name.slice(0, 5) + "…" : s.name
                const label = displayScoreText(score)
                return (
                  <g key={s.code}>
                    <rect x={x} y={pad.t} width={barW} height={innerH} fill="transparent" />
                    <rect x={x} y={y} width={barW} height={baseY - y} fill={tc.accent} fillOpacity="0.92" rx="2" />
                    <text x={x+barW/2} y={Math.max(pad.t - 4, y - 4)} textAnchor="middle" fontSize="10" fontWeight="700" fill={tc.accent}>{label}</text>
                    <text x={x+barW/2} y={baseY+14} textAnchor="middle" fontSize="9" fill="#94a3b8" fontFamily="monospace">{s.code}</text>
                    <text x={x+barW/2} y={baseY+28} textAnchor="middle" fontSize="10" fill="#334155" fontWeight="500">{tn}</text>
                    <title>{`${test.test_id} · ${s.name}\n${displayScoreTitle(score)}, 백분위 ${s.percentile ?? "—"}%\n${s.category ?? ""} · ${dirLabel(s.direction)}`}</title>
                  </g>
                )
              })}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ── CrossTestBreakdown ────────────────────────────────────────────────────────

function BreakdownRow({ scale, level = 0, isParent = false }: {
  scale: AugmentedScale | AugmentedFacet; level?: number; isParent?: boolean
}) {
  const tc = toneColor(scale.tone)
  const score = displayScore(scale)
  return (
    <div
      className={`w-full grid gap-4 items-center px-2 py-2 ${isParent ? "bg-slate-50/40" : ""}`}
      style={{ gridTemplateColumns: "260px 1fr 88px 88px" }}
    >
      <div className="min-w-0 flex items-center gap-2" style={{ paddingLeft: level * 18 }}>
        {level > 0 && <span className="text-slate-300 text-xs leading-none">└</span>}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className={`truncate ${level > 0 ? "text-[12px] text-slate-700" : isParent ? "text-[13px] font-semibold text-slate-900" : "text-[13px] font-medium text-slate-800"}`}>{scale.name}</span>
            <span className="text-[9px] font-mono text-slate-400 shrink-0">{scale.code}</span>
          </div>
          <div className="mt-0.5"><DirectionTag direction={scale.direction} /></div>
        </div>
      </div>
      <div className="min-w-0 pt-3">
        <ZoneBar tScore={score.plotValue} direction={scale.direction} height={level > 0 ? "sm" : "md"} showTicks={false} valueLabel={displayScoreText(score)} />
      </div>
      <div className="text-right">
        <div className={`text-base font-bold tabular-nums leading-none ${tc.text}`}>{displayScoreText(score)}</div>
        <div className="text-[9px] text-slate-400 mt-0.5">{scale.percentile != null ? `${typeof scale.percentile === "number" ? scale.percentile.toFixed(0) : scale.percentile}%ile` : "—"}</div>
      </div>
      <div className="text-right"><CategoryBadge category={scale.category} tone={scale.tone} /></div>
    </div>
  )
}

function CrossTestBreakdown({ tests, onSelectTest }: {
  tests: VirtualTest[]
  onSelectTest: (tid: string) => void
}) {
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({})

  return (
    <div className="space-y-4">
      {tests.map((test, ti) => {
        const concerns = test.scales.filter((s) => s.tone === "negative").length
        const meanScore = meanDisplayScore(test.scales)
        const isCollapsed = !!collapsed[test.test_id]
        return (
          <div key={test.test_id} className="rounded-lg border border-slate-200 overflow-hidden">
            <div className="flex items-stretch bg-slate-50/80 hover:bg-slate-100 transition">
              <button
                onClick={() => setCollapsed((c) => ({ ...c, [test.test_id]: !c[test.test_id] }))}
                className="flex-1 flex items-center gap-3 px-3 py-2.5 text-left"
              >
                <span className={`text-slate-400 text-xs transition-transform ${isCollapsed ? "" : "rotate-90"}`}>▶</span>
                <div className="w-7 h-7 rounded-md bg-[hsl(215,70%,35%)] text-white flex items-center justify-center text-[11px] font-bold tabular-nums shrink-0">
                  {String(ti + 1).padStart(2, "0")}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[13px] font-bold text-slate-900">{test.test_id}</span>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {test.scales.length}개 척도 · 평균 {meanScore}
                    {concerns > 0 && <span className="ml-1.5 text-red-600 font-semibold">· 주의 {concerns}</span>}
                  </div>
                </div>
              </button>
              <button
                onClick={() => onSelectTest(test.test_id)}
                className="px-3 text-[11px] font-medium text-[hsl(215,70%,35%)] hover:bg-blue-50 transition shrink-0 border-l border-slate-200"
              >
                {test.test_id} 탭으로 →
              </button>
            </div>
            {!isCollapsed && (
              <div className="divide-y divide-slate-100">
                {test.scales.map((s) => (
                  <React.Fragment key={s.code}>
                    <BreakdownRow scale={s} isParent={s.facets.length > 0} />
                    {s.facets.map((f) => (
                      <BreakdownRow key={f.code} scale={f} level={1} />
                    ))}
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── OverviewTab ───────────────────────────────────────────────────────────────

function OverviewTab({ tests, onSelectTest }: {
  tests: VirtualTest[]
  onSelectTest: (tid: string) => void
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <SectionCard title="실시한 검사 정보" subtitle="검사별 척도와 구성을 확인합니다.">
          <TestInfoPanel tests={tests} onSelectTest={onSelectTest} />
        </SectionCard>
        <SectionCard title="핵심 발견" subtitle="기준값 50에서 가장 멀리 떨어진 척도들을 자동 추출.">
          <Highlights tests={tests} />
        </SectionCard>
      </div>

      <SectionCard
        title="검사별 결과 한눈에"
        subtitle="표준화 점수는 T값, 표준화 점수가 없는 검사는 P백분위로 표시합니다."
        action={
          <div className="flex items-center gap-3 text-[10px] text-slate-500">
            <Legend color="#dc2626" label="우려" />
            <Legend color="#64748b" label="보통" />
            <Legend color="#059669" label="양호" />
          </div>
        }
      >
        <TestComparisonChart tests={tests} />
      </SectionCard>

      <SectionCard
        title="검사 간 비교"
        subtitle="T점수 또는 P백분위 위치를 방향성 기준 색상으로 비교합니다."
        action={
          <div className="flex items-center gap-3 text-[10px] text-slate-500">
            <Legend color="#86efac" label="양호" />
            <Legend color="#fcd34d" label="경계" />
            <Legend color="#f87171" label="우려" />
          </div>
        }
      >
        <CrossTestBreakdown tests={tests} onSelectTest={onSelectTest} />
      </SectionCard>
    </div>
  )
}

// ── TestHierarchyChart ────────────────────────────────────────────────────────

function TestHierarchyChart({ test }: {
  test: VirtualTest
}) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [svgWidth, setSvgWidth] = React.useState(960)
  React.useLayoutEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(([e]) => setSvgWidth(Math.max(640, e.contentRect.width)))
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  const parents = test.scales
  const facetGroups = parents.filter((p) => p.facets.length > 0).map((p) => ({ parent: p, facets: p.facets }))

  const pad = { l: 50, r: 20, t: 44, b: 60 }
  const innerH = 240
  const panelGap = 18
  const minSlotW = 78
  const totalSlots = parents.length + facetGroups.reduce((a, g) => a + g.facets.length, 0)
  const totalGap = facetGroups.length * panelGap
  const slotW = Math.max(minSlotW, Math.max(0, svgWidth - pad.l - pad.r - totalGap) / Math.max(1, totalSlots))
  const innerW = totalSlots * slotW + totalGap
  const svgW = innerW + pad.l + pad.r
  const yFor = (value: number) => pad.t + innerH - (Math.min(100, Math.max(0, value)) / 100) * innerH
  const chartValue = (score: DisplayScore) => (
    score.value === null ? 0 : Math.min(100, Math.max(0, score.value))
  )
  const baseY = pad.t + innerH
  const trunc = (n: string, max = 7) => n.length > max ? n.slice(0, max - 1) + "…" : n

  let cursor = pad.l
  const parentPanel = { start: cursor, width: parents.length * slotW }
  cursor += parentPanel.width
  const fpLayouts = facetGroups.map((g) => {
    cursor += panelGap
    const w = g.facets.length * slotW
    const layout = { ...g, start: cursor, width: w }
    cursor += w
    return layout
  })

  return (
    <div ref={containerRef} className="w-full overflow-x-auto">
      <svg width={svgW} height={baseY + pad.b} className="block">
        {[0, 20, 40, 50, 60, 80, 100].map((tv) => (
          <g key={tv}>
            <line x1={pad.l} y1={yFor(tv)} x2={pad.l+innerW} y2={yFor(tv)}
              stroke={tv === 50 ? "#94a3b8" : "#e2e8f0"} strokeWidth={tv === 50 ? 1 : 0.7} strokeDasharray={tv === 50 ? "4 4" : ""} />
            <text x={pad.l-6} y={yFor(tv)+3} textAnchor="end" fontSize="10" fill="#94a3b8" fontWeight="500">{tv}</text>
          </g>
        ))}

        <rect x={parentPanel.start} y={pad.t-28} width={parentPanel.width} height={20} fill="#f1f5f9" rx="4" />
        <text x={parentPanel.start+parentPanel.width/2} y={pad.t-14} textAnchor="middle" fontSize="10" fontWeight="700" fill="#475569">주요 척도 · 막대</text>

        {parents.map((p, i) => {
          const x = parentPanel.start + i * slotW
          const bw = Math.min(MAX_CHART_BAR_W, Math.max(8, slotW * 0.4))
          const bx = x + (slotW - bw) / 2
          const score = displayScore(p)
          const value = chartValue(score)
          const y = yFor(value)
          const tc = toneColor(p.tone)
          const label = displayScoreText(score)
          return (
            <g key={p.code}>
              <rect x={bx} y={y} width={bw} height={baseY - y} fill={tc.accent} fillOpacity="0.92" rx="3" />
              <text x={x+slotW/2} y={Math.max(pad.t - 5, y - 5)} textAnchor="middle" fontSize="11" fontWeight="700" fill={tc.accent}>{label}</text>
              <text x={x+slotW/2} y={baseY+14} textAnchor="middle" fontSize="9" fill="#94a3b8" fontFamily="monospace">{p.code}</text>
              <text x={x+slotW/2} y={baseY+28} textAnchor="middle" fontSize="11" fill="#334155" fontWeight="500">{trunc(p.name)}</text>
              <title>{`${p.name}\n${displayScoreTitle(score)}, 백분위 ${p.percentile ?? "—"}%\n${p.category ?? ""} · ${dirLabel(p.direction)}`}</title>
            </g>
          )
        })}

        {fpLayouts.map((fp) => {
          const divX = fp.start - panelGap / 2
          const lpad = Math.max(28, fp.width * 0.18)
          const usable = Math.max(0, fp.width - 2 * lpad)
          const xFacet = (i: number) => fp.facets.length === 1 ? fp.start + fp.width / 2 : fp.start + lpad + (i / (fp.facets.length - 1)) * usable
          const pts = fp.facets.map((f, i) => [xFacet(i), yFor(chartValue(displayScore(f))), f] as [number, number, AugmentedFacet])
          const pathD = pts.length >= 2 ? "M " + pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" L ") : null
          const parentScore = displayScore(fp.parent)
          const parentY = parentScore.value != null ? yFor(chartValue(parentScore)) : null

          return (
            <g key={fp.parent.code}>
              <line x1={divX} y1={pad.t-32} x2={divX} y2={baseY+36} stroke="#cbd5e1" strokeDasharray="3 4" strokeWidth="1" />
              <rect x={fp.start} y={pad.t-28} width={fp.width} height={20} fill="#fef3c7" rx="4" opacity="0.6" />
              <text x={fp.start+fp.width/2} y={pad.t-14} textAnchor="middle" fontSize="10" fontWeight="700" fill="#854d0e">{fp.parent.name} 하위척도 · 꺾은선</text>
              {parentY != null && (
                <g>
                  <line x1={fp.start+6} y1={parentY} x2={fp.start+fp.width-6} y2={parentY} stroke="#1e40af" strokeWidth="1.3" strokeDasharray="5 3" opacity="0.5" />
                  <text x={fp.start+fp.width-8} y={parentY-4} textAnchor="end" fontSize="9" fontWeight="700" fill="#1e40af">부모 {displayScoreLabel(parentScore)}</text>
                </g>
              )}
              {pathD && <path d={pathD} fill="none" stroke="#0f172a" strokeWidth="2" strokeLinejoin="round" />}
              {pts.map(([x, y, f]) => {
                const tc = toneColor(f.tone)
                const score = displayScore(f)
                const label = displayScoreText(score)
                return (
                  <g key={f.code}>
                    <circle cx={x} cy={y} r="7" fill="#fff" stroke={tc.accent} strokeWidth="2.5" />
                    <circle cx={x} cy={y} r="3.5" fill={tc.accent} />
                    <text x={x} y={y-12} textAnchor="middle" fontSize="11" fontWeight="700" fill={tc.accent}>{label}</text>
                    <text x={x} y={baseY+14} textAnchor="middle" fontSize="9" fill="#94a3b8" fontFamily="monospace">{f.code}</text>
                    <text x={x} y={baseY+28} textAnchor="middle" fontSize="11" fill="#334155" fontWeight="500">{trunc(f.name)}</text>
                    <title>{`${f.name}\n${displayScoreTitle(score)}, 백분위 ${f.percentile ?? "—"}%\n${f.category ?? ""} · ${dirLabel(f.direction)}`}</title>
                  </g>
                )
              })}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ── TestInterpretationList ────────────────────────────────────────────────────

function TestInterpretationList({ test }: {
  test: VirtualTest
}) {
  return (
    <div className="space-y-3">
      {test.scales.map((s) => {
        const tc = toneColor(s.tone)
        const score = displayScore(s)
        return (
          <div key={s.code} className="rounded-lg border border-slate-200 overflow-hidden">
            <div className="w-full px-4 py-3 bg-slate-50/60 flex items-center gap-3">
              <span className="text-[10px] font-mono bg-white border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded shrink-0">{s.code}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[14px] font-bold text-slate-900">{s.name}</span>
                  <DirectionTag direction={s.direction} />
                </div>
              </div>
              <span className={`text-base font-bold tabular-nums leading-none shrink-0 ${tc.text}`}>{displayScoreLabel(score)}</span>
              <CategoryBadge category={s.category} tone={s.tone} size="md" />
            </div>
            {s.interpretation && (
              <div className={`px-4 py-3 border-l-4 ${tonePanelClass(s.tone)}`}>
                <p className="text-[13px] leading-relaxed text-slate-700">{s.interpretation}</p>
              </div>
            )}
            {s.facets.map((f) => {
              const fc = toneColor(f.tone)
              const facetScore = displayScore(f)
              return (
                <div key={f.code} className="border-t border-slate-100 pl-8">
                  <div className="w-full px-3 py-2.5 flex items-center gap-3">
                    <span className="text-slate-300 text-xs">└</span>
                    <span className="text-[9px] font-mono text-slate-400 shrink-0">{f.code}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[12px] font-semibold text-slate-800">{f.name}</span>
                        <DirectionTag direction={f.direction} />
                      </div>
                    </div>
                    <span className={`text-[13px] font-bold tabular-nums leading-none shrink-0 ${fc.text}`}>{displayScoreLabel(facetScore)}</span>
                    <CategoryBadge category={f.category} tone={f.tone} />
                  </div>
                  {f.interpretation && (
                    <div className={`mx-3 mb-3 ml-12 border-l-4 px-3 py-2 ${tonePanelClass(f.tone)}`}>
                      <p className="text-[12px] leading-relaxed text-slate-600">{f.interpretation}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

// ── TestTab ───────────────────────────────────────────────────────────────────

function TestTab({ test }: {
  test: VirtualTest
}) {
  const concerns = test.scales.filter((s) => s.tone === "negative")
  const meanScore = meanDisplayScore(test.scales)

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{test.test_id}</span>
              <span className="text-[11px] text-slate-500">{test.scales.length}개 척도</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900">{test.test_id}</h1>
          </div>
          <div className="grid grid-cols-2 gap-2 shrink-0">
            <Metric label="주의 척도" value={concerns.length} tone={concerns.length > 0 ? "negative" : "neutral"} />
            <Metric label="평균 점수" value={meanScore} />
          </div>
        </div>
      </div>

      <SectionCard title="결과 차트" subtitle="주요 척도는 막대로, 하위척도는 꺾은선으로 표시합니다.">
        <TestHierarchyChart test={test} />
      </SectionCard>

      <SectionCard title="척도별 해석" subtitle="각 척도의 점수와 그 의미.">
        <TestInterpretationList test={test} />
      </SectionCard>
    </div>
  )
}

// ── ReportDashboard ───────────────────────────────────────────────────────────

function ReportDashboard({ data }: { data: ReportData }) {
  const [activeTab, setActiveTab] = React.useState("overview")
  const tests = React.useMemo(() => groupScalesByTestId(data.scales, data.test_names), [data.scales, data.test_names])

  return (
    <div className="relative flex flex-col h-screen bg-slate-50 print:h-auto">
      <ProfileHeader data={data} />

      <div className="border-b border-slate-200 bg-white px-6">
        <div className="max-w-[1180px] mx-auto">
          <nav className="flex gap-1 -mb-px">
            <TabButton label="전체 비교" sub={`${tests.length}개 검사`} active={activeTab === "overview"} onClick={() => setActiveTab("overview")} />
            {tests.map((test) => {
              const concernCount = test.scales.filter((s) => s.tone === "negative").length
              return (
                <TabButton
                  key={test.test_id}
                  label={test.test_id}
                  sub={`${test.scales.length}개 척도`}
                  badge={concernCount > 0 ? concernCount : null}
                  badgeTone={concernCount > 0 ? "negative" : "neutral"}
                  active={activeTab === test.test_id}
                  onClick={() => setActiveTab(test.test_id)}
                />
              )
            })}
          </nav>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto print:overflow-visible">
        <div className="max-w-[1180px] mx-auto px-8 py-6">
          {activeTab === "overview" ? (
            <OverviewTab tests={tests} onSelectTest={setActiveTab} />
          ) : (
            (() => {
              const test = tests.find((t) => t.test_id === activeTab)
              if (!test) return null
              return <TestTab test={test} />
            })()
          )}
        </div>
      </main>
    </div>
  )
}

// ── Public / Admin entrypoints ────────────────────────────────────────────────

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
        setError("not_found"); setLoading(false); return
      }
      if (mode === "token" && !token) {
        setError("not_found"); setLoading(false); return
      }

      const url = mode === "token"
        ? `/api/report/by-submission/${targetSubmissionId}?token=${encodeURIComponent(token)}`
        : `/api/admin/report/${targetSubmissionId}`

      try {
        const response = await fetch(url, { signal: controller.signal })
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) {
          if (canUseLocalReportPreview(mode)) {
            setData(localReportPreview(targetSubmissionId))
            return
          }
          setError(response.status === 401 ? "login_required" : "network_error"); return
        }
        if (isReportData(payload)) { setData(payload); return }
        if (canUseLocalReportPreview(mode)) {
          setData(localReportPreview(targetSubmissionId))
          return
        }
        setError(typeof payload.error === "string" ? payload.error : "network_error")
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          if (canUseLocalReportPreview(mode)) {
            setData(localReportPreview(targetSubmissionId))
            return
          }
          setError("network_error")
        }
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
          <div className="size-8 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-3"
            style={{ borderColor: BRAND_HEX, borderTopColor: "transparent" }} />
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
  const c = value as Partial<ReportData>
  return (
    typeof c.submission_id === "number" &&
    typeof c.test_name === "string" &&
    typeof c.test_date === "string" &&
    !!c.profile &&
    typeof c.profile === "object" &&
    Array.isArray(c.scales)
  )
}
