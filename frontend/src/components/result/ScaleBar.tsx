import * as React from "react"

interface ScaleBarProps {
  tScore: number
}

function tScoreToPercent(t: number): number {
  const min = 20, max = 80
  return Math.min(100, Math.max(0, ((t - min) / (max - min)) * 100))
}

function tScoreBarColor(t: number): string {
  if (t >= 60) return "bg-destructive/80"
  if (t >= 40) return "bg-primary/70"
  return "bg-muted-foreground/50"
}

export function ScaleBar({ tScore }: ScaleBarProps): React.ReactElement {
  return (
    <div
      className="w-20 h-1.5 rounded-full bg-muted relative shrink-0"
      aria-hidden="true"
    >
      {/* 50점 기준 마커 */}
      <div className="absolute top-0 bottom-0 left-1/2 w-px bg-border" />
      {/* 채움 막대 */}
      <div
        className={`absolute top-0 bottom-0 left-0 rounded-full ${tScoreBarColor(tScore)}`}
        style={{ width: `${tScoreToPercent(tScore)}%` }}
      />
    </div>
  )
}
