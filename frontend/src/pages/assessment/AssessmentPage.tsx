import * as React from "react"
import { useParams } from "react-router-dom"
import { ProfileStep } from "./steps/ProfileStep"
import { QuestionStep } from "./steps/QuestionStep"
import { CompleteStep } from "./steps/CompleteStep"
import {
  ALREADY_SUBMITTED_CONFIRM_REQUIRED_CODE,
  AMBIGUOUS_CLIENT_CODE,
  AUTO_CREATE_CONFIRM_REQUIRED_CODE,
  type AmbiguousCandidate,
  type AnswerState,
  type AssessmentPart,
  type AssessmentPayload,
  type AssessmentStep,
  type InitialPayload,
  type Profile,
} from "./types"

interface ApiError extends Error {
  status?: number
  code?: string
  detail?: unknown
}

async function api<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  })

  let data: unknown = {}
  try {
    data = await response.json()
  } catch {
    data = {}
  }

  if (!response.ok) {
    const body = data && typeof data === "object" ? (data as Record<string, unknown>) : {}
    const detail = body.detail
    const detailObject = detail && typeof detail === "object" ? (detail as Record<string, unknown>) : null
    const message =
      typeof detail === "string"
        ? detail
        : String(detailObject?.message || body.message || "요청 처리 중 오류가 발생했습니다.")
    const error = new Error(message) as ApiError
    error.status = response.status
    error.code = detailObject ? String(detailObject.code || "") : ""
    error.detail = detail
    throw error
  }

  return data as T
}

function completionStorageKey(token: string) {
  return `assessment_done_${token}`
}

function readCompletedSubmission(token: string): { submissionId: number; accessToken: string } | null {
  try {
    const raw = sessionStorage.getItem(completionStorageKey(token))
    if (!raw) return null
    if (raw === "1") return null
    const parsed = JSON.parse(raw) as { submission_id?: unknown; access_token?: unknown }
    if (typeof parsed.submission_id !== "number" || typeof parsed.access_token !== "string") return null
    return { submissionId: parsed.submission_id, accessToken: parsed.access_token }
  } catch {
    return null
  }
}

function normalizeAssessmentParts(payload: AssessmentPayload): AssessmentPart[] {
  const rawParts =
    Array.isArray(payload.parts) && payload.parts.length
      ? payload.parts
      : [
          {
            part_id: "part_1",
            part_index: 0,
            title: "파트 1",
            response_options: payload.response_options ?? [],
            items: payload.items ?? [],
            item_count: payload.items?.length ?? 0,
          },
        ]

  let globalOrderIndex = 1
  return rawParts.map((part, partIndex) => ({
    ...part,
    part_index: partIndex,
    title: part.title || `파트 ${partIndex + 1}`,
    response_options: part.response_options ?? [],
    items: (part.items ?? []).map((item, itemIndex) => ({
      ...item,
      order_index: itemIndex + 1,
      global_order_index: globalOrderIndex++,
    })),
    item_count: part.items?.length ?? 0,
  }))
}

function profileSummary(profile: Profile) {
  const entries = [
    profile.name && `이름: ${profile.name}`,
    profile.gender &&
      `성별: ${profile.gender === "male" ? "남" : profile.gender === "female" ? "여" : profile.gender}`,
    profile.birth_day && `생년월일: ${profile.birth_day}`,
    profile.school_age && `학령: ${profile.school_age}`,
  ]
  return entries.filter(Boolean).join(" / ") || "입력 정보 없음"
}

