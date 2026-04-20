import * as React from "react"

const SAMPLE_OPTIONS = [
  { value: "1", label: "전혀 그렇지 않다" },
  { value: "2", label: "그렇지 않다" },
  { value: "3", label: "보통이다" },
  { value: "4", label: "그렇다" },
  { value: "5", label: "매우 그렇다" },
]

const SAMPLE_ITEMS = [
  { id: "q1", order: 1, text: "나는 새로운 사람을 만나는 것이 즐겁다." },
  { id: "q2", order: 2, text: "나는 혼자 있는 시간을 좋아한다." },
  { id: "q3", order: 3, text: "나는 계획을 세우고 그 계획을 따르는 것을 선호한다." },
  { id: "q4", order: 4, text: "나는 어려운 상황에서도 침착함을 유지한다." },
  { id: "q5", order: 5, text: "나는 변화를 받아들이는 편이다." },
  { id: "q6", order: 6, text: "나는 다른 사람의 감정을 잘 이해한다." },
  { id: "q7", order: 7, text: "나는 창의적인 활동을 즐긴다." },
  { id: "q8", order: 8, text: "나는 규칙과 절차를 중요하게 생각한다." },
]

export function QuestionEditorial({ onSubmit, onDesignChange }: { onSubmit: () => void; onDesignChange?: (d: string) => void }) {
  const [answers, setAnswers] = React.useState<Record<string, string>>({})
  const [current, setCurrent] = React.useState(0)
  const [submitting, setSubmitting] = React.useState(false)
  const [direction, setDirection] = React.useState<"next" | "prev">("next")

  const item = SAMPLE_ITEMS[current]
  const done = Object.values(answers).filter(Boolean).length
  const total = SAMPLE_ITEMS.length
  const allAnswered = done === total

  function go(idx: number) {
    setDirection(idx > current ? "next" : "prev")
    setCurrent(idx)
  }

  function handleAnswer(value: string) {
    setAnswers(prev => ({ ...prev, [item.id]: value }))
    // Auto-advance after short delay
    if (current < total - 1) {
      setTimeout(() => go(current + 1), 350)
    }
  }

  function handleSubmit() {
    if (!allAnswered) return
    setSubmitting(true)
    setTimeout(() => { setSubmitting(false); onSubmit() }, 800)
  }

  // Keyboard navigation
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault()
        if (current < total - 1) go(current + 1)
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault()
        if (current > 0) go(current - 1)
      } else if (e.key >= "1" && e.key <= "5") {
        handleAnswer(e.key)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [current])

  return (
    <div className="min-h-screen bg-[#fafbfc] flex flex-col">
      {/* Top progress bar */}
      <div className="h-1 bg-[#edf0ef]">
        <div
          className="h-full bg-[#175e63] transition-all duration-500 ease-out"
          style={{ width: `${((current + 1) / total) * 100}%` }}
        />
      </div>

      {/* Minimal header */}
      <header className="flex items-center justify-between px-6 py-4 sm:px-10">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-lg bg-[#175e63] text-xs font-bold text-white">H</div>
          <div>
            <p className="text-sm font-semibold text-[#161d1b]">하네스 엔지니어링 심리검사</p>
            <p className="text-xs text-[#8a9a96]">홍길동 · 파트 1</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[#8a9a96]">{done}/{total} 응답</span>
          {onDesignChange && (
            <button
              onClick={() => onDesignChange("original")}
              className="rounded-lg border border-[#e2e8f0] bg-white px-3 py-2 text-xs font-medium text-[#5f6f73] transition-colors hover:bg-[#f5f7fa] hover:text-[#175e63]"
            >
              카드형
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={!allAnswered || submitting}
            className="rounded-lg bg-[#175e63] px-5 py-2 text-sm font-semibold text-white transition-all hover:bg-[#124b4f] disabled:opacity-30"
          >
            {submitting ? "제출 중..." : "제출하기"}
          </button>
        </div>
      </header>

      {/* Main question area */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 pb-32">
        <div className="w-full max-w-2xl">
          {/* Question number */}
          <div className="mb-6 flex items-baseline gap-4">
            <span className="text-[80px] font-black leading-none text-[#175e63]/10 sm:text-[120px]">
              {String(current + 1).padStart(2, "0")}
            </span>
            <span className="text-xs font-medium uppercase tracking-widest text-[#175e63]">
              Question {current + 1} of {total}
            </span>
          </div>

          {/* Question text */}
          <h2
            key={item.id}
            className="text-2xl font-semibold leading-relaxed text-[#161d1b] sm:text-3xl animate-[fadeSlide_0.3s_ease-out]"
          >
            {item.text}
          </h2>

          {/* Slider-style options */}
          <div className="mt-12">
            <div className="flex items-center justify-between gap-2">
              {SAMPLE_OPTIONS.map((opt) => {
                const isSelected = answers[item.id] === opt.value
                return (
                  <button
                    key={opt.value}
                    onClick={() => handleAnswer(opt.value)}
                    className="group flex flex-1 flex-col items-center gap-2"
                  >
                    <div
                      className={`flex size-14 items-center justify-center rounded-2xl border-2 text-lg font-bold transition-all duration-200 sm:size-16
                        ${isSelected
                          ? "border-[#175e63] bg-[#175e63] text-white scale-110 shadow-lg shadow-[#175e63]/20"
                          : "border-[#e2e8f0] bg-white text-[#8a9a96] hover:border-[#175e63]/40 hover:text-[#175e63] hover:scale-105"
                        }`}
                    >
                      {opt.value}
                    </div>
                    <span className={`text-[11px] transition-colors ${isSelected ? "font-semibold text-[#175e63]" : "text-[#8a9a96]"}`}>
                      {opt.label}
                    </span>
                  </button>
                )
              })}
            </div>
            {/* Scale line */}
            <div className="mt-3 flex items-center px-7 sm:px-8">
              <div className="h-px flex-1 bg-[#e2e8f0]" />
            </div>
            <div className="mt-1 flex justify-between px-7 text-[10px] text-[#b0bab7] sm:px-8">
              <span>비동의</span>
              <span>동의</span>
            </div>
          </div>

          {/* Keyboard hint */}
          <p className="mt-8 text-center text-xs text-[#b0bab7]">
            키보드 <kbd className="mx-1 rounded border border-[#e2e8f0] bg-white px-1.5 py-0.5 text-[10px] font-mono">1</kbd>~<kbd className="mx-1 rounded border border-[#e2e8f0] bg-white px-1.5 py-0.5 text-[10px] font-mono">5</kbd> 또는 <kbd className="mx-1 rounded border border-[#e2e8f0] bg-white px-1.5 py-0.5 text-[10px] font-mono">←</kbd><kbd className="mx-1 rounded border border-[#e2e8f0] bg-white px-1.5 py-0.5 text-[10px] font-mono">→</kbd> 로 이동
          </p>
        </div>
      </main>

      {/* Bottom navigation dots */}
      <footer className="fixed bottom-0 left-0 right-0 flex items-center justify-center gap-1 bg-white/80 px-4 py-5 backdrop-blur-sm border-t border-[#edf0ef]">
        <button
          onClick={() => go(Math.max(0, current - 1))}
          disabled={current === 0}
          className="mr-4 rounded-full border border-[#e2e8f0] p-2 text-[#8a9a96] transition-colors hover:bg-[#f5f7fa] disabled:opacity-30"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        {SAMPLE_ITEMS.map((it, idx) => (
          <button
            key={it.id}
            onClick={() => go(idx)}
            className={`size-3 rounded-full transition-all duration-200 ${
              idx === current
                ? "bg-[#175e63] scale-125"
                : answers[it.id]
                  ? "bg-[#175e63]/40 hover:bg-[#175e63]/60"
                  : "bg-[#dfe5e3] hover:bg-[#b0bab7]"
            }`}
          />
        ))}
        <button
          onClick={() => go(Math.min(total - 1, current + 1))}
          disabled={current >= total - 1}
          className="ml-4 rounded-full border border-[#e2e8f0] p-2 text-[#8a9a96] transition-colors hover:bg-[#f5f7fa] disabled:opacity-30"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </footer>
    </div>
  )
}