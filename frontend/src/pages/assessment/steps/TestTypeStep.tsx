import * as React from "react"

interface Props {
  testName: string
  heading?: string
  description?: string
  options: string[]
  value: string | null
  onNext: (value: string) => void
}

// 각 형태에 대한 보조 안내 문구. DB 값과 무관하게 UX 안내 전용.
const OPTION_HINTS: Record<string, string[]> = {
  표준형: ["모든 문항으로 구성된 전체 검사입니다."],
  단축형: ["핵심 문항으로 구성된 간편 검사입니다."],
}

export function TestTypeStep({
  testName,
  heading = "검사 유형 선택하기",
  description = "다음 중 원하는 검사 실시 형태를 선택해 주세요.",
  options,
  value,
  onNext,
}: Props) {
  const [selected, setSelected] = React.useState<string | null>(value ?? (options[0] ?? null))

  React.useEffect(() => {
    setSelected(value ?? (options[0] ?? null))
  }, [value, options])

  function handleNext() {
    if (!selected) return
    onNext(selected)
  }

  return (
    <div className="min-h-screen bg-[#f4f6f5]">
      <div className="grid min-h-screen lg:grid-cols-2">
        {/* 좌측 hero */}
        <section className="relative min-h-[48vh] overflow-hidden bg-[#eef2f4] text-[#18211f] lg:min-h-screen">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,#f7f9fa_0%,#edf2f4_48%,#f6f8f8_100%)]" />
          <div data-hero-motion className="hero-blob hero-blob-1" />
          <div data-hero-motion className="hero-blob hero-blob-2" />
          <div data-hero-motion className="hero-blob hero-blob-3" />
          <div data-hero-motion className="hero-glass-wrap">
            <div className="hero-glass-orb" />
          </div>

          <div className="relative z-10 flex min-h-[48vh] flex-col justify-start px-6 py-8 sm:px-10 lg:min-h-screen lg:px-12 lg:py-12">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#2d7f8a]">Inpsyt Assessment</p>
              <h1 className="assessment-korean-title mt-4 max-w-[40rem] text-3xl font-bold leading-tight sm:text-4xl">
                {testName}
              </h1>
              <p className="mt-4 max-w-[40rem] text-sm leading-6 text-[#5f6f73]">
                검사 시작 전 진행할 유형을 선택해주세요. 선택에 따라 문항 수가 달라집니다.
              </p>
            </div>
          </div>
        </section>

        {/* 우측 폼 */}
        <section className="flex min-h-screen items-center bg-[#f7f8f7] px-5 py-8 sm:px-8 sm:py-10 lg:px-12">
          <div className="mx-auto w-full max-w-xl">
            <h2 className="text-3xl font-bold tracking-tight text-[#161d1b]">{heading}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>

            <div
              role="radiogroup"
              aria-label={heading}
              className="mt-6 grid gap-3 sm:grid-cols-2"
            >
              {options.map((opt) => {
                const isSelected = selected === opt
                return (
                  <button
                    key={opt}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => setSelected(opt)}
                    className={`flex min-h-[112px] flex-col items-start justify-center gap-1.5 rounded-xl p-5 text-left transition-colors ${
                      isSelected
                        ? "border border-[#175e63] bg-[#e8f3f1]"
                        : "border border-[#dfe5e3] bg-white hover:bg-accent"
                    }`}
                  >
                    <span
                      className={`text-base font-semibold ${isSelected ? "text-[#175e63]" : "text-[#161d1b]"}`}
                    >
                      {opt}
                    </span>
                    {OPTION_HINTS[opt] && (
                      <span className="text-xs leading-5 text-muted-foreground">
                        {OPTION_HINTS[opt].map((line, i) => (
                          <React.Fragment key={i}>{line}{i < OPTION_HINTS[opt].length - 1 && <br />}</React.Fragment>
                        ))}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            <button
              type="button"
              onClick={handleNext}
              disabled={!selected}
              className="mt-6 h-13 w-full rounded-md bg-[#175e63] px-5 text-base font-semibold text-white shadow-sm transition-colors hover:bg-[#124b4f] disabled:cursor-not-allowed disabled:opacity-50"
            >
              다음
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