export function AssessmentPage() {
  const { accessToken } = useParams()
  const token = accessToken ?? ""

  const [initialPayload, setInitialPayload] = React.useState<InitialPayload | null>(null)
  const [parts, setParts] = React.useState<AssessmentPart[]>([])
  const [activeProfile, setActiveProfile] = React.useState<Profile | null>(null)
  const [step, setStep] = React.useState<AssessmentStep>("profile")
  const [loading, setLoading] = React.useState(true)
  const [consentInfo, setConsentInfo] = React.useState<{ requires_consent: boolean; consent_text: string } | null>(null)
  const [profileLoading, setProfileLoading] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [completedSubmissionId, setCompletedSubmissionId] = React.useState<number | null>(null)
  const [completedReportAccessToken, setCompletedReportAccessToken] = React.useState<string | null>(null)
  const [error, setError] = React.useState("")
  const [modalProfile, setModalProfile] = React.useState<Profile | null>(null)
  const [registering, setRegistering] = React.useState(false)

  // Ambiguous match state
  const [ambiguousProfile, setAmbiguousProfile] = React.useState<Profile | null>(null)
  const [ambiguousCandidates, setAmbiguousCandidates] = React.useState<AmbiguousCandidate[]>([])
  const [ambiguousResolving, setAmbiguousResolving] = React.useState(false)

  // Stored context from validate-profile for submit
  const [confirmedClientId, setConfirmedClientId] = React.useState<number | null>(null)
  const [ambiguousMatchContext, setAmbiguousMatchContext] = React.useState<{
    is_ambiguous_match: boolean
    responder_choice: "existing" | "new" | null
    candidate_client_ids: number[]
  } | null>(null)
  const [retakePrompt, setRetakePrompt] = React.useState<{
    existingSubmission: {
      submission_id: number
      access_token: string
      submitted_at?: string
    }
    profile: Profile
    options: {
      client_id?: number | null
      responder_choice?: "existing" | "new" | null
      candidate_client_ids?: number[]
    }
  } | null>(null)

  React.useEffect(() => {
    let mounted = true
    async function load() {
      if (!token) {
        setError("유효하지 않은 접근입니다.")
        setLoading(false)
        return
      }

      try {
        if (sessionStorage.getItem(completionStorageKey(token)) === "1") {
          setStep("complete")
        } else {
          const storedSubmission = readCompletedSubmission(token)
          if (storedSubmission !== null) {
            setCompletedSubmissionId(storedSubmission.submissionId)
            setCompletedReportAccessToken(storedSubmission.accessToken)
            setStep("complete")
          }
        }
      } catch {
        // Ignore storage failures.
      }

      try {
        const [payload, consent] = await Promise.all([
          api<InitialPayload>(`/api/assessment-links/${token}`),
          api<{ requires_consent: boolean; consent_text: string }>(`/api/assessment-links/${token}/consent`),
        ])
        if (!mounted) return
        setInitialPayload(payload)
        setConsentInfo(consent)
      } catch (err) {
        if (!mounted) return
        setError(err instanceof Error ? err.message : "검사 정보를 불러오지 못했습니다.")
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [token])

  async function proceedToQuestionStep(
    profile: Profile,
    options: {
      reopenAutoCreateModal?: boolean
      client_id?: number | null
      responder_choice?: "existing" | "new" | null
      candidate_client_ids?: number[]
      allow_retake?: boolean
    } = {}
  ) {
    const { reopenAutoCreateModal = true, client_id, responder_choice, candidate_client_ids, allow_retake = false } = options
    setError("")
    if (!allow_retake) {
      setRetakePrompt(null)
    }
    setProfileLoading(true)
    try {
      const result = await api<{
        assessment_payload?: AssessmentPayload
        client_id?: number
        is_ambiguous_match?: boolean
        responder_choice?: "existing" | "new" | null
        candidate_client_ids?: number[]
      }>(
        `/api/assessment-links/${token}/validate-profile`,
        {
          method: "POST",
          body: JSON.stringify({
            profile,
            client_id: client_id ?? null,
            responder_choice: responder_choice ?? null,
            allow_retake,
          }),
        }
      )
      const nextParts = result.assessment_payload
        ? normalizeAssessmentParts(result.assessment_payload)
        : parts
      if (!nextParts.some((part) => part.items.length)) {
        setError("표시할 문항이 없습니다.")
        return
      }
      setParts(nextParts)
      setActiveProfile(profile)
      // Store confirmed client + ambiguous context for submit
      const resolvedClientId = result.client_id ?? null
      setConfirmedClientId(resolvedClientId)
      // Record consent if consent was given and client is now known
      if (consentInfo?.requires_consent && resolvedClientId !== null) {
        fetch(`/api/assessment-links/${token}/consent`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ client_id: resolvedClientId, consented: true }),
        }).catch(() => {})
      }
      if (result.is_ambiguous_match) {
        setAmbiguousMatchContext({
          is_ambiguous_match: true,
          responder_choice: result.responder_choice ?? null,
          candidate_client_ids: result.candidate_client_ids ?? candidate_client_ids ?? [],
        })
      } else {
        setAmbiguousMatchContext(null)
      }
      setStep("question")
    } catch (err) {
      const apiError = err as ApiError
      if (apiError.code === AUTO_CREATE_CONFIRM_REQUIRED_CODE) {
        if (reopenAutoCreateModal) {
          setModalProfile(profile)
          setError(apiError.message || "내담자 등록 또는 연결 확인이 필요합니다.")
        } else {
          setError("내담자 등록은 완료됐지만 검사 배정 확인이 다시 필요합니다. 잠시 후 다시 시도해주세요.")
        }
        return
      }
      if (apiError.code === AMBIGUOUS_CLIENT_CODE) {
        const detail = apiError.detail as Record<string, unknown> | null
        const candidates = Array.isArray(detail?.candidates)
          ? (detail.candidates as AmbiguousCandidate[])
          : []
        setAmbiguousCandidates(candidates)
        setAmbiguousProfile(profile)
        setError("")
        return
      }
      if (apiError.code === ALREADY_SUBMITTED_CONFIRM_REQUIRED_CODE) {
        const detail = apiError.detail as Record<string, unknown> | null
        const existing = detail?.existing_submission
        if (existing && typeof existing === "object") {
          const existingRecord = existing as Record<string, unknown>
          const existingSubmissionId = existingRecord.submission_id
          const existingAccessToken = existingRecord.access_token
          if (typeof existingSubmissionId !== "number" || typeof existingAccessToken !== "string") {
            setError(apiError.message || "기존 검사 결과 정보를 확인하지 못했습니다.")
            return
          }
          setRetakePrompt({
            existingSubmission: {
              submission_id: existingSubmissionId,
              access_token: existingAccessToken,
              submitted_at: typeof existingRecord.submitted_at === "string" ? existingRecord.submitted_at : undefined,
            },
            profile,
            options: {
              client_id: client_id ?? null,
              responder_choice: responder_choice ?? null,
              candidate_client_ids: candidate_client_ids ?? [],
            },
          })
          setError("")
          return
        }
      }
      setError(apiError.message || "배정된 내담자 확인에 실패했습니다.")
    } finally {
      setProfileLoading(false)
    }
  }

  async function handleRegisterClient() {
    if (!modalProfile || registering) return
    setRegistering(true)
    setError("내담자 등록과 검사 배정을 진행하는 중입니다.")
    try {
      await api(`/api/assessment-links/${token}/register-client`, {
        method: "POST",
        body: JSON.stringify({ profile: modalProfile }),
      })
      const profile = modalProfile
      setModalProfile(null)
      await proceedToQuestionStep(profile, { reopenAutoCreateModal: false })
    } catch (err) {
      setError(err instanceof Error ? err.message : "내담자 등록과 배정에 실패했습니다.")
    } finally {
      setRegistering(false)
    }
  }

  async function handleAmbiguousSelect(choice: { type: "existing"; clientId: number } | { type: "new" }) {
    if (!ambiguousProfile || ambiguousResolving) return
    setAmbiguousResolving(true)
    setError("")
    const profile = ambiguousProfile
    const candidateIds = ambiguousCandidates.map((c) => c.id)
    setAmbiguousProfile(null)
    setAmbiguousCandidates([])
    try {
      if (choice.type === "existing") {
        await proceedToQuestionStep(profile, {
          client_id: choice.clientId,
          responder_choice: "existing",
          candidate_client_ids: candidateIds,
        })
      } else {
        await proceedToQuestionStep(profile, {
          responder_choice: "new",
          candidate_client_ids: candidateIds,
        })
      }
    } finally {
      setAmbiguousResolving(false)
    }
  }

  function handleViewExistingResult() {
    if (!retakePrompt) return
    const existing = retakePrompt.existingSubmission
    window.open(
      `/report/${existing.submission_id}?token=${encodeURIComponent(existing.access_token)}`,
      "_blank",
      "noopener,noreferrer"
    )
  }

  async function handleRetakeConfirm() {
    if (!retakePrompt || profileLoading) return
    const { profile, options } = retakePrompt
    setRetakePrompt(null)
    await proceedToQuestionStep(profile, {
      ...options,
      allow_retake: true,
    })
  }

  async function handleSubmit(answers: AnswerState) {
    if (!activeProfile || submitting) return
    setSubmitting(true)
    setError("")
    try {
      const result = await api<{ submission_id?: number; access_token?: string }>(`/api/assessment-links/${token}/submit`, {
        method: "POST",
        body: JSON.stringify({
          responder_name: "",
          profile: activeProfile,
          answers,
          client_id: confirmedClientId ?? null,
          is_ambiguous_match: ambiguousMatchContext?.is_ambiguous_match ?? false,
          responder_choice: ambiguousMatchContext?.responder_choice ?? null,
          candidate_client_ids: ambiguousMatchContext?.candidate_client_ids ?? [],
        }),
      })
      const submissionId = typeof result.submission_id === "number" ? result.submission_id : null
      const reportAccessToken = typeof result.access_token === "string" ? result.access_token : null
      setCompletedSubmissionId(submissionId)
      setCompletedReportAccessToken(reportAccessToken)
      try {
        sessionStorage.setItem(
          completionStorageKey(token),
          submissionId === null || reportAccessToken === null
            ? "1"
            : JSON.stringify({ submission_id: submissionId, access_token: reportAccessToken })
        )
      } catch {
        // Ignore storage failures.
      }
      window.history.replaceState({ assessmentDone: true }, "", window.location.pathname)
      setStep("complete")
    } catch (err) {
      setError(err instanceof Error ? err.message : "응답 제출에 실패했습니다.")
    } finally {
      setSubmitting(false)
    }
  }

  function handleRestart() {
    try {
      sessionStorage.removeItem(completionStorageKey(token))
    } catch {
      // Ignore storage failures.
    }
    window.location.href = window.location.pathname
  }

  const title = initialPayload?.custom_test_name || "검사 실시"
  const stepMeta: Record<AssessmentStep, { label: string; helper: string }> = {
    consent: {
      label: "개인정보동의",
      helper: "개인정보 수집·이용 동의 여부를 선택해주세요.",
    },
    profile: {
      label: "본인 확인",
      helper: "검사 대상 확인과 결과 연결에 필요한 정보를 입력합니다.",
    },
    question: {
      label: "검사 실시",
      helper: "문항을 읽고 가장 가까운 응답을 선택해주세요.",
    },
    complete: {
      label: "제출 완료",
      helper: "응답 저장이 완료되었습니다.",
    },
  }
  const shellWidthClass = step === "profile" ? "w-full max-w-none" : step === "question" ? "w-full max-w-7xl" : "w-full max-w-5xl"

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f5f7fa] px-4 py-10">
        <div className="mx-auto max-w-[500px] rounded-xl bg-white p-6 text-center text-sm text-muted-foreground shadow-sm">
          검사 정보를 불러오는 중입니다.
        </div>
      </main>
    )
  }

  if (!initialPayload && step !== "complete") {
    return (
      <main className="min-h-screen bg-[#f5f7fa] px-4 py-10">
        <div className="mx-auto max-w-[500px] rounded-xl bg-white p-6 text-center text-sm text-destructive shadow-sm">
          {error || "검사 정보를 불러오지 못했습니다."}
        </div>
      </main>
    )
  }

  if (step === "complete") {
    return <CompleteStep onRestart={handleRestart} reportAccessToken={completedReportAccessToken} submissionId={completedSubmissionId} />
  }

  return (
    <main className={step === "profile" ? "min-h-screen bg-[#f4f6f5]" : "min-h-screen bg-[#f5f7fa] px-4 py-6 sm:py-8"}>
      <div className={`mx-auto flex ${shellWidthClass} flex-col gap-4`}>
        {step !== "profile" && (
          <header className="overflow-hidden rounded-xl border border-[#d8e3df] bg-white shadow-sm">
            <div className="h-[3px] bg-[#175e63]" />
            <div className="flex flex-col gap-4 px-5 py-4 sm:px-6 sm:py-5 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#175e63]">
                  {stepMeta[step].label}
                </p>
                <h1 className="mt-1 text-xl font-bold tracking-tight text-foreground sm:text-2xl">{title}</h1>
                <p className="mt-1 text-sm text-muted-foreground">{stepMeta[step].helper}</p>
                {(activeProfile && step === "question") && (
                  <p className="mt-1 text-sm text-muted-foreground">{profileSummary(activeProfile)}</p>
                )}
              </div>
              <nav className="flex shrink-0 items-center gap-1.5 pt-0.5" aria-label="검사 단계">
                {(["profile", "question", "complete"] as AssessmentStep[]).map((itemStep, index) => {
                  const isCurrent = itemStep === step
                  const isPast = step === "question" && itemStep === "profile"
                  const isLast = index === 2
                  return (
                    <React.Fragment key={itemStep}>
                      <div className="flex items-center gap-1">
                        <div
                          className={`flex size-5 items-center justify-center rounded-full text-[10px] font-bold leading-none ${
                            isCurrent
                              ? "bg-[#175e63] text-white"
                              : isPast
                                ? "bg-[#4f6f52] text-white"
                                : "border border-border bg-background text-muted-foreground"
                          }`}
                        >
                          {isPast ? (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="size-2.5" aria-hidden="true">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          ) : (
                            String(index + 1)
                          )}
                        </div>
                        <span className={`hidden text-xs sm:inline ${isCurrent ? "font-semibold text-[#175e63]" : isPast ? "text-[#4f6f52]" : "text-muted-foreground"}`}>
                          {stepMeta[itemStep].label}
                        </span>
                      </div>
                      {!isLast && (
                        <div className={`h-px w-4 ${isPast ? "bg-[#b8c9b9]" : "bg-border"}`} />
                      )}
                    </React.Fragment>
                  )
                })}
              </nav>
            </div>
          </header>
        )}

        {step === "profile" && initialPayload && (
          <ProfileStep
            payload={initialPayload}
            onNext={proceedToQuestionStep}
            loading={profileLoading}
            error={error}
            requiresConsent={consentInfo?.requires_consent ?? false}
            consentText={consentInfo?.consent_text}
            scrollToHistory={retakePrompt !== null}
            retakeInfo={retakePrompt?.existingSubmission ?? null}
            retakeProfile={retakePrompt?.profile ?? null}
            onRetakeConfirm={handleRetakeConfirm}
            onViewExistingResult={handleViewExistingResult}
          />
        )}

        {step === "question" && activeProfile && (
          <QuestionStep
            parts={parts}
            onSubmit={handleSubmit}
            submitting={submitting}
            error={error}
          />
        )}

      </div>

      {modalProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <section className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-xl">
            <div className="h-1 bg-[#1F4E79]" />
            <div className="p-6">
              <h2 className="text-lg font-semibold">내담자 연결 확인</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                기존 내담자를 재사용하거나 신규 내담자로 등록해 현재 검사에 연결합니다.
              </p>
              <p className="mt-4 rounded-lg bg-[#f5f7fa] p-3 text-sm">{profileSummary(modalProfile)}</p>
              {error && <p className="mt-3 text-sm text-muted-foreground">{error}</p>}
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  disabled={registering}
                  onClick={() => setModalProfile(null)}
                  className="h-10 rounded-lg border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50"
                >
                  취소
                </button>
                <button
                  type="button"
                  disabled={registering}
                  onClick={handleRegisterClient}
                  className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {registering ? "등록 중..." : "예"}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      {ambiguousProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <section className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-xl">
            <div className="h-1 bg-[#1F4E79]" />
            <div className="p-6">
              <h2 className="text-lg font-semibold">내담자 확인</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                입력하신 인적정보와 일치하는 내담자가 여러 명 있습니다. 본인에 해당하는 내담자를 선택하거나 신규 등록을 진행해주세요.
              </p>
              <div className="mt-4 flex flex-col gap-2">
                {ambiguousCandidates.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    disabled={ambiguousResolving}
                    onClick={() => handleAmbiguousSelect({ type: "existing", clientId: c.id })}
                    className="flex w-full items-center justify-between rounded-lg border border-input bg-background px-4 py-3 text-sm transition-colors hover:bg-accent disabled:opacity-50"
                  >
                    <span className="font-medium">{c.name}</span>
                    <span className="text-muted-foreground">
                      {c.gender === "male" ? "남" : c.gender === "female" ? "여" : c.gender}
                      {c.birth_day ? ` · ${c.birth_day}` : ""}
                    </span>
                  </button>
                ))}
              </div>
              {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
              <div className="mt-5 flex justify-between gap-2">
                <button
                  type="button"
                  disabled={ambiguousResolving}
                  onClick={() => { setAmbiguousProfile(null); setAmbiguousCandidates([]) }}
                  className="h-10 rounded-lg border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50"
                >
                  취소
                </button>
                <button
                  type="button"
                  disabled={ambiguousResolving}
                  onClick={() => handleAmbiguousSelect({ type: "new" })}
                  className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {ambiguousResolving ? "처리 중..." : "신규 내담자로 등록"}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

    </main>
  )
}
