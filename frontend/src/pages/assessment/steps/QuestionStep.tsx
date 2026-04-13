import * as React from "react"
import type { AssessmentPart, AnswerState, QuestionItem, ResponseOption } from "../types"
import { QUESTION_PAGE_SIZE } from "../types"
import { QuestionCard } from "../components/QuestionCard"
import { MatrixCard } from "../components/MatrixCard"

interface PageBundle {
  items: QuestionItem[]
  startIndex: number
  endIndex: number
}

type ViewMode = "cards" | "step"

function resolveRenderType(item: { render_type?: string; response_style?: string }): string {
  const rt = item.render_type?.trim() || ""
  if (rt) return rt
  const rs = item.response_style?.trim() || ""
  if (rs === "bipolar") return "bipolar"
  return "likert"
}

function isMatrixItem(item: { render_type?: string; response_style?: string; matrix_group_key?: string }): boolean {
  return resolveRenderType(item) === "likert_matrix" && Boolean(item.matrix_group_key?.trim())
}

function isTextItem(item: { render_type?: string; response_style?: string }): boolean {
  return resolveRenderType(item) === "text"
}

function buildCardPageBundles(items: QuestionItem[]): PageBundle[] {
  const bundles: PageBundle[] = []
  let index = 0
  while (index < items.length) {
    const current = items[index]
    if (isMatrixItem(current)) {
      const key = current.matrix_group_key!.trim()
      const startIndex = index
      const grouped = []
      while (index < items.length && isMatrixItem(items[index]) && items[index].matrix_group_key?.trim() === key) {
        grouped.push(items[index])
        index++
      }
      bundles.push({ items: grouped, startIndex, endIndex: index - 1 })
      continue
    }
    const startIndex = index
    const grouped = []
    while (index < items.length && !isMatrixItem(items[index]) && grouped.length < QUESTION_PAGE_SIZE) {
      grouped.push(items[index])
      index++
    }
    if (grouped.length) bundles.push({ items: grouped, startIndex, endIndex: index - 1 })
  }
  return bundles
}

function buildStepPageBundles(items: QuestionItem[]): PageBundle[] {
  const bundles: PageBundle[] = []
  let index = 0
  while (index < items.length) {
    const current = items[index]
    if (isMatrixItem(current)) {
      const key = current.matrix_group_key!.trim()
      const startIndex = index
      const grouped = []
      while (index < items.length && isMatrixItem(items[index]) && items[index].matrix_group_key?.trim() === key) {
        grouped.push(items[index])
        index++
      }
      bundles.push({ items: grouped, startIndex, endIndex: index - 1 })
      continue
    }
    bundles.push({ items: [current], startIndex: index, endIndex: index })
    index++
  }
  return bundles
}

interface Props {
  parts: AssessmentPart[]
  onSubmit: (answers: AnswerState) => void
  submitting: boolean
  error: string
}

