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
  const questionAreaRef = React.useRef<HTMLDivElement | null>(null)
  const pendingScrollRef = React.useRef<"first" | string | null>("first")
  const answersRef = React.useRef<AnswerState>({})
  const partIndexRef = React.useRef(0)
  const pageRef = React.useRef(0)

  const activePart = parts[partIndex] ?? parts[0]
  const items = React.useMemo(() => activePart?.items ?? [], [activePart])
  const options: ResponseOption[] = activePart?.response_options ?? []

  const partBundles = React.useMemo(
    () => parts.map((part) => viewMode === "step" ? buildStepPageBundles(part.items ?? []) : buildCardPageBundles(part.items ?? [])),
    [parts, viewMode]
  )
  const bundles = partBundles[partIndex] ?? []
  const currentBundle = bundles[page] ?? { items: [], startIndex: 0, endIndex: 0 }
  const currentItems = currentBundle.items
  const flatItems = React.useMemo(
    () => parts.flatMap((_part, pi) =>
      (partBundles[pi] ?? []).flatMap((bundle, bundlePage) =>
        bundle.items.map((item) => ({ item, partIndex: pi, page: bundlePage }))
      )
    ),
    [parts, partBundles]
  )

  React.useEffect(() => {
    answersRef.current = answers
  }, [answers])

  React.useEffect(() => {
    partIndexRef.current = partIndex
  }, [partIndex])

  React.useEffect(() => {
    pageRef.current = page
  }, [page])

  function answered(id: string) { return Boolean(answers[id]?.trim()) }
  function itemOptions(item: QuestionItem) {
    if (item.response_options?.length) return item.response_options
    const location = flatItems.find(({ item: candidate }) => candidate.id === item.id)
    return parts[location?.partIndex ?? partIndex]?.response_options ?? options
  }

  function focusQuestionControl(card: HTMLElement) {
    const target = card.querySelector<HTMLElement>(".assessment-option-card, .assessment-text-answer")
    target?.focus({ preventScroll: true })
  }

  function scrollToQuestion(itemId: string, { focus = false } = {}) {
    const escapedId = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(itemId) : itemId.replace(/"/g, '\\"')
    const card = document.getElementById(`question-card-${itemId}`)
      ?? questionAreaRef.current?.querySelector<HTMLElement>(`[data-item-id="${escapedId}"]`)
    if (!(card instanceof HTMLElement)) return
    card.scrollIntoView({ behavior: "smooth", block: "center" })
    if (focus) focusQuestionControl(card)
  }

  function firstMissingIn(itemsToSearch: QuestionItem[], state: AnswerState) {
    return itemsToSearch.find((item) => !state[item.id]?.trim()) ?? null
  }

  function firstMissingGlobal(state: AnswerState) {
    return flatItems.find(({ item }) => !state[item.id]?.trim()) ?? null
  }

  function nextMissingAfterItem(fromItemId: string, state: AnswerState) {
    const startIndex = flatItems.findIndex(({ item }) => item.id === fromItemId)
    if (startIndex < 0) return firstMissingGlobal(state)
    for (let idx = startIndex + 1; idx < flatItems.length; idx += 1) {
      if (!state[flatItems[idx].item.id]?.trim()) return flatItems[idx]
    }
    return null
  }

  function activeHotkeyItem(state: AnswerState, scopedItemId?: string) {
    if (scopedItemId) {
      const scoped = flatItems.find(({ item }) => item.id === scopedItemId)
      if (scoped && !state[scoped.item.id]?.trim()) return scoped.item
      return nextMissingAfterItem(scopedItemId, state)?.item ?? null
    }
    return firstMissingIn(currentItems, state) ?? firstMissingGlobal(state)?.item ?? null
  }

  function moveToItem(itemId: string, { focus = true } = {}) {
    const location = flatItems.find(({ item }) => item.id === itemId)
    if (!location) return

    const needsPageChange = location.partIndex !== partIndexRef.current || location.page !== pageRef.current
    if (needsPageChange) {
      partIndexRef.current = location.partIndex
      pageRef.current = location.page
      pendingScrollRef.current = itemId
      setPartIndex(location.partIndex)
      setPage(location.page)
      return
    }
    window.requestAnimationFrame(() => scrollToQuestion(itemId, { focus }))
  }

  React.useEffect(() => {
    if (!pendingScrollRef.current) return
    const targetId = pendingScrollRef.current
    pendingScrollRef.current = null
    const targetItem = targetId === "first" ? (firstMissingIn(currentItems, answers) ?? currentItems[0]) : null
    const itemId = targetItem?.id ?? (targetId === "first" ? "" : targetId)
    if (!itemId) return
    window.requestAnimationFrame(() => scrollToQuestion(itemId, { focus: true }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partIndex, page, viewMode, currentItems])

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
    const updatedAnswers = { ...answersRef.current, [id]: value }
    answersRef.current = updatedAnswers
    setAnswers(updatedAnswers)
    setShowMissingHighlight(false)

    const nextMissing = nextMissingAfterItem(id, updatedAnswers)
    if (nextMissing) {
      moveToItem(nextMissing.item.id, { focus: true })
    }
  }

  function handlePrev() {
    if (page > 0) {
      const nextPage = page - 1
      pageRef.current = nextPage
      pendingScrollRef.current = "first"
      setPage(nextPage)
      return
    }
    if (partIndex > 0) {
      const prevPart = parts[partIndex - 1]
      const prevItems = prevPart?.items ?? []
      const prevBundles = viewMode === "step" ? buildStepPageBundles(prevItems) : buildCardPageBundles(prevItems)
      const nextPartIndex = partIndex - 1
      const nextPage = Math.max(prevBundles.length - 1, 0)
      partIndexRef.current = nextPartIndex
      pageRef.current = nextPage
      pendingScrollRef.current = "first"
      setPartIndex(nextPartIndex)
      setPage(nextPage)
    }
  }

  function handleNext() {
    if (page < bundles.length - 1) {
      const nextPage = page + 1
      pageRef.current = nextPage
      pendingScrollRef.current = "first"
      setPage(nextPage)
      return
    }
    if (partIndex < parts.length - 1) {
      const nextPartIndex = partIndex + 1
      partIndexRef.current = nextPartIndex
      pageRef.current = 0
      pendingScrollRef.current = "first"
      setPartIndex(nextPartIndex)
      setPage(0)
    }
  }

  function handleSubmitClick() {
    if (!allAnswered()) {
      setShowMissingHighlight(true)
      // 첫 번째 미응답 파트로 이동
      const firstIncompletePart = parts.findIndex(p => (p.items ?? []).some(i => !answered(i.id)))
      if (firstIncompletePart >= 0 && firstIncompletePart !== partIndex) {
        partIndexRef.current = firstIncompletePart
        pageRef.current = 0
        pendingScrollRef.current = "first"
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
    pageRef.current = 0
    setPage(0)
    setShowMissingHighlight(false)
    pendingScrollRef.current = "first"
  }

  React.useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (submitting || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return

      const target = event.target
      if (target instanceof HTMLElement) {
        const optionCard = target.closest(".assessment-option-card")
        if (optionCard instanceof HTMLElement && (event.key === " " || event.key === "Enter")) {
          const itemId = optionCard.dataset.itemId
          const optionIndex = Number(optionCard.dataset.optionIndex ?? "-1")
          const item = currentItems.find((candidate) => candidate.id === itemId)
          const option = item ? itemOptions(item)[optionIndex] : null
          if (item && option) {
            event.preventDefault()
            handleAnswer(item.id, option.value)
          }
          return
        }

        if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) {
          if (!optionCard) return
        }
      }

      if (!/^[1-9]$/.test(event.key)) return

      let targetItem: QuestionItem | null = null
      let scopedItemId: string | undefined
      if (target instanceof HTMLElement && questionAreaRef.current?.contains(target)) {
        scopedItemId = target.closest<HTMLElement>("[data-item-id]")?.dataset.itemId
      }
      targetItem = activeHotkeyItem(answersRef.current, scopedItemId)
      if (!targetItem || isTextItem(targetItem)) return

      const optionIndex = Number(event.key) - 1
      const option = itemOptions(targetItem)[optionIndex]
      if (!option) return

      event.preventDefault()
      handleAnswer(targetItem.id, option.value)
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flatItems, currentItems, options, submitting])

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
        <div ref={questionAreaRef} className="flex flex-col gap-3 p-4">
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
