interface Props {
  onRestart: () => void
  reportAccessToken?: string | null
  submissionId?: number | null
}

export function CompleteStep({ onRestart, reportAccessToken, submissionId }: Props) {
  return (
    <div className="hero-tint flex min-h-screen w-full items-center justify-center bg-[#eef2f4] px-4 py-10">
      <section className="w-full max-w-xl overflow-hidden rounded-2xl border border-[#dfe5e3] bg-white p-10 text-center assessment-card">
        <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-full bg-[#eaf3eb] text-[#3f6a44]">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-8" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#175e63]">Submission Complete</p>
        <h2 className="mt-2 text-2xl font-bold text-[#161d1b]">검사가 제출되었습니다</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          응답이 저장되었습니다.<br />안내받은 다음 절차가 있다면 그대로 진행해주세요.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          {reportAccessToken && submissionId && (
            <button
              type="button"
              onClick={() => window.open(`/report/${submissionId}?token=${encodeURIComponent(reportAccessToken)}`, "_blank", "noopener,noreferrer")}
              className="h-10 rounded-lg bg-[#175e63] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#124b4f]"
            >
              결과 보기
            </button>
          )}
          <button
            type="button"
            onClick={onRestart}
            className="h-10 rounded-lg border border-[#dfe5e3] bg-white px-6 text-sm font-medium text-[#3a4a47] transition-colors hover:bg-[#f3f5f4]"
          >
            처음으로
          </button>
        </div>
      </section>
    </div>
  )
}
