interface Props {
  onRestart: () => void
}

export function CompleteStep({ onRestart }: Props) {
  return (
    <div className="flex w-full items-center justify-center py-10">
      <section className="w-full max-w-xl rounded-xl bg-white p-10 text-center shadow-sm">
        <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-full bg-green-50 text-green-600">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-8" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-foreground">검사가 제출되었습니다</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          응답이 저장되었습니다.<br />안내받은 다음 절차가 있다면 그대로 진행해주세요.
        </p>
        <button
          type="button"
          onClick={onRestart}
          className="mt-8 h-10 rounded-lg border border-input bg-background px-6 text-sm font-medium transition-colors hover:bg-accent"
        >
          처음으로
        </button>
      </section>
    </div>
  )
}
