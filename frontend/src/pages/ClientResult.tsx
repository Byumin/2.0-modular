import * as React from "react"
import { Link, useParams, useNavigate } from "react-router-dom"
import {
  IconArrowLeft,
  IconFileDescription,
  IconClipboardList,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { TestResultCard, type TestResultGroup } from "@/components/result/TestResultCard"
import { ResultSummaryStrip } from "@/components/result/ResultSummaryStrip"

interface ScaleScore {
  scale_key: string
  scale_name: string
  raw_score: number | null
  t_score: number | null
  percentile: number | null
  level?: string
}

interface ClientSummary {
  name: string
  gender: string
  birth_day: string | null
  age?: number
}

interface AssessmentLog {
  id: number
  custom_test_name?: string
  assessed_on: string | null
  scale_scores?: ScaleScore[]
}

function reportLinksFor(testName: string): string[] {
  const upper = testName.toUpperCase()
  return [
    upper.includes("GOLDEN") ? "GOLDEN" : "",
    upper.includes("STS") ? "STS" : "",
  ].filter(Boolean)
}

/** 고유 검사명 목록으로 "전체" chip + 검사명 chip 배열 생성 */
function uniqueTestNames(groups: TestResultGroup[]): string[] {
  const seen = new Set<string>()
  for (const g of groups) seen.add(g.test_name)
  return Array.from(seen)
}

/** 접기 상태를 위한 안정적인 key 생성 */
function collapseKey(group: TestResultGroup): string {
  return `${group.test_name}__${group.assessed_on ?? "none"}`
}

export function ClientResult() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [summary, setSummary] = React.useState<ClientSummary | null>(null)
  const [results, setResults] = React.useState<TestResultGroup[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState("")

  // 필터/정렬/숨김 상태
  const [selectedTestName, setSelectedTestName] = React.useState<string>("전체")
  const [sortOrder, setSortOrder] = React.useState<"latest" | "name">("latest")
  const [hideEmpty, setHideEmpty] = React.useState(false)

  // 접기 상태 — key로 관리 (인덱스 기반 아님)
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({})

  React.useEffect(() => {
    if (!id) return
    setLoading(true)
    fetch(`/api/admin/clients/${id}`)
      .then((r) => r.json())
      .then((data) => {
        const item = data.item || data
        const logs = (item.assessment_logs ?? []) as AssessmentLog[]
        const latestCompletedLog = logs
          .filter((log) => log.assessed_on && Number.isFinite(Number(log.id)))
          .sort((a, b) => {
            const aTime = a.assessed_on ? new Date(a.assessed_on).getTime() : 0
            const bTime = b.assessed_on ? new Date(b.assessed_on).getTime() : 0
            return bTime - aTime
          })[0]
        if (latestCompletedLog) {
          navigate(`/admin/report/${latestCompletedLog.id}`, { replace: true })
          return
        }
        setSummary({
          name: item.name,
          gender: item.gender,
          birth_day: item.birth_day,
          age: item.age,
        })
        const groups: TestResultGroup[] = logs.map((log) => ({
          test_name: log.custom_test_name ?? "검사",
          assessed_on: log.assessed_on,
          scales: log.scale_scores ?? [],
        }))
        setResults(groups)
      })
      .catch(() => setError("결과를 불러올 수 없습니다."))
      .finally(() => setLoading(false))
  }, [id, navigate])

  // 파생값 계산 (요약 스트립용)
  const totalTests = results.length

  const latestDate = React.useMemo(() => {
    const dates = results
      .map((g) => g.assessed_on)
      .filter((d): d is string => d !== null)
      .map((d) => new Date(d).getTime())
    if (dates.length === 0) return null
    const max = Math.max(...dates)
    return new Date(max).toLocaleDateString("ko-KR")
  }, [results])

  const avgTScore = React.useMemo(() => {
    const scores = results
      .flatMap((g) => g.scales)
      .map((s) => s.t_score)
      .filter((t): t is number => t !== null)
    if (scores.length === 0) return null
    const sum = scores.reduce((a, b) => a + b, 0)
    return Math.round((sum / scores.length) * 10) / 10
  }, [results])

  const warningScaleCount = React.useMemo(() => {
    return results
      .flatMap((g) => g.scales)
      .filter((s) => {
        if (!s.level) return false
        const l = s.level.toLowerCase()
        return l.includes("높") || l.includes("high")
      }).length
  }, [results])

  // 필터 → 정렬 파이프라인
  const filteredResults = React.useMemo(() => {
    let list = results

    // 검사명 필터
    if (selectedTestName !== "전체") {
      list = list.filter((g) => g.test_name === selectedTestName)
    }

    // 빈 결과 숨기기
    if (hideEmpty) {
      list = list.filter((g) => g.scales.length > 0)
    }

    // 정렬
    if (sortOrder === "name") {
      list = [...list].sort((a, b) =>
        a.test_name.localeCompare(b.test_name, "ko")
      )
    } else {
      // 최신순: assessed_on 내림차순, null은 뒤로
      list = [...list].sort((a, b) => {
        const da = a.assessed_on ? new Date(a.assessed_on).getTime() : 0
        const db = b.assessed_on ? new Date(b.assessed_on).getTime() : 0
        return db - da
      })
    }

    return list
  }, [results, selectedTestName, hideEmpty, sortOrder])

  const testNameOptions = uniqueTestNames(results)

  // 헤더의 전역 리포트 버튼 (GOLDEN/STS 중 존재하는 것만)
  const headerReportLinks = React.useMemo(() => {
    const links = new Set<string>()
    for (const g of results) {
      for (const l of reportLinksFor(g.test_name)) links.add(l)
    }
    return Array.from(links)
  }, [results])

  const genderLabel = (gender: string) => {
    if (gender === "male") return "남성"
    if (gender === "female") return "여성"
    return gender
  }

  // 로딩 스켈레톤
  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-6 overflow-auto">
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
          <div
            key={i}
            className="rounded-xl border bg-card px-6 py-6 flex flex-col gap-3"
          >
            <div className="h-4 w-40 rounded bg-muted animate-pulse" />
            {[0, 1, 2, 3].map((j) => (
              <div
                key={j}
                className="h-3 w-full rounded bg-muted/60 animate-pulse"
              />
            ))}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-6 overflow-auto print:max-w-[720px] print:mx-auto print:px-6 print:p-0 print:[print-color-adjust:exact] print:[-webkit-print-color-adjust:exact]">
      {/* 인쇄 전용 머리글 */}
      <div className="hidden print:block mb-4 pb-3 border-b">
        <div className="text-sm font-semibold">
          {summary?.name ?? "검사 결과"}
        </div>
        <div className="text-xs text-muted-foreground">
          출력일시: {new Date().toLocaleString("ko-KR")}
        </div>
      </div>

      {/* [1] 헤더 영역 */}
      <div className="flex items-start gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="size-8 mt-0.5 print:hidden"
          onClick={() => navigate(`/admin/clients/${id}`)}
        >
          <IconArrowLeft className="size-4" />
        </Button>
        <div className="flex flex-col gap-0.5">
          <h2 className="text-xl font-semibold">
            {summary?.name ? `${summary.name} — 검사 결과` : "검사 결과"}
          </h2>
          {summary && (
            <p className="text-xs text-muted-foreground">
              {summary?.gender && genderLabel(summary.gender)}
              {summary?.birth_day && ` · ${summary.birth_day}`}
              {summary?.age != null && ` · 만 ${summary.age}세`}
            </p>
          )}
        </div>
        {/* 헤더 우측: 전역 리포트 버튼 */}
        {headerReportLinks.length > 0 && id && (
          <div className="ml-auto flex items-center gap-2 print:hidden">
            {headerReportLinks.map((report) => (
              <Button key={report} variant="outline" size="sm" asChild>
                <Link
                  to={`/admin/artifact-viewer?report=${report}&id=${encodeURIComponent(id)}`}
                >
                  <IconFileDescription className="size-4" />
                  {report} 리포트
                </Link>
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* 에러 */}
      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* [2] 요약 스트립 */}
      {!error && (
        <ResultSummaryStrip
          totalTests={totalTests}
          latestDate={latestDate}
          avgTScore={avgTScore}
          warningScaleCount={warningScaleCount}
        />
      )}

      {/* [3] 필터 바 */}
      {!error && results.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          {/* 검사명 필터 chip */}
          <button
            onClick={() => setSelectedTestName("전체")}
            className={
              selectedTestName === "전체"
                ? "bg-primary text-primary-foreground rounded-md px-3 py-1 text-xs font-medium"
                : "border bg-background hover:bg-accent rounded-md px-3 py-1 text-xs font-medium"
            }
          >
            전체
          </button>
          {testNameOptions.map((name) => (
            <button
              key={name}
              onClick={() => setSelectedTestName(name)}
              className={
                selectedTestName === name
                  ? "bg-primary text-primary-foreground rounded-md px-3 py-1 text-xs font-medium"
                  : "border bg-background hover:bg-accent rounded-md px-3 py-1 text-xs font-medium"
              }
            >
              {name}
            </button>
          ))}
          {/* 정렬 select */}
          <select
            value={sortOrder}
            onChange={(e) =>
              setSortOrder(e.target.value as "latest" | "name")
            }
            className="h-8 rounded-md border bg-background px-2 text-xs font-medium"
          >
            <option value="latest">최신순 (기본)</option>
            <option value="name">이름순</option>
          </select>
          {/* 빈 결과 숨기기 toggle */}
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              className="rounded"
              checked={hideEmpty}
              onChange={(e) => setHideEmpty(e.target.checked)}
            />
            빈 결과 숨기기
          </label>
        </div>
      )}

      {/* [4] 검사 그룹 카드 목록 */}
      {!error && results.length === 0 && (
        <div className="rounded-xl border bg-muted/30 flex flex-col items-center gap-2 py-16 px-6 text-center">
          <IconClipboardList className="size-8 text-muted-foreground" />
          <p className="text-sm font-medium">등록된 검사 결과가 없습니다</p>
          <p className="text-xs text-muted-foreground">
            검사 배정 후 수검자가 응답을 제출하면 결과가 표시됩니다.
          </p>
        </div>
      )}

      {!error && filteredResults.length > 0 && (
        <div className="flex flex-col gap-6">
          {filteredResults.map((group) => {
            const key = collapseKey(group)
            return (
              <TestResultCard
                key={key}
                group={group}
                clientId={id ?? ""}
                collapsed={collapsed[key] ?? false}
                onToggleCollapse={() =>
                  setCollapsed((prev) => ({ ...prev, [key]: !(prev[key] ?? false) }))
                }
              />
            )
          })}
        </div>
      )}

      {/* 필터 적용 후 결과 없음 (원본 데이터는 있지만 필터로 빈 경우) */}
      {!error && results.length > 0 && filteredResults.length === 0 && (
        <div className="rounded-xl border bg-muted/30 flex flex-col items-center gap-2 py-16 px-6 text-center">
          <p className="text-sm font-medium text-muted-foreground">
            선택한 필터에 해당하는 검사 결과가 없습니다
          </p>
        </div>
      )}
    </div>
  )
}