export function QuestionStep({ parts, onSubmit, submitting, error }: Props) {
  const [partIndex, setPartIndex] = React.useState(0)
  const [page, setPage] = React.useState(0)
  const [answers, setAnswers] = React.useState<AnswerState>({})
  const [showMissingHighlight, setShowMissingHighlight] = React.useState(false)
  const [viewMode, setViewMode] = React.useState<ViewMode>("cards")

  const activePart = parts[partIndex] ?? parts[0]
  const items = React.useMemo(() => activePart?.items ?? [], [activePart])
  const options: ResponseOption[] = activePart?.response_options ?? []

  const bundles = React.useMemo(
    () => viewMode === "step" ? buildStepPageBundles(items) : buildCardPageBundles(items),
    [items, viewMode]
  )
  const currentBundle = bundles[page] ?? { items: [], startIndex: 0, endIndex: 0 }
  const currentItems = currentBundle.items

  function answered(id: string) { return Boolean(answers[id]?.trim()) }

  const total = React.useMemo(
    () => parts.reduce((s, p) => s + (p.items?.length ?? 0), 0),
    [parts]
  )
  const done = React.useMemo(
    () => parts.reduce((s, p) => s + (p.items ?? []).filter(i => answered(i.id)).length, 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [parts, answers]
  )
  const allAnsweredValue = React.useMemo(
    () => parts.every(p => (p.items ?? []).every(i => answered(i.id))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [parts, answers]
  )
  const partAllAnsweredSet = React.useMemo(
    () => parts.map(p => (p.items ?? []).every(i => answered(i.id))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [parts, answers]
  )

  function allAnswered() { return allAnsweredValue }
  function partAllAnswered(pi: number) { return partAllAnsweredSet[pi] ?? false }

  function handleAnswer(id: string, value: string) {
    setAnswers(prev => ({ ...prev, [id]: value }))
    setShowMissingHighlight(false)

    // 현재 화면의 모든 객관식 응답이 끝나면 다음 화면으로 이동한다.
    const updatedAnswers = { ...answers, [id]: value }
    const hasTextItem = currentItems.some(isTextItem)
    const pageAnswered = currentItems.every(it => Boolean(updatedAnswers[it.id]?.trim()))
    if (!hasTextItem && pageAnswered) {
      const isLastPage = page >= bundles.length - 1
      const isLastPart = partIndex >= parts.length - 1
      setTimeout(() => {
        if (!isLastPage) { setPage(p => p + 1) }
        else if (!isLastPart) {
          setPartIndex(pi => pi + 1)
          setPage(0)
        }
      }, 140)
    }
  }

  function handlePrev() {
    if (page > 0) { setPage(p => p - 1); return }
    if (partIndex > 0) {
      const prevPart = parts[partIndex - 1]
      const prevItems = prevPart?.items ?? []
      const prevBundles = viewMode === "step" ? buildStepPageBundles(prevItems) : buildCardPageBundles(prevItems)
      setPartIndex(pi => pi - 1)
      setPage(Math.max(prevBundles.length - 1, 0))
    }
  }

  function handleNext() {
    if (page < bundles.length - 1) { setPage(p => p + 1); return }
    if (partIndex < parts.length - 1) { setPartIndex(pi => pi + 1); setPage(0) }
  }

  function handleSubmitClick() {
    if (!allAnswered()) {
      setShowMissingHighlight(true)
      // 첫 번째 미응답 파트로 이동
      const firstIncompletePart = parts.findIndex(p => (p.items ?? []).some(i => !answered(i.id)))
      if (firstIncompletePart >= 0 && firstIncompletePart !== partIndex) {
        setPartIndex(firstIncompletePart)
        setPage(0)
      }
      return
    }
    const flat: AnswerState = {}
    parts.forEach(p => (p.items ?? []).forEach(i => {
      const value = answers[i.id]?.trim()
      if (value) flat[i.id] = value
    }))
    onSubmit(flat)
  }

  function handleViewModeChange(nextMode: ViewMode) {
    setViewMode(nextMode)
    setPage(0)
    setShowMissingHighlight(false)
  }

  const percent = total ? Math.round((done / total) * 100) : 0
  const isFirstPage = page === 0 && partIndex === 0
  const isLastPage = page >= bundles.length - 1
  const isLastPart = partIndex >= parts.length - 1

  return (
    <div className="grid w-full gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(250px,280px)]">
      <section className="min-w-0 rounded-xl bg-white shadow-sm">
        <div className="border-b px-4 py-3">
          <p className="text-sm font-semibold text-foreground">{activePart?.title || "파트"}</p>
        </div>
        <div className="flex flex-col gap-3 p-4">
          {viewMode === "step" && (
            <div className="flex flex-col gap-1 rounded-lg border-l-4 border-primary bg-[#f5f7fa] px-4 py-3">
              <p className="text-xs font-semibold text-muted-foreground">집중형 보기</p>
              <h3 className="text-lg font-semibold">
                {currentBundle.startIndex + 1} / {items.length}
              </h3>
              <p className="text-xs text-muted-foreground">한 문항에 집중해서 응답한 뒤 다음 문항으로 이동할 수 있습니다.</p>
            </div>
          )}

          {currentItems.map((item, idx) => {
            if (isMatrixItem(item)) {
              if (idx === 0) {
                const hasMissingMatrixAnswer = showMissingHighlight && currentItems.some((matrixItem) => !answered(matrixItem.id))
                return (
                  <div key={item.id} className={hasMissingMatrixAnswer ? "rounded-lg ring-2 ring-destructive/50" : ""}>
                    <MatrixCard
                      groupItems={currentItems}
                      options={options}
                      answerState={answers}
                      onAnswer={handleAnswer}
                      startGlobalIndex={(item.global_order_index ?? currentBundle.startIndex + 1)}
                    />
                  </div>
                )
              }
              return null
            }
            const isMissing = showMissingHighlight && !answered(item.id)
            return (
              <div key={item.id} className={isMissing ? "rounded-lg ring-2 ring-destructive/50" : ""}>
                <QuestionCard
                  item={item}
                  options={options}
                  answerState={answers}
                  onAnswer={handleAnswer}
                  globalIndex={item.global_order_index ?? currentBundle.startIndex + idx + 1}
                />
              </div>
            )
          })}

          {(error || (showMissingHighlight && !allAnswered())) && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-center text-sm text-destructive">
              {error || "모든 문항에 응답해주세요."}
            </div>
          )}
        </div>
      </section>

      <aside className="h-fit lg:sticky lg:top-4">
        <div className="overflow-hidden rounded-xl bg-white shadow-sm">
          {/* 진행 현황 */}
          <div className="px-4 py-3">
            <p className="text-xs font-medium text-muted-foreground">진행 현황</p>
            <p className="mt-1 text-lg font-bold text-foreground">{done} / {total} 문항</p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${percent}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {allAnswered() ? "모든 응답 완료" : `${percent}% 완료`}
            </p>
          </div>

          {/* 상태 */}
          <div className="border-t px-4 py-3">
            <button
              type="button"
              onClick={() => setShowMissingHighlight(true)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                allAnswered()
                  ? "border-green-200 bg-green-50 text-green-700"
                  : "border-amber-200 bg-amber-50 text-amber-700"
              }`}
            >
              {allAnswered() ? "응답 완료" : `미응답 ${total - done}개`}
            </button>
            <p className="mt-2 text-xs text-muted-foreground">
              {activePart?.title} · {page + 1} / {Math.max(bundles.length, 1)} 페이지
            </p>
          </div>

          {/* 파트 이동 */}
          {parts.length > 1 && (
            <div className="border-t px-4 py-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">파트 이동</p>
              <div className="flex flex-wrap gap-1.5">
                {parts.map((part, pi) => (
                  <button
                    key={pi}
                    type="button"
                    onClick={() => { setPartIndex(pi); setPage(0); setShowMissingHighlight(false) }}
                    className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                      pi === partIndex
                        ? "bg-primary text-primary-foreground"
                        : partAllAnswered(pi)
                          ? "bg-green-50 text-green-700"
                          : "bg-[#f5f7fa] text-muted-foreground hover:bg-border"
                    }`}
                  >
                    {part.title} ({(part.items ?? []).filter(i => answered(i.id)).length}/{part.items?.length ?? 0})
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 문항 이동 */}
          <div className="border-t px-4 py-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">문항 이동</p>
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
              <button
                type="button"
                onClick={handlePrev}
                disabled={isFirstPage}
                className="h-9 rounded-lg border border-input bg-background px-3 text-sm font-medium transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-40"
              >
                {page === 0 && partIndex > 0 ? "이전 파트" : "이전 문항"}
              </button>
              <button
                type="button"
                onClick={handleNext}
                disabled={isLastPage && isLastPart}
                className="h-9 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-40"
              >
                {isLastPage && !isLastPart ? "다음 파트" : "다음 문항"}
              </button>
            </div>
          </div>

          {/* 응답 방식 */}
          <div className="border-t px-4 py-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">응답 방식</p>
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-[#f5f7fa] p-1">
              <button
                type="button"
                onClick={() => handleViewModeChange("cards")}
                className={`h-8 rounded-md text-xs font-semibold transition-colors ${viewMode === "cards" ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                카드형
              </button>
              <button
                type="button"
                onClick={() => handleViewModeChange("step")}
                className={`h-8 rounded-md text-xs font-semibold transition-colors ${viewMode === "step" ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                집중형
              </button>
            </div>
          </div>
          {/* 최종 제출 */}
          <div className="border-t px-4 py-3">
            <button
              type="button"
              onClick={handleSubmitClick}
              disabled={submitting || !allAnswered()}
              className="h-11 w-full rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
            >
              {submitting ? "제출 중..." : "제출"}
            </button>
          </div>
        </div>
      </aside>
    </div>
  )
}
