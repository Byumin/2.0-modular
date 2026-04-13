import * as React from "react"
import { useSearchParams } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface HierarchyItem {
  code: string
  name: string
  score?: number | null
  children?: HierarchyItem[]
}

interface ReportContext {
  custom_test_name?: string
  hierarchy?: HierarchyItem[]
}

const REPORTS = {
  GOLDEN: { title: "GOLDEN 성격유형검사 리포트", path: "/artifacts/GOLDEN.html" },
  STS: { title: "STS 6요인 기질검사 리포트", path: "/artifacts/STS.html" },
} as const

function renderHierarchy(items: HierarchyItem[] = []) {
  if (!items.length) {
    return <p className="text-sm text-muted-foreground">점수 구조가 없습니다.</p>
  }

  return (
    <div className="flex flex-col divide-y">
      {items.map((item) => (
        <div key={item.code || item.name} className="py-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium">{item.name || item.code}</span>
            <span className="text-xs text-muted-foreground">{item.score ?? "-"}</span>
          </div>
          {item.children && item.children.length > 0 && (
            <div className="mt-2 flex flex-col gap-1 pl-3">
              {item.children.map((child) => (
                <div key={child.code || child.name} className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                  <span>{child.name || child.code}</span>
                  <span>{child.score ?? "-"}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export function ArtifactViewer() {
  const [searchParams] = useSearchParams()
  const report = (searchParams.get("report") || "").toUpperCase()
  const clientId = searchParams.get("id") || ""
  const selected = REPORTS[report as keyof typeof REPORTS]
  const reportSrc = React.useMemo(() => selected ? `${selected.path}?v=${Date.now()}` : "", [selected])
  const [context, setContext] = React.useState<ReportContext | null>(null)
  const [message, setMessage] = React.useState("점수 구조를 불러오는 중입니다.")

  React.useEffect(() => {
    if (!selected || !clientId) {
      setMessage("리포트 또는 내담자 ID가 없습니다.")
      return
    }

    fetch(`/api/admin/clients/${encodeURIComponent(clientId)}/report-llm-context?report=${encodeURIComponent(report)}`)
      .then((res) => res.ok ? res.json() : Promise.reject(new Error("점수 구조를 불러오지 못했습니다.")))
      .then((data) => {
        setContext(data)
        setMessage("")
      })
      .catch((error) => {
        setMessage(error instanceof Error ? error.message : "점수 구조를 불러오지 못했습니다.")
      })
  }, [clientId, report, selected])

  if (!selected) {
    return (
      <div className="flex flex-col gap-6 p-6 overflow-auto">
        <Card>
          <CardContent className="p-6 text-sm text-destructive">지원하지 않는 리포트입니다. GOLDEN 또는 STS를 선택해주세요.</CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="grid h-full grid-cols-1 gap-4 overflow-hidden p-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(340px,0.6fr)]">
      <section className="flex min-h-0 flex-col overflow-hidden rounded-lg border bg-card">
        <header className="flex items-center justify-between gap-3 border-b px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold">{selected.title}</h2>
            {context?.custom_test_name && (
              <p className="text-xs text-muted-foreground">{context.custom_test_name}</p>
            )}
          </div>
          <Button variant="outline" size="sm" asChild>
            <a href={selected.path} target="_blank" rel="noreferrer">새 창</a>
          </Button>
        </header>
        <iframe
          className="min-h-[720px] flex-1 border-0 bg-white"
          src={reportSrc}
          title={selected.title}
        />
      </section>

      <aside className="min-h-0 overflow-auto">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">점수 요약</CardTitle>
          </CardHeader>
          <CardContent>
            {message ? (
              <p className="text-sm text-muted-foreground">{message}</p>
            ) : (
              renderHierarchy(context?.hierarchy ?? [])
            )}
          </CardContent>
        </Card>
      </aside>
    </div>
  )
}
