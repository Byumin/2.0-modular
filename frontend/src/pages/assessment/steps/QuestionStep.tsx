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
  testName?: string
  userSummary?: string
  saveStatusText?: string
  submitLabel?: string
  submittingLabel?: string
  initialAnswers?: AnswerState
  initialPartIndex?: number
  initialPage?: number
  onProgressChange?: (state: { answers: AnswerState; currentPartIndex: number; currentPage: number }) => void
  sessionClass?: string
  allowUnansweredSubmission?: boolean
}

export function QuestionStep({
  parts,
  onSubmit,
  submitting,
  error,
  testName = "검사 실시",
  userSummary,
  saveStatusText,
  submitLabel = "제출하기",
  submittingLabel = "제출 중...",
  initialAnswers,
  initialPartIndex = 0,
  initialPage = 0,
  onProgressChange,
  sessionClass = "session-teal",
  allowUnansweredSubmission = false,
}: Props) {
  const safeInitialPartIndex = Math.min(Math.max(initialPartIndex, 0), Math.max(parts.length - 1, 0))
  const [partIndex, setPartIndex] = React.useState(safeInitialPartIndex)
  const [page, setPage] = React.useState(Math.max(initialPage, 0))
  const [answers, setAnswers] = React.useState<AnswerState>(() => initialAnswers ?? {})
  const [showMissingHighlight, setShowMissingHighlight] = React.useState(false)
  const [missingConfirmOpen, setMissingConfirmOpen] = React.useState(false)
  const [pendingMissingItems, setPendingMissingItems] = React.useState<Array<{ item: QuestionItem; globalIndex: number }>>([])
  const [viewMode, setViewMode] = React.useState<ViewMode>("cards")
  const questionAreaRef = React.useRef<HTMLDivElement | null>(null)
  const quickNavRef = React.useRef<HTMLDivElement | null>(null)
  const pendingScrollRef = React.useRef<"first" | string | null>("first")
  const hotkeyAnchorItemIdRef = React.useRef<string | null>(null)
  const answersRef = React.useRef<AnswerState>(initialAnswers ?? {})
  const partIndexRef = React.useRef(safeInitialPartIndex)
  const pageRef = React.useRef(Math.max(initialPage, 0))

  const activePart = parts[partIndex] ?? parts[0]
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
  React.useEffect(() => { answersRef.current = answers }, [answers])
  React.useEffect(() => { partIndexRef.current = partIndex }, [partIndex])
  React.useEffect(() => { pageRef.current = page }, [page])
  React.useEffect(() => {
    if (bundles.length === 0 || page < bundles.length) return
    const nextPage = Math.max(bundles.length - 1, 0)
    pageRef.current = nextPage
    setPage(nextPage)
  }, [bundles.length, page])
  React.useEffect(() => {
    onProgressChange?.({ answers, currentPartIndex: partIndex, currentPage: page })
  }, [answers, partIndex, page, onProgressChange])
  React.useEffect(() => {
    function alignQuickNav() {
      const nav = quickNavRef.current
      const firstItem = currentItems[0]
      if (!nav || !firstItem) return

      const displayedIndex = questionAreaRef.current
        ?.querySelector<HTMLElement>("[data-question-display-index]")
        ?.dataset.questionDisplayIndex
      const activeIndex = displayedIndex ?? String(firstItem.global_order_index ?? currentBundle.startIndex + 1)
      const activeButton = nav.querySelector<HTMLButtonElement>(`[data-quick-index="${activeIndex}"]`)
      if (!activeButton) return

      const navRect = nav.getBoundingClientRect()
      const btnRect = activeButton.getBoundingClientRect()
      const relativeTop = btnRect.top - navRect.top + nav.scrollTop
      nav.scrollTo({ top: Math.max(0, relativeTop - (activeButton.offsetHeight + 4) * 2), behavior: "auto" })
    }

    const frame = window.requestAnimationFrame(alignQuickNav)
    const retry = window.setTimeout(alignQuickNav, 80)
    return () => {
      window.cancelAnimationFrame(frame)
      window.clearTimeout(retry)
    }
  }, [partIndex, page, currentItems, currentBundle.startIndex])

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

  function nextMissingInCurrentAfterItem(fromItemId: string, state: AnswerState) {
    const startIndex = currentItems.findIndex((item) => item.id === fromItemId)
    if (startIndex < 0) return null
    for (let idx = startIndex + 1; idx < currentItems.length; idx += 1) {
      if (!state[currentItems[idx].id]?.trim()) return currentItems[idx]
    }
    return null
  }

  function activeHotkeyItem(state: AnswerState, scopedItemId?: string) {
    if (scopedItemId) {
      const scoped = flatItems.find(({ item }) => item.id === scopedItemId)
      if (scoped && !state[scoped.item.id]?.trim()) return scoped.item
      return nextMissingInCurrentAfterItem(scopedItemId, state)
    }
    const anchoredItemId = hotkeyAnchorItemIdRef.current
    if (anchoredItemId && currentItems.some((item) => item.id === anchoredItemId)) {
      const anchored = currentItems.find((item) => item.id === anchoredItemId)
      if (anchored && !state[anchored.id]?.trim()) return anchored
      return nextMissingInCurrentAfterItem(anchoredItemId, state)
    }
    return firstMissingIn(currentItems, state)
  }

  function moveToItem(itemId: string, { focus = true } = {}) {
    const location = flatItems.find(({ item }) => item.id === itemId)
    if (!location) return
    if (focus) hotkeyAnchorItemIdRef.current = itemId
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
  function allAnswered() { return allAnsweredValue }

  function missingItemsForState(state: AnswerState) {
    return flatItems
      .filter(({ item }) => !state[item.id]?.trim())
      .map(({ item }, index) => ({
        item,
        globalIndex: item.global_order_index ?? index + 1,
      }))
  }

  function handleAnswer(id: string, value: string) {
    const updatedAnswers = { ...answersRef.current, [id]: value }
    answersRef.current = updatedAnswers
    const nextCurrentMissing = nextMissingInCurrentAfterItem(id, updatedAnswers)
    hotkeyAnchorItemIdRef.current = nextCurrentMissing?.id ?? id
    setAnswers(updatedAnswers)
    setShowMissingHighlight(false)
    if (viewMode === "step") {
      const nextMissing = nextMissingAfterItem(id, updatedAnswers)
      if (nextMissing) {
        setTimeout(() => moveToItem(nextMissing.item.id, { focus: true }), 350)
      }
    } else {
      const allCurrentPageAnswered = currentItems.every(item => Boolean(updatedAnswers[item.id]?.trim()))
      if (allCurrentPageAnswered) {
        if (!(page >= bundles.length - 1 && partIndex >= parts.length - 1)) {
          setTimeout(() => handleNext(), 350)
        }
      } else if (allowUnansweredSubmission && !nextCurrentMissing && !(page >= bundles.length - 1 && partIndex >= parts.length - 1)) {
        setTimeout(() => handleNext(), 350)
      } else {
        const nextMissing = nextMissingAfterItem(id, updatedAnswers)
        const isSamePage = nextMissing
          ? nextMissing.partIndex === partIndexRef.current && nextMissing.page === pageRef.current
          : false
        if (nextMissing && isSamePage) {
          moveToItem(nextMissing.item.id, { focus: true })
          window.requestAnimationFrame(() => {
            const nav = quickNavRef.current
            if (!nav) return
            const btn = nav.querySelector<HTMLButtonElement>(`[data-quick-item-id="${nextMissing.item.id}"]`)
            if (!btn) return
            const navRect = nav.getBoundingClientRect()
            const btnRect = btn.getBoundingClientRect()
            const relativeTop = btnRect.top - navRect.top + nav.scrollTop
            nav.scrollTo({ top: Math.max(0, relativeTop - (btn.offsetHeight + 4) * 2), behavior: "smooth" })
          })
        }
      }
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
    hotkeyAnchorItemIdRef.current = null
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
      const missing = missingItemsForState(answers)
      if (allowUnansweredSubmission) {
        setPendingMissingItems(missing)
        setMissingConfirmOpen(true)
        setShowMissingHighlight(false)
        return
      }
      setShowMissingHighlight(true)
      const firstMissing = firstMissingGlobal(answers)
      if (firstMissing) moveToItem(firstMissing.item.id, { focus: true })
      return
    }
    const flat: AnswerState = {}
    parts.forEach(p => (p.items ?? []).forEach(i => {
      const value = answers[i.id]?.trim()
      if (value) flat[i.id] = value
    }))
    onSubmit(flat)
  }

  function submitCurrentAnswers() {
    const flat: AnswerState = {}
    parts.forEach(p => (p.items ?? []).forEach(i => {
      const value = answers[i.id]?.trim()
      if (value) flat[i.id] = value
    }))
    onSubmit(flat)
  }

  function handleAnswerMissing() {
    const firstMissing = pendingMissingItems[0]?.item ?? missingItemsForState(answers)[0]?.item
    setMissingConfirmOpen(false)
    setPendingMissingItems([])
    setShowMissingHighlight(true)
    if (firstMissing) moveToItem(firstMissing.id, { focus: true })
  }

  function handleMoveToMissingItem(item: QuestionItem) {
    setMissingConfirmOpen(false)
    setPendingMissingItems([])
    setShowMissingHighlight(true)
    moveToItem(item.id, { focus: true })
  }

  function handleSubmitWithMissing() {
    setMissingConfirmOpen(false)
    setPendingMissingItems([])
    submitCurrentAnswers()
  }

  function handleViewModeChange(nextMode: ViewMode) {
    const anchorItemId = currentItems[0]?.id ?? null
    hotkeyAnchorItemIdRef.current = anchorItemId

    if (nextMode === "cards" && viewMode === "step") {
      // 집중형 → 카드형: 현재 문항이 속한 카드형 페이지로 이동
      if (anchorItemId) {
        const cardBundles = buildCardPageBundles(parts[partIndexRef.current]?.items ?? [])
        const targetPage = cardBundles.findIndex(b => b.items.some(i => i.id === anchorItemId))
        const newPage = targetPage >= 0 ? targetPage : 0
        pageRef.current = newPage
        setPage(newPage)
      } else {
        pageRef.current = 0
        setPage(0)
      }
    } else if (nextMode === "step" && viewMode === "cards") {
      // 카드형 → 집중형: 현재 카드 페이지의 첫 문항 위치로 이동
      if (anchorItemId) {
        const stepBundles = buildStepPageBundles(parts[partIndexRef.current]?.items ?? [])
        const targetPage = stepBundles.findIndex(b => b.items.some(i => i.id === anchorItemId))
        const newPage = targetPage >= 0 ? targetPage : 0
        pageRef.current = newPage
        setPage(newPage)
      } else {
        pageRef.current = 0
        setPage(0)
      }
    } else {
      pageRef.current = 0
      setPage(0)
    }

    setViewMode(nextMode)
    setShowMissingHighlight(false)
    pendingScrollRef.current = anchorItemId ?? "first"
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

      // step mode arrow navigation
      if (viewMode === "step") {
        if (event.key === "ArrowRight" || event.key === "ArrowDown") {
          event.preventDefault()
          handleNext()
          return
        }
        if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
          event.preventDefault()
          handlePrev()
          return
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
  }, [flatItems, currentItems, options, submitting, viewMode, page, partIndex, bundles])

  const percent = total ? Math.round((done / total) * 100) : 0
  const isFirstPage = page === 0 && partIndex === 0
  const isLastPage = page >= bundles.length - 1
  const isLastPart = partIndex >= parts.length - 1
  const totalPages = bundles.length
  const missingPreview = pendingMissingItems.slice(0, 5)

  function renderMissingConfirmModal() {
    if (!missingConfirmOpen) return null
    const hiddenCount = Math.max(0, pendingMissingItems.length - missingPreview.length)
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4">
        <div className="w-full max-w-lg rounded-xl border border-[#dfe5e3] bg-white p-5 shadow-xl">
          <h3 className="text-lg font-semibold text-[#161d1b]">미응답 문항이 있습니다</h3>
          <p className="mt-2 text-sm leading-6 text-[#5f6f73]">
            총 <strong className="font-semibold text-[#31413e]">{pendingMissingItems.length}개 문항</strong>에 응답하지 않았습니다.
            <br />
            문항 번호를 눌러 응답할 수 있고, 미응답인 상태로 제출 가능합니다.
          </p>
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
            미응답 {pendingMissingItems.length}개
          </div>
          <div className="mt-3 rounded-lg bg-[#f5f7fa] p-3">
            <p className="text-xs font-semibold text-[#5f6f73]">미응답 문항 바로 이동</p>
            <div className="mt-2 flex max-h-28 flex-wrap gap-2 overflow-y-auto pr-1">
              {missingPreview.map(({ item, globalIndex }) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleMoveToMissingItem(item)}
                  className="rounded-md border border-red-200 bg-white px-2.5 py-1 text-xs font-semibold text-red-700 transition-colors hover:bg-red-50"
                >
                  {globalIndex}번
                </button>
              ))}
              {hiddenCount > 0 && (
                <span className="rounded-md border border-[#dfe5e3] bg-white px-2.5 py-1 text-xs font-medium text-[#5f6f73]">
                  외 {hiddenCount}개
                </span>
              )}
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={handleAnswerMissing}
              className="rounded-lg border border-[#dfe5e3] bg-white px-4 py-2 text-sm font-semibold text-[#175e63] transition-colors hover:bg-[#f5f7fa]"
            >
              첫 미응답 이동
            </button>
            <button
              type="button"
              onClick={handleSubmitWithMissing}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: "var(--sa)" }}
            >
              제출하기
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── 집중형 (editorial) ────────────────────────────────────────────
  if (viewMode === "step") {
    const currentItem = currentItems[0] ?? null
    const globalIndex = currentItem?.global_order_index ?? currentBundle.startIndex + 1
    const flatAllItems = parts.flatMap(p => p.items ?? [])
    const flatCurrentIndex = flatAllItems.findIndex(i => i.id === currentItem?.id)
    const showDots = total <= 20

    return (
      <div className={`${sessionClass} flex min-h-screen flex-col bg-[#fafbfc]`}>
        {renderMissingConfirmModal()}
        {/* Top progress bar */}
        <div className="h-1 bg-[#edf0ef]">
          <div
            className="h-full transition-all duration-500 ease-out"
            style={{ width: `${percent}%`, backgroundColor: "var(--sa)" }}
          />
        </div>

        {/* Minimal header */}
        <header className="flex items-center justify-between px-6 py-4 sm:px-10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white" style={{ backgroundColor: "var(--sa)" }}>
              {testName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[#161d1b]">{testName}</p>
              {userSummary && <p className="text-xs text-[#8a9a96]">{userSummary}</p>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {saveStatusText && <span className="hidden text-xs text-[#6d7d79] sm:inline">{saveStatusText}</span>}
            <span className="text-xs text-[#8a9a96]">{done}/{total} 응답</span>
            <button
              type="button"
              onClick={() => handleViewModeChange("cards")}
              className="rounded-lg border border-[#e2e8f0] bg-white px-3 py-1.5 text-xs font-medium text-[#5f6f73] transition-colors hover:bg-[#f5f7fa] hover:text-[var(--sa)]"
            >
              카드형
            </button>
            <button
              type="button"
              onClick={handleSubmitClick}
              disabled={submitting}
              className="rounded-lg px-5 py-1.5 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-30"
              style={{ backgroundColor: "var(--sa)" }}
            >
              {submitting ? submittingLabel : submitLabel}
            </button>
          </div>
        </header>

        {/* Main question */}
        <main ref={questionAreaRef} className="flex flex-1 flex-col items-center justify-center px-4 pb-32 sm:px-8">
          <div className="w-full max-w-3xl">
            {/* Watermark number */}
            <div className="mb-4 flex items-baseline gap-4">
              <span className="text-[80px] font-black leading-none sm:text-[120px]" style={{ color: "var(--sa-10)" }}>
                {String(globalIndex).padStart(2, "0")}
              </span>
              <span className="text-xs font-medium uppercase tracking-widest" style={{ color: "var(--sa)" }}>
                Question {globalIndex} of {total}
              </span>
            </div>

            {/* Question text with animation */}
            {currentItem && !isMatrixItem(currentItem) && !isTextItem(currentItem) ? (
              <>
                <h2
                  key={currentItem.id}
                  className="whitespace-pre-line text-2xl font-semibold leading-relaxed text-[#161d1b] animate-[fadeSlide_0.3s_ease-out] sm:text-3xl"
                >
                  {currentItem.text}
                </h2>

                {/* Large options */}
                {(() => {
                  const visibleOpts = itemOptions(currentItem).filter(opt => opt.label !== "무응답")
                  const firstLabel = visibleOpts[0]?.label
                  const lastLabel = visibleOpts[visibleOpts.length - 1]?.label
                  const showEndLabels = firstLabel && lastLabel && firstLabel !== lastLabel
                  return (
                    <div className="mt-12">
                      <div className="flex items-end justify-between gap-2 sm:gap-3">
                        {visibleOpts.map((opt) => {
                          const isSelected = answers[currentItem.id] === opt.value
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              data-item-id={currentItem.id}
                              data-option-index={itemOptions(currentItem).indexOf(opt)}
                              onClick={() => handleAnswer(currentItem.id, opt.value)}
                              className="assessment-option-card group flex flex-1 flex-col items-center gap-2"
                            >
                              <div
                                className={`flex size-14 items-center justify-center rounded-2xl border-2 text-lg font-bold transition-all duration-200 sm:size-16
                                  ${isSelected
                                    ? "text-white scale-110"
                                    : "border-[#e2e8f0] bg-white text-[#8a9a96] hover:border-[var(--sa-40)] hover:text-[var(--sa)] hover:scale-105"
                                  }`}
                                style={isSelected ? {
                                  backgroundColor: "var(--sa)",
                                  borderColor: "var(--sa)",
                                  boxShadow: "0 10px 15px -3px var(--sa-20), 0 4px 6px -4px var(--sa-20)",
                                } : undefined}
                              >
                                {opt.value}
                              </div>
                              <span
                                className={`text-[11px] transition-colors ${isSelected ? "font-semibold" : "text-[#8a9a96]"}`}
                                style={isSelected ? { color: "var(--sa)" } : undefined}
                              >
                                {opt.label}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                      <div className="mt-3 flex items-center px-7 sm:px-8">
                        <div className="h-px flex-1 bg-[#e2e8f0]" />
                      </div>
                      {showEndLabels && (
                        <div className="mt-1 flex justify-between px-7 text-[10px] text-[#b0bab7] sm:px-8">
                          <span>{firstLabel}</span>
                          <span>{lastLabel}</span>
                        </div>
                      )}
                    </div>
                  )
                })()}

                {/* Keyboard hint */}
                <p className="mt-6 text-center text-xs text-[#b0bab7]">
                  키보드{" "}
                  <kbd className="mx-0.5 rounded border border-[#e2e8f0] bg-white px-1.5 py-0.5 font-mono text-[10px]">1</kbd>~
                  <kbd className="mx-0.5 rounded border border-[#e2e8f0] bg-white px-1.5 py-0.5 font-mono text-[10px]">5</kbd>
                  {" "}또는{" "}
                  <kbd className="mx-0.5 rounded border border-[#e2e8f0] bg-white px-1.5 py-0.5 font-mono text-[10px]">←</kbd>
                  <kbd className="mx-0.5 rounded border border-[#e2e8f0] bg-white px-1.5 py-0.5 font-mono text-[10px]">→</kbd>
                  {" "}로 이동
                </p>
              </>
            ) : (
              // matrix나 text 문항은 카드형으로 폴백
              <div className="flex flex-col gap-3">
                {currentItems.map((item, idx) => {
                  if (isMatrixItem(item)) {
                    if (idx === 0) {
                      const hasMissing = showMissingHighlight && currentItems.some(m => !answered(m.id))
                      return (
                        <div key={item.id} className={hasMissing ? "rounded-2xl ring-2 ring-red-200" : ""}>
                          <MatrixCard groupItems={currentItems} options={options} answerState={answers} onAnswer={handleAnswer} startGlobalIndex={item.global_order_index ?? currentBundle.startIndex + 1} />
                        </div>
                      )
                    }
                    return null
                  }
                  const isMissing = showMissingHighlight && !answered(item.id)
                  return (
                    <div key={item.id} className={isMissing ? "rounded-2xl ring-2 ring-red-200" : ""}>
                      <QuestionCard item={item} options={options} answerState={answers} onAnswer={handleAnswer} globalIndex={item.global_order_index ?? currentBundle.startIndex + idx + 1} />
                    </div>
                  )
                })}
              </div>
            )}

            {(error || (showMissingHighlight && !allAnswered())) && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-600">
                {error || (allowUnansweredSubmission ? "미응답 문항을 확인해주세요." : "모든 문항에 응답해주세요.")}
              </div>
            )}
          </div>
        </main>

        {/* Fixed bottom dot navigation */}
        <footer className="fixed bottom-0 left-0 right-0 flex items-center justify-center gap-1 border-t border-[#edf0ef] bg-white/85 px-4 py-4 backdrop-blur-sm">
          <button
            type="button"
            onClick={handlePrev}
            disabled={isFirstPage}
            className="mr-3 rounded-full border border-[#e2e8f0] p-2 text-[#8a9a96] transition-colors hover:bg-[#f5f7fa] disabled:opacity-30"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4"><polyline points="15 18 9 12 15 6" /></svg>
          </button>

          {showDots ? (
            flatAllItems.map((it, idx) => (
              <button
                key={it.id}
                type="button"
                onClick={() => moveToItem(it.id)}
                className={`rounded-full transition-all duration-200 ${
                  idx === flatCurrentIndex
                    ? "size-3 scale-125"
                    : answers[it.id]
                      ? "size-2.5 hover:opacity-80"
                      : "size-2.5 bg-[#dfe5e3] hover:bg-[#b0bab7]"
                }`}
                style={idx === flatCurrentIndex
                  ? { backgroundColor: "var(--sa)" }
                  : answers[it.id]
                    ? { backgroundColor: "var(--sa-40)" }
                    : undefined
                }
              />
            ))
          ) : (
            <span className="text-xs text-[#8a9a96]">
              <span className="font-bold text-[#161d1b]">{flatCurrentIndex + 1}</span> / {total}
            </span>
          )}

          <button
            type="button"
            onClick={handleNext}
            disabled={isLastPage && isLastPart}
            className="ml-3 rounded-full border border-[#e2e8f0] p-2 text-[#8a9a96] transition-colors hover:bg-[#f5f7fa] disabled:opacity-30"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4"><polyline points="9 18 15 12 9 6" /></svg>
          </button>
        </footer>
      </div>
    )
  }

  // ── 카드형 (cards) ────────────────────────────────────────────────
  return (
    <div className={`${sessionClass} min-h-screen bg-[#f0f2f5]`}>
      {renderMissingConfirmModal()}
      {/* Compact sticky header */}
      <header className="sticky top-0 z-30 border-b border-[#e8ebee] bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          {/* Left: logo + test info */}
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white" style={{ backgroundColor: "var(--sa)" }}>
              {testName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[#161d1b]">{testName}</p>
              {userSummary && <p className="text-[11px] text-[#8a9a96]">{userSummary}</p>}
            </div>
          </div>

          {saveStatusText && <p className="ml-auto text-[11px] text-[#6d7d79] sm:hidden">{saveStatusText}</p>}

          {/* Mobile: mode switch icon button */}
          <button
            type="button"
            onClick={() => handleViewModeChange("step")}
            className="ml-auto shrink-0 rounded-lg border border-[#e2e8f0] px-2.5 py-1.5 text-[11px] font-medium text-[#5f6f73] transition-colors hover:bg-[#f5f7fa] sm:hidden"
          >
            집중형
          </button>

          {/* Right: stepper */}
          <nav className="ml-auto hidden items-center gap-1 sm:flex" aria-label="검사 단계">
            {(["인적사항", "검사 실시", "제출 완료"] as const).map((label, i) => {
              const past = i === 0
              const current = i === 1
              return (
                <React.Fragment key={label}>
                  <div
                    className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs ${
                      current ? "font-semibold"
                      : past ? "text-[#8a9a96]" : "text-[#c5ccc9]"
                    }`}
                    style={current ? { backgroundColor: "var(--sa-10)", color: "var(--sa)" } : undefined}
                  >
                    <div
                      className={`flex size-4 items-center justify-center rounded-full text-[9px] font-bold ${
                        current ? "text-white"
                        : past ? "bg-[#c5ccc9] text-white"
                        : "border border-[#dfe5e3] text-[#c5ccc9]"
                      }`}
                      style={current ? { backgroundColor: "var(--sa)" } : undefined}
                    >
                      {past ? (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="size-2.5"><polyline points="20 6 9 17 4 12" /></svg>
                      ) : String(i + 1)}
                    </div>
                    {label}
                  </div>
                  {i < 2 && <div className={`h-px w-5 ${past ? "bg-[#c5ccc9]" : "bg-[#e8ebee]"}`} />}
                </React.Fragment>
              )
            })}
          </nav>
        </div>
        {/* Progress bar */}
        <div className="h-0.5 bg-[#edf0ef]">
          <div
            className="h-full transition-all duration-500"
            style={{ width: `${percent}%`, backgroundColor: "var(--sa)" }}
          />
        </div>
      </header>

      {/* Main content */}
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="grid items-start gap-5 lg:grid-cols-[1fr_220px]">

          {/* Question cards */}
          <div className="flex flex-col gap-4">
            {/* Page indicator row */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold" style={{ color: "var(--sa)" }}>
                페이지 {page + 1} / {totalPages}
              </span>
              {/* Desktop hint */}
              <div className="hidden items-center gap-1.5 text-xs text-[#8a9a96] lg:flex">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-3.5">
                  <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
                </svg>
                가장 가까운 응답을 선택하세요
              </div>
              {/* Mobile prev/next page buttons */}
              <div className="flex items-center gap-1 lg:hidden">
                <button type="button" onClick={handlePrev} disabled={isFirstPage}
                  className="flex size-8 items-center justify-center rounded-lg border border-[#e8ebee] bg-white text-[#8a9a96] transition-colors hover:bg-[#f0f2f5] disabled:opacity-30">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4"><polyline points="15 18 9 12 15 6" /></svg>
                </button>
                <span className="min-w-[3rem] text-center text-xs text-[#8a9a96]">{page + 1} / {totalPages}</span>
                <button type="button" onClick={handleNext} disabled={isLastPage && isLastPart}
                  className="flex size-8 items-center justify-center rounded-lg border border-[#e8ebee] bg-white text-[#8a9a96] transition-colors hover:bg-[#f0f2f5] disabled:opacity-30">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4"><polyline points="9 18 15 12 9 6" /></svg>
                </button>
              </div>
            </div>

            {/* Cards */}
            <div ref={questionAreaRef} className="flex flex-col gap-4">
              {currentItems.map((item, cardIdx) => {
                if (isMatrixItem(item)) {
                  if (cardIdx === 0) {
                    const hasMissingMatrix = showMissingHighlight && currentItems.some(m => !answered(m.id))
                    return (
                      <div
                        key={item.id}
                        data-question-display-index={item.global_order_index ?? currentBundle.startIndex + 1}
                        className={`rounded-2xl border-2 bg-white transition-all ${hasMissingMatrix ? "border-red-300 ring-2 ring-red-100" : "border-transparent shadow-sm"}`}
                      >
                        <MatrixCard groupItems={currentItems} options={options} answerState={answers} onAnswer={handleAnswer} startGlobalIndex={item.global_order_index ?? currentBundle.startIndex + 1} />
                      </div>
                    )
                  }
                  return null
                }
                const isMissing = showMissingHighlight && !answered(item.id)
                const isAnswered = answered(item.id)
                return (
                  <div
                    key={item.id}
                    id={`question-card-${item.id}`}
                    data-item-id={item.id}
                    data-question-display-index={item.global_order_index ?? currentBundle.startIndex + cardIdx + 1}
                    tabIndex={-1}
                    className={`rounded-2xl border-2 bg-white p-6 transition-all ${
                      isMissing
                        ? "border-red-300 ring-2 ring-red-100"
                        : isAnswered
                          ? "shadow-sm"
                          : "border-transparent shadow-sm hover:shadow-md"
                    }`}
                    style={{ animationDelay: `${cardIdx * 60}ms`, ...(isAnswered && !isMissing ? { borderColor: "var(--sa-15)" } : {}) }}
                  >
                    <div className="flex items-start gap-4">
                      {/* Number badge */}
                      <div
                        className={`flex size-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold transition-colors ${
                          isAnswered ? "text-white" : "bg-[#f0f2f5] text-[#8a9a96]"
                        }`}
                        style={isAnswered ? { backgroundColor: "var(--sa)" } : undefined}
                      >
                        {item.global_order_index ?? currentBundle.startIndex + cardIdx + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <QuestionCard
                          item={item}
                          options={options}
                          answerState={answers}
                          onAnswer={handleAnswer}
                          globalIndex={item.global_order_index ?? currentBundle.startIndex + cardIdx + 1}
                          hideHeader
                        />
                      </div>
                    </div>
                    {isAnswered && (
                      <div className="mt-3 flex items-center gap-2 pl-14">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="var(--sa)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="size-3.5"><polyline points="20 6 9 17 4 12" /></svg>
                        <span className="text-[11px] font-medium" style={{ color: "var(--sa)" }}>응답 완료</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {(error || (showMissingHighlight && !allAnswered())) && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-600">
                {error || (allowUnansweredSubmission ? "미응답 문항을 확인해주세요." : "모든 문항에 응답해주세요.")}
              </div>
            )}

            {/* Mobile submit button — visible only below lg breakpoint */}
            <div className="mt-4 lg:hidden">
              <button type="button" onClick={handleSubmitClick}
                disabled={submitting}
                className="h-12 w-full rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-30"
                style={{ backgroundColor: "var(--sa)" }}
              >
                {submitting ? submittingLabel : submitLabel}
              </button>
              {!allAnswered() && allowUnansweredSubmission && (
                <p className="mt-1.5 text-center text-xs text-[#b0bab7]">
                  {`미응답 ${total - done}개 확인 후 제출 가능`}
                </p>
              )}
              {showMissingHighlight && !allAnswered() && !allowUnansweredSubmission && (
                <p className="mt-1.5 text-center text-xs text-destructive">
                  모든 문항 응답 후 제출
                </p>
              )}
            </div>
          </div>

          {/* Compact sidebar */}
          <aside className="hidden lg:block">
            {/* Sidebar label — static (not sticky) */}
            <div className="mb-4 flex items-center">
              <span className="text-sm font-semibold" style={{ color: "var(--sa)" }}>진행 현황</span>
            </div>

            <div className="rounded-2xl bg-white p-4 shadow-sm lg:sticky lg:top-16">
              {/* Circular donut progress */}
              <div className="flex flex-col items-center py-2">
                <div className="relative size-20">
                  <svg viewBox="0 0 36 36" className="size-20 -rotate-90">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#edf0ef" strokeWidth="2.5" />
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--sa)" strokeWidth="2.5"
                      strokeDasharray={`${percent} ${100 - percent}`} strokeLinecap="round"
                      className="transition-all duration-500" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-bold text-[#161d1b]">{percent}%</span>
                  </div>
                </div>
                <p className="mt-2 text-xs text-[#8a9a96]">{done}/{total} 문항 완료</p>
                <span className={`mt-2 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                  allAnswered() ? "bg-green-50 text-green-600" : "bg-amber-50 text-amber-600"
                }`}>
                  {allAnswered() ? "응답 완료" : `미응답 ${total - done}개`}
                </span>
              </div>

              {/* 문항 이동 */}
              <div className="mt-3 border-t border-[#f0f2f5] pt-3">
                <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-[#b0bab7]">문항 이동</p>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={handlePrev} disabled={isFirstPage}
                    className="flex size-8 items-center justify-center rounded-lg border border-[#e8ebee] bg-[#fafbfc] text-[#8a9a96] transition-colors hover:bg-[#f0f2f5] hover:text-[var(--sa)] disabled:opacity-30">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-3.5"><polyline points="15 18 9 12 15 6" /></svg>
                  </button>
                  <div className="flex-1 text-center">
                    <span className="text-xs text-[#8a9a96]">페이지 </span>
                    <span className="text-sm font-bold text-[#161d1b]">{page + 1}</span>
                    <span className="text-[11px] text-[#b0bab7]"> / {totalPages}</span>
                  </div>
                  <button type="button" onClick={handleNext} disabled={isLastPage && isLastPart}
                    className="flex size-8 items-center justify-center rounded-lg border border-[#e8ebee] bg-[#fafbfc] text-[#8a9a96] transition-colors hover:bg-[#f0f2f5] hover:text-[var(--sa)] disabled:opacity-30">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-3.5"><polyline points="9 18 15 12 9 6" /></svg>
                  </button>
                </div>
              </div>

              {/* 빠른 이동 */}
              <div className="mt-3 border-t border-[#f0f2f5] pt-3">
                <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-[#b0bab7]">빠른 이동</p>
                <div ref={quickNavRef} className="max-h-[136px] overflow-y-auto rounded-lg">
                  <div className="grid grid-cols-5 gap-1">
                    {(activePart?.items ?? []).map((item, idx) => {
                        const displayIndex = item.global_order_index ?? idx + 1
                        const bundleIdx = bundles.findIndex(b => b.items.some(i => i.id === item.id))
                        const isOnCurrentPage = bundleIdx === page
                        return (
                          <button
                            key={item.id}
                            type="button"
                            data-quick-item-id={item.id}
                            data-quick-index={displayIndex}
                            onClick={() => {
                              moveToItem(item.id, { focus: true })
                            }}
                            className={`h-6 rounded text-[10px] font-semibold transition-all ${
                              answered(item.id)
                                ? "text-white"
                                : isOnCurrentPage
                                  ? "ring-1"
                                  : "bg-[#f5f7fa] text-[#8a9a96] hover:bg-[#edf0ef]"
                            }`}
                          style={
                            answered(item.id)
                              ? { backgroundColor: "var(--sa)" }
                              : isOnCurrentPage
                                ? { backgroundColor: "var(--sa-10)", color: "var(--sa)" }
                                : undefined
                          }
                          >
                            {displayIndex}
                          </button>
                        )
                      })}
                  </div>
                </div>
              </div>

              {/* 응답 방식 */}
              <div className="mt-3 border-t border-[#f0f2f5] pt-3">
                <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-[#b0bab7]">응답 방식</p>
                <div className="flex gap-1">
                  {([
                    { key: "cards" as ViewMode, label: "카드형" },
                    { key: "step" as ViewMode, label: "집중형" },
                  ]).map((d) => (
                    <button key={d.key} type="button" onClick={() => handleViewModeChange(d.key)}
                      className={`flex-1 rounded-lg py-2 text-[11px] font-semibold transition-all ${
                        viewMode === d.key ? "text-white" : "bg-[#f5f7fa] text-[#8a9a96] hover:bg-[#edf0ef] hover:text-[#5f6f73]"
                      }`}
                      style={viewMode === d.key ? { backgroundColor: "var(--sa)" } : undefined}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 제출 */}
              <div className="mt-3 border-t border-[#f0f2f5] pt-3">
                <button type="button" onClick={handleSubmitClick}
                  disabled={submitting}
                  className="h-10 w-full rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-30"
                  style={{ backgroundColor: "var(--sa)" }}
                >
                  {submitting ? submittingLabel : submitLabel}
                </button>
                {!allAnswered() && allowUnansweredSubmission && (
                  <p className="mt-1.5 text-center text-[10px] text-[#b0bab7]">
                    {`미응답 ${total - done}개 확인 후 제출 가능`}
                  </p>
                )}
                {showMissingHighlight && !allAnswered() && !allowUnansweredSubmission && (
                  <p className="mt-1.5 text-center text-[10px] text-destructive">
                    모든 문항 응답 후 제출
                  </p>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
