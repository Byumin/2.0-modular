import type { InitialPayload, AssessmentPart, Profile } from "../types"

interface Props {
  payload: InitialPayload
  parts: AssessmentPart[]
  profile: Profile | null
  onStart: () => void
  onBack: () => void
}

function profileSummary(profile: Profile) {
  const entries = [
    profile.name && profile.name,
    profile.gender && (profile.gender === "male" ? "남성" : profile.gender === "female" ? "여성" : profile.gender),
    profile.birth_day && profile.birth_day,
    profile.school_age && profile.school_age,
  ]
  return entries.filter(Boolean).join(" · ")
}

const TIPS = [
  "방해받지 않는 조용한 환경에서 혼자 응답하세요.",
  "정답은 없습니다. 솔직하게 응답하는 것이 가장 좋습니다.",
  "제출 후에는 수정이 어려우니 응답을 확인하고 제출하세요.",
]

export function IntroStep({ payload, parts, profile, onStart, onBack }: Props) {
  const testName = payload.custom_test_name || payload.display_name || "검사"
  const totalQuestions = parts.reduce((s, p) => s + (p.item_count ?? p.items?.length ?? 0), 0)
  const multiPart = parts.length > 1

  return (
    <div className="w-full">
      <div className="overflow-hidden rounded-2xl border border-[#dfe5e3] bg-white assessment-card">
        <div className="h-[3px] bg-[#175e63]" />

        <div className="px-8 py-8 sm:px-10 sm:py-10">
          {/* 헤더 */}
          <div className="mb-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#175e63]">
              Inpsyt Assessment
            </p>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-[#161d1b] sm:text-3xl">
              {testName}
            </h1>
            {payload.description && (
              <p className="mt-2 text-sm leading-6 text-[#5f6f73]">{payload.description}</p>
            )}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {/* 검사 구성 */}
            <section className="rounded-xl border border-[#dfe5e3] bg-[#eef2f4]/60 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#175e63]">
                검사 구성
              </p>
              <div className="mt-3 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#5f6f73]">총 문항 수</span>
                  <span className="text-sm font-semibold text-[#161d1b]">{totalQuestions}문항</span>
                </div>
                {payload.estimated_time_minutes && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#5f6f73]">예상 소요 시간</span>
                    <span className="text-sm font-semibold text-[#161d1b]">
                      약 {payload.estimated_time_minutes}분
                    </span>
                  </div>
                )}
                {multiPart && (
                  <div className="flex items-start justify-between gap-4">
                    <span className="shrink-0 text-sm text-[#5f6f73]">파트 구성</span>
                    <div className="flex flex-col items-end gap-1">
                      {parts.map((part, i) => (
                        <span key={i} className="text-sm font-medium text-[#161d1b]">
                          {part.title}
                          <span className="ml-1 text-xs text-[#5f6f73]">
                            ({part.item_count ?? part.items?.length ?? 0}문항)
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* 응답 안내 */}
            <section className="rounded-xl border border-[#dfe5e3] bg-[#eef2f4]/60 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#175e63]">
                응답 안내
              </p>
              <ul className="mt-3 flex flex-col gap-2.5">
                {TIPS.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm leading-5 text-[#3a4a47]">
                    <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-[#175e63]/10 text-[10px] font-bold text-[#175e63]">
                      {i + 1}
                    </span>
                    {tip}
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {/* 수검자 정보 확인 */}
          {profile && (
            <div className="mt-5 flex items-center gap-3 rounded-lg border border-[#e4ebe9] bg-[#eef2f4]/40 px-4 py-3">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#175e63]/10">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#175e63" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-3.5" aria-hidden="true">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5f6f73]">수검자</p>
                <p className="mt-0.5 text-sm font-medium text-[#161d1b]">{profileSummary(profile)}</p>
              </div>
              <button
                type="button"
                onClick={onBack}
                className="ml-auto shrink-0 text-xs text-[#175e63] underline underline-offset-2 hover:text-[#124b4f]"
              >
                수정
              </button>
            </div>
          )}

          {/* 버튼 */}
          <div className="mt-8 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onBack}
              className="h-11 rounded-lg border border-[#dfe5e3] bg-white px-5 text-sm font-medium text-[#3a4a47] transition-colors hover:bg-[#f3f5f4]"
            >
              뒤로
            </button>
            <button
              type="button"
              onClick={onStart}
              className="h-11 flex-1 rounded-lg bg-[#175e63] px-6 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#124b4f] sm:flex-none sm:min-w-[180px]"
            >
              검사 시작하기
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
