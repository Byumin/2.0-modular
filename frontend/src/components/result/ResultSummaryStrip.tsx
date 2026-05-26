import * as React from "react"

interface ResultSummaryStripProps {
  totalTests: number
  latestDate: string | null
  avgTScore: number | null
  warningScaleCount: number
}

export function ResultSummaryStrip({
  totalTests,
  latestDate,
  avgTScore,
  warningScaleCount,
}: ResultSummaryStripProps): React.ReactElement {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 rounded-xl border bg-muted/40 px-6 py-4 print:bg-transparent print:border-none">
      <div className="flex flex-col gap-0.5">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          검사 수
        </span>
        <span className="text-xl font-semibold tabular-nums">{totalTests}</span>
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          최근 검사일
        </span>
        <span className="text-xl font-semibold tabular-nums">
          {latestDate ?? "—"}
        </span>
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          평균 T점수
        </span>
        <span className="text-xl font-semibold tabular-nums">
          {avgTScore !== null ? avgTScore.toFixed(1) : "—"}
        </span>
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          주의 척도 수
        </span>
        <span className="text-xl font-semibold tabular-nums">
          {warningScaleCount}
        </span>
      </div>
    </div>
  )
}
