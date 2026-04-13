import * as React from "react"
import { Link, useParams, useNavigate } from "react-router-dom"
import { IconArrowLeft, IconFileDescription } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface ScaleScore {
  scale_key: string
  scale_name: string
  raw_score: number | null
  t_score: number | null
  percentile: number | null
  level?: string
}

interface TestResultGroup {
  test_name: string
  assessed_on: string | null
  scales: ScaleScore[]
}

interface ClientSummary {
  name: string
  gender: string
  birth_day: string | null
  age?: number
}

type BadgeVariant = "default" | "secondary" | "destructive" | "outline" | "success" | "warning"

interface AssessmentLog {
  custom_test_name?: string
  assessed_on: string | null
  scale_scores?: ScaleScore[]
}

const levelVariant = (level?: string): BadgeVariant => {
  if (!level) return "secondary"
  const l = level.toLowerCase()
  if (l.includes("높") || l.includes("high")) return "destructive"
  if (l.includes("보통") || l.includes("average")) return "success"
  if (l.includes("낮") || l.includes("low")) return "outline"
  return "secondary"
}

function reportLinksFor(testName: string) {
  const upper = testName.toUpperCase()
  return [
    upper.includes("GOLDEN") ? "GOLDEN" : "",
    upper.includes("STS") ? "STS" : "",
  ].filter(Boolean)
}

export function ClientResult() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [summary, setSummary] = React.useState<ClientSummary | null>(null)
  const [results, setResults] = React.useState<TestResultGroup[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState("")

  React.useEffect(() => {
    if (!id) return
    setLoading(true)
    fetch(`/api/admin/clients/${id}`)
      .then((r) => r.json())
      .then((data) => {
        const item = data.item || data
        setSummary({
          name: item.name,
          gender: item.gender,
          birth_day: item.birth_day,
          age: item.age,
        })
        const groups: TestResultGroup[] = ((item.assessment_logs ?? []) as AssessmentLog[]).map((log) => ({
          test_name: log.custom_test_name ?? "검사",
          assessed_on: log.assessed_on,
          scales: log.scale_scores ?? [],
        }))
        setResults(groups)
      })
      .catch(() => setError("결과를 불러올 수 없습니다."))
      .finally(() => setLoading(false))
  }, [id])

  return (
    <div className="flex flex-col gap-6 p-6 overflow-auto">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => navigate(`/admin/clients/${id}`)}
        >
          <IconArrowLeft className="size-4" />
        </Button>
        <div>
          <h2 className="text-xl font-semibold">
            {summary ? `${summary.name} — 검사 결과` : "검사 결과"}
          </h2>
          {summary && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {summary.gender === "male" ? "남성" : summary.gender === "female" ? "여성" : summary.gender}
              {summary.birth_day && ` · ${summary.birth_day}`}
              {summary.age != null && ` · 만 ${summary.age}세`}
            </p>
          )}
        </div>
        {id && (
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to={`/admin/artifact-viewer?report=GOLDEN&id=${encodeURIComponent(id)}`}>
                <IconFileDescription className="size-4" />
                GOLDEN 리포트
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to={`/admin/artifact-viewer?report=STS&id=${encodeURIComponent(id)}`}>
                <IconFileDescription className="size-4" />
                STS 리포트
              </Link>
            </Button>
          </div>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
          불러오는 중...
        </div>
      )}

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {!loading && !error && results.length === 0 && (
        <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
          검사 결과가 없습니다.
        </div>
      )}

      {results.map((group, gi) => (
        <Card key={gi}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium">{group.test_name}</CardTitle>
                <div className="mt-1 flex flex-wrap gap-1">
                  {id && reportLinksFor(group.test_name).map((report) => (
                    <Button key={report} variant="ghost" size="sm" asChild className="h-6 px-2 text-xs">
                      <Link to={`/admin/artifact-viewer?report=${report}&id=${encodeURIComponent(id)}`}>
                        {report} 리포트 열기
                      </Link>
                    </Button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={group.scales.length ? "success" : "warning"} className="text-xs">
                  {group.scales.length ? "결과 준비" : "채점 대기"}
                </Badge>
                {group.assessed_on && (
                  <Badge variant="secondary" className="text-xs">
                    {new Date(group.assessed_on).toLocaleDateString("ko-KR")}
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {group.scales.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">척도 데이터가 없습니다.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground text-xs">
                      <th className="text-left py-2 pr-4 font-medium">척도</th>
                      <th className="text-right py-2 px-4 font-medium">원점수</th>
                      <th className="text-right py-2 px-4 font-medium">T점수</th>
                      <th className="text-right py-2 px-4 font-medium">백분위</th>
                      <th className="text-right py-2 pl-4 font-medium">수준</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.scales.map((s, si) => (
                      <tr key={si} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="py-2.5 pr-4 font-medium">{s.scale_name}</td>
                        <td className="py-2.5 px-4 text-right tabular-nums">
                          {s.raw_score ?? "-"}
                        </td>
                        <td className="py-2.5 px-4 text-right tabular-nums">
                          {s.t_score ?? "-"}
                        </td>
                        <td className="py-2.5 px-4 text-right tabular-nums">
                          {s.percentile != null ? `${s.percentile}%` : "-"}
                        </td>
                        <td className="py-2.5 pl-4 text-right">
                          {s.level ? (
                            <Badge variant={levelVariant(s.level)} className="text-xs">
                              {s.level}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
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
      ))}
    </div>
  )
}
