import * as React from "react"
import { Link } from "react-router-dom"
import { IconChevronDown, IconChevronUp, IconFileDescription } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScaleBar } from "./ScaleBar"

interface ScaleScore {
  scale_key: string
  scale_name: string
  raw_score: number | null
  t_score: number | null
  percentile: number | null
  level?: string
}

export interface TestResultGroup {
  test_name: string
  assessed_on: string | null
  scales: ScaleScore[]
}

type BadgeVariant = "default" | "secondary" | "destructive" | "outline" | "success" | "warning"

function levelVariant(level?: string): BadgeVariant {
  if (!level) return "secondary"
  const l = level.toLowerCase()
  if (l.includes("높") || l.includes("high")) return "destructive"
  if (l.includes("보통") || l.includes("average")) return "success"
  if (l.includes("낮") || l.includes("low")) return "outline"
  return "secondary"
}

function reportLinksFor(testName: string): string[] {
  const upper = testName.toUpperCase()
  return [
    upper.includes("GOLDEN") ? "GOLDEN" : "",
    upper.includes("STS") ? "STS" : "",
  ].filter(Boolean)
}

interface TestResultCardProps {
  group: TestResultGroup
  clientId: string
  collapsed: boolean
  onToggleCollapse: () => void
}

export function TestResultCard({
  group,
  clientId,
  collapsed,
  onToggleCollapse,
}: TestResultCardProps): React.ReactElement {
  const reportLinks = reportLinksFor(group.test_name)

  return (
    <Card className="print:[break-inside:avoid] print:[page-break-inside:avoid]">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          {/* 좌: 검사명 + 종류 chip */}
          <div className="flex items-center gap-2 flex-wrap">
            <CardTitle className="text-sm font-semibold">{group.test_name}</CardTitle>
            {reportLinks.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {reportLinks.join(" / ")}
              </Badge>
            )}
          </div>
          {/* 우: 상태 Badge + 검사일 Badge + 접기 + 리포트 버튼 */}
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            <Badge
              variant={group.scales.length ? "success" : "warning"}
              className="text-xs"
            >
              {group.scales.length ? "결과 준비" : "채점 대기"}
            </Badge>
            {group.assessed_on && (
              <Badge variant="secondary" className="text-xs">
                {new Date(group.assessed_on).toLocaleDateString("ko-KR")}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="size-7 print:hidden"
              onClick={onToggleCollapse}
              aria-label={collapsed ? "검사 결과 펼치기" : "검사 결과 접기"}
            >
              {collapsed ? (
                <IconChevronDown className="size-4" />
              ) : (
                <IconChevronUp className="size-4" />
              )}
            </Button>
            {reportLinks.map((report) => (
              <Button
                key={report}
                variant="ghost"
                size="sm"
                asChild
                className="h-7 px-2 text-xs print:hidden"
              >
                <Link
                  to={`/admin/artifact-viewer?report=${report}&id=${encodeURIComponent(clientId)}`}
                >
                  <IconFileDescription className="size-4" />
                  {report}
                </Link>
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className={collapsed ? "hidden" : "pt-0"}>
        {group.scales.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-muted/30 px-4 py-6 flex flex-col items-center gap-1.5">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              채점 대기
            </span>
            <span className="text-xs text-muted-foreground">
              척도 점수가 아직 산출되지 않았습니다.
            </span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground text-xs">
                  <th className="text-left py-2 pr-4 font-medium">척도</th>
                  <th className="hidden sm:table-cell text-right py-2 px-4 font-medium">
                    원점수
                  </th>
                  <th className="text-right py-2 px-4 font-medium">T점수</th>
                  <th className="hidden sm:table-cell text-right py-2 px-4 font-medium">
                    백분위
                  </th>
                  <th className="text-right py-2 pl-4 font-medium">수준</th>
                </tr>
              </thead>
              <tbody>
                {group.scales.map((s, si) => (
                  <tr key={si} className="border-b last:border-0 hover:bg-muted/40">
                    <td className="py-2.5 pr-4 font-medium">{s.scale_name}</td>
                    <td className="hidden sm:table-cell py-2.5 px-4 text-right tabular-nums">
                      {s.raw_score ?? "—"}
                    </td>
                    {/* T점수 셀: sm 이상 숫자+막대, sm 미만 숫자만 */}
                    <td className="py-2.5 px-4">
                      <div className="hidden sm:flex items-center justify-end gap-2">
                        <span className="tabular-nums text-sm w-8 text-right">
                          {s.t_score ?? "—"}
                        </span>
                        {s.t_score !== null && (
                          <div className="print:hidden">
                            <ScaleBar tScore={s.t_score} />
                          </div>
                        )}
                      </div>
                      <span className="tabular-nums text-sm sm:hidden block text-right">
                        {s.t_score ?? "—"}
                      </span>
                    </td>
                    <td className="hidden sm:table-cell py-2.5 px-4 text-right tabular-nums">
                      {s.percentile != null ? `${s.percentile}%` : "—"}
                    </td>
                    <td className="py-2.5 pl-4 text-right">
                      {s.level ? (
                        <Badge variant={levelVariant(s.level)} className="text-xs">
                          {s.level}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
