import * as React from "react"
import { Link } from "react-router-dom"
import { IconClipboardList, IconUsers, IconChartBar, IconArrowRight } from "@tabler/icons-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface DashboardSummary {
  total_clients: number
  running_tests: number
  not_started_clients: number
  today_assessments: number
}

interface ClientItem {
  id: number
  name: string
  created_at: string
  status: string
}

interface TestItem {
  id: number
  custom_test_name: string
  test_id: string
  assigned_count: number
  assessed_count: number
  progress_status: string
}

interface StatItem {
  date: string
  count: number
}

interface DashboardData {
  summary: DashboardSummary
  clients: ClientItem[]
  tests?: TestItem[]
  stats?: StatItem[]
}

export function Dashboard() {
  const [data, setData] = React.useState<DashboardData | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState("")

  React.useEffect(() => {
    fetch("/api/admin/dashboard")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setError("데이터를 불러올 수 없습니다."))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex flex-col gap-6 p-6 overflow-auto">
      <div>
        <h2 className="text-xl font-semibold text-foreground">대시보드</h2>
        <p className="text-sm text-muted-foreground mt-0.5">운영 현황을 확인합니다</p>
      </div>

      {loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="h-4 w-24 rounded bg-muted animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 rounded bg-muted animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <IconUsers className="size-4" />
                  <CardTitle className="text-sm font-medium">전체 내담자</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{data.summary.total_clients}</p>
                <p className="text-xs text-muted-foreground mt-1">등록된 내담자 수</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <IconClipboardList className="size-4" />
                  <CardTitle className="text-sm font-medium">운영 중 검사</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{data.summary.running_tests}</p>
                <p className="text-xs text-muted-foreground mt-1">현재 진행 중인 검사 수</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <IconChartBar className="size-4" />
                  <CardTitle className="text-sm font-medium">미실시 내담자</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{data.summary.not_started_clients}</p>
                <p className="text-xs text-muted-foreground mt-1">검사 미완료 내담자</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <IconChartBar className="size-4" />
                  <CardTitle className="text-sm font-medium">오늘 실시</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{data.summary.today_assessments}</p>
                <p className="text-xs text-muted-foreground mt-1">오늘 완료된 검사</p>
              </CardContent>
            </Card>
          </div>

          {data.clients && data.clients.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">내담자 현황</CardTitle>
                  <Button variant="ghost" size="sm" asChild className="h-7 gap-1 text-xs">
                    <Link to="/admin/clients">
                      전체 보기 <IconArrowRight className="size-3" />
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-col divide-y">
                  {data.clients.slice(0, 5).map((client) => (
                    <div key={client.id} className="flex items-center justify-between py-2.5">
                      <Link
                        to={`/admin/clients/${client.id}`}
                        className="text-sm font-medium hover:underline"
                      >
                        {client.name}
                      </Link>
                      <Badge
                        variant={
                          client.status === "실시완료"
                            ? "success"
                            : client.status === "실시중"
                            ? "warning"
                            : "secondary"
                        }
                        className="text-xs"
                      >
                        {client.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">운영 검사 진행</CardTitle>
                  <Button variant="ghost" size="sm" asChild className="h-7 gap-1 text-xs">
                    <Link to="/admin/create">
                      검사 관리 <IconArrowRight className="size-3" />
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {data.tests && data.tests.length > 0 ? (
                  <div className="flex flex-col divide-y">
                    {data.tests.slice(0, 8).map((test) => {
                      const progress = test.assigned_count > 0
                        ? Math.round((test.assessed_count / test.assigned_count) * 100)
                        : 0
                      return (
                        <div key={test.id} className="py-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <Link to={`/admin/create/${test.id}`} className="truncate text-sm font-medium hover:underline">
                                {test.custom_test_name}
                              </Link>
                              <p className="text-xs text-muted-foreground">{test.test_id}</p>
                            </div>
                            <Badge variant={test.progress_status === "실시" ? "success" : test.progress_status === "종료" ? "secondary" : "warning"} className="text-xs">
                              {test.progress_status}
                            </Badge>
                          </div>
                          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                            <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(progress, 100)}%` }} />
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            배정 {test.assigned_count}명 · 완료 {test.assessed_count}명 · 진행률 {progress}%
                          </p>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="py-8 text-center text-sm text-muted-foreground">운영 중인 검사가 없습니다.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">최근 실시 추이</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {data.stats && data.stats.length > 0 ? (
                  <div className="flex h-48 items-end gap-2">
                    {data.stats.map((item) => {
                      const maxCount = Math.max(...(data.stats ?? []).map((stat) => stat.count), 1)
                      const height = Math.max(item.count > 0 ? 10 : 3, Math.round((item.count / maxCount) * 100))
                      return (
                        <div key={item.date} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                          {item.count > 0 && (
                            <span className="text-[10px] font-medium text-primary">{item.count}</span>
                          )}
                          <div className="flex h-32 w-full items-end rounded bg-muted/40">
                            <div
                              className="w-full rounded bg-primary/80"
                              style={{ height: `${height}%` }}
                              title={`${item.date}: ${item.count}건`}
                            />
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(item.date).getDate()}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="py-8 text-center text-sm text-muted-foreground">실시 기록이 없습니다.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
