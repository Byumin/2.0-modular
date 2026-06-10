import type { InitialPayload, AssessmentPart, AssessmentSession, Profile } from "../types"

interface Props {
  payload: InitialPayload
  parts: AssessmentPart[]
  session?: AssessmentSession | null
  profile: Profile | null
  onStart: () => void
  onBack: () => void
  sessionClass?: string
}

const TIPS = [
  "정답이나 오답이 없습니다. 평소 자신의 모습에 가장 가까운 응답을 선택하세요.",
  "너무 오래 고민하지 마시고, 첫 번째 느낌으로 응답해주세요.",
  "검사 도중 중단하더라도 응답은 자동 저장됩니다.",
  "모든 문항에 응답해야 결과를 확인할 수 있습니다.",
]

const TIPS_WITHOUT_RESULT = [
  "정답이나 오답이 없습니다. 평소 자신의 모습에 가장 가까운 응답을 선택하세요.",
  "너무 오래 고민하지 마시고, 첫 번째 느낌으로 응답해주세요.",
  "검사 도중 중단하더라도 응답은 자동 저장됩니다.",
  "제출 전 응답 누락 여부를 확인한 뒤 완료해주세요.",
]

function formatEstimatedTime(totalQuestions: number) {
  if (totalQuestions <= 0) return "약 0분"
  const minMinutes = Math.ceil((totalQuestions * 20) / 60)
  const maxMinutes = Math.ceil((totalQuestions * 30) / 60)
  if (minMinutes === maxMinutes) return `약 ${minMinutes}분`
  return `약 ${minMinutes}-${maxMinutes}분`
}

export function IntroStep({ payload, parts, session, onStart, sessionClass = "session-teal" }: Props) {
  const testName = payload.custom_test_name || payload.display_name || "검사"
  const sessionTitle = session?.title || "검사 안내"
  const sessionDescription = session?.description?.trim()
  const guideItems = session?.guide_items?.length ? session.guide_items : (payload.show_report_result === false ? TIPS_WITHOUT_RESULT : TIPS)
  const totalQuestions = parts.reduce((s, p) => s + (p.item_count ?? p.items?.length ?? 0), 0)
  const estimatedMinutes = formatEstimatedTime(totalQuestions)

  return (
    <div
      className={`${sessionClass} relative min-h-screen overflow-hidden text-white`}
      style={{ background: "linear-gradient(180deg, var(--sa-gf) 0%, var(--sa-gm) 52%, var(--sa-gt) 100%)" }}
    >
      <div className="h-[3px]" style={{ background: "linear-gradient(to right, var(--sa), var(--sa-l), var(--sa))" }} />

      <header className="relative z-10 border-b border-white/10 bg-white/[0.04] backdrop-blur-md">
        <div className="mx-auto flex max-w-[760px] items-center gap-3 px-4 py-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[var(--sa)] text-sm font-bold text-white shadow-[0_12px_26px_rgba(0,0,0,0.22)]">
            H
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em]" style={{ color: "var(--sa-l85)" }}>Inpsyt Assessment</p>
            <p className="truncate text-sm font-semibold text-white/90">{testName}</p>
            {session?.title && <p className="truncate text-xs text-white/45">{session.title}</p>}
          </div>
        </div>
      </header>

      <div className="assessment-intro-blob assessment-intro-blob-1" data-intro-blob="1" />
      <div className="assessment-intro-blob assessment-intro-blob-2" data-intro-blob="2" />
      <div className="assessment-intro-blob assessment-intro-blob-3" data-intro-blob="3" />

      <main className="relative z-10 mx-auto flex w-full max-w-[760px] flex-col px-4 pb-10 pt-11 sm:pt-12">
        <section className="rounded-[22px] border border-white/[0.18] bg-white/[0.12] px-8 py-8 shadow-[0_18px_55px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.10)] backdrop-blur-xl sm:px-9 sm:py-9">
          <div className="flex items-center gap-3 text-[12px] font-semibold tracking-[0.18em]" style={{ color: "var(--sa-l85)" }}>
            <span className="h-px w-7" style={{ backgroundColor: "var(--sa-l40)" }} />
            검사 안내
          </div>
          <h1 className="mt-6 text-[26px] font-bold leading-tight tracking-tight text-white">
            {sessionTitle}
          </h1>
          <p className="mt-6 max-w-[640px] whitespace-pre-line text-sm leading-7 text-white/62">
            {sessionDescription || "본 검사는 심리적 특성과 행동 패턴을 파악하기 위한 표준화된 도구입니다. 솔직하게 응답해주시면 더 정확한 결과를 얻을 수 있습니다."}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-white/55">
            <span className="flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="var(--sa-l)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="size-3.5" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              {estimatedMinutes}
            </span>
            <span className="h-3 w-px bg-white/15" />
            <span className="flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="var(--sa-l)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="size-3.5" aria-hidden="true">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              총 {totalQuestions}문항
            </span>
            <span className="h-3 w-px bg-white/15" />
            <span className="flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="var(--sa-l)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="size-3.5" aria-hidden="true">
                <rect x="3" y="11" width="18" height="10" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              응답 정보 보호
            </span>
          </div>
        </section>

        <section className="mt-9 rounded-lg border border-white/[0.18] bg-white/[0.12] px-8 py-7 shadow-[0_18px_55px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.10)] backdrop-blur-xl sm:px-9">
          <h2 className="text-base font-bold text-white">검사 안내사항</h2>
          <ul className="mt-5 space-y-3.5">
            {guideItems.map((tip, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold" style={{ backgroundColor: "var(--sa-l15)", color: "var(--sa-l)" }}>
                  {i + 1}
                </span>
                <span className="whitespace-pre-line text-sm leading-6 text-white/62">{tip}</span>
              </li>
            ))}
          </ul>
        </section>

        <button
          type="button"
          onClick={onStart}
          className="mt-8 flex h-14 w-full items-center justify-center gap-2 rounded-lg text-base font-semibold text-white shadow-[0_16px_28px_rgba(0,0,0,0.26)] transition-all hover:opacity-90 active:scale-[0.99]"
          style={{ background: "linear-gradient(to right, var(--sa), var(--sa-alt))" }}
        >
          검사 시작하기
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4" aria-hidden="true">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </main>

      <footer className="relative z-10 pb-5 text-center text-xs text-white/35">
        © 2026 Inpsyt. All rights reserved.
      </footer>
    </div>
  )
}
