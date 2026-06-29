import * as React from "react"
import { useParams } from "react-router-dom"
import { ProfileStep } from "./steps/ProfileStep"
import { TestTypeStep } from "./steps/TestTypeStep"
import { IntroStep } from "./steps/IntroStep"
import { QuestionStep } from "./steps/QuestionStep"
import { CompleteStep } from "./steps/CompleteStep"
import {
  ALREADY_SUBMITTED_CONFIRM_REQUIRED_CODE,
  AMBIGUOUS_CLIENT_CODE,
  AUTO_CREATE_CONFIRM_REQUIRED_CODE,
  type AmbiguousCandidate,
  type AnswerState,
  type AssessmentDraft,
  type AssessmentPart,
  type AssessmentPayload,
  type AssessmentSession,
  type AssessmentStep,
  type InitialPayload,
  type Profile,
  type ProfileFieldOption,
  type TestProfileFieldConfig,
  type TestProfileSection,
} from "./types"

interface ApiError extends Error {
  status?: number
  code?: string
  detail?: unknown
}

const STEP_TRANSITION_MS = 180

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

function readCompletedSubmission(token: string): { submissionId: number; accessToken: string; showReportResult: boolean } | null {
  try {
    const raw = sessionStorage.getItem(completionStorageKey(token))
    if (!raw) return null
    if (raw === "1") return null
    const parsed = JSON.parse(raw) as { submission_id?: unknown; access_token?: unknown; show_report_result?: unknown }
    if (typeof parsed.submission_id !== "number" || typeof parsed.access_token !== "string") return null
    return {
      submissionId: parsed.submission_id,
      accessToken: parsed.access_token,
      showReportResult: parsed.show_report_result !== false,
    }
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
    session_id: part.session_id || "session_1",
    session_index: Number.isFinite(part.session_index) ? Number(part.session_index) : 0,
    session_title: part.session_title || "세션 1",
    session_description: part.session_description || "",
    session_guide_items: Array.isArray(part.session_guide_items) ? part.session_guide_items.map(String).filter(Boolean) : [],
    response_options: part.response_options ?? [],
    items: (part.items ?? []).map((item, itemIndex) => ({
      ...item,
      order_index: itemIndex + 1,
      global_order_index: globalOrderIndex++,
    })),
    item_count: part.items?.length ?? 0,
  }))
}

function normalizeAssessmentSessions(payload: AssessmentPayload, parts: AssessmentPart[]): AssessmentSession[] {
  const rawSessions = Array.isArray(payload.sessions) ? payload.sessions : []
  const sessions = rawSessions
    .map((session, index) => ({
      session_id: String(session.session_id || `session_${index + 1}`),
      session_index: Number.isFinite(session.session_index) ? Number(session.session_index) : index,
      title: String(session.title || `세션 ${index + 1}`),
      description: String(session.description || ""),
      guide_items: Array.isArray(session.guide_items) ? session.guide_items.map(String).filter(Boolean) : [],
      test_ids: Array.isArray(session.test_ids) ? session.test_ids.map(String) : [],
    }))
    .filter((session) => parts.some((part) => part.session_id === session.session_id))

  if (sessions.length) {
    return sessions.sort((a, b) => a.session_index - b.session_index)
  }

  const firstPart = parts[0]
  return [
    {
      session_id: firstPart?.session_id || "session_1",
      session_index: 0,
      title: firstPart?.session_title || "세션 1",
      description: firstPart?.session_description || "",
      guide_items: Array.isArray(firstPart?.session_guide_items) ? firstPart.session_guide_items.map(String).filter(Boolean) : [],
      test_ids: [],
    },
  ]
}

const SUBJECT_HEADER_LABELS: Record<string, string> = {
  self: "본인",
  child: "아동",
  parent: "보호자",
  teacher: "교사",
  classmate: "친구/동료",
  guardian: "보호자",
}

const SCHOOL_AGE_LABELS = [
  "미취학",
  "초등 1학년",
  "초등 2학년",
  "초등 3학년",
  "초등 4학년",
  "초등 5학년",
  "초등 6학년",
  "초등학교 졸업생",
  "중등 1학년",
  "중등 2학년",
  "중등 3학년",
  "중학교 졸업생",
  "고등 1학년",
  "고등 2학년",
  "고등 3학년",
  "고등학교 졸업생",
  "대학교 재학생",
  "대학교 졸업생",
  "대학원 재학생",
  "대학원 졸업생",
]

function profileFieldKey(name: string, subjectType: string, isMixed: boolean): string {
  if (!isMixed || name === "informant") return name
  if (subjectType === "self" || (subjectType === "child" && name === "name")) return name
  return `${subjectType}_${name}`
}

function profileSections(payload: InitialPayload | null): TestProfileSection[] {
  const config = payload?.profile_config
  if (!config) return [{ subject_type: "self", fields: {} }]
  if (config.subject_type === "mixed" && Array.isArray(config.sections)) return config.sections
  return [config as TestProfileSection]
}

function stringProfileValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value.map(String).filter(Boolean).join(", ")
  return String(value ?? "").trim()
}

function optionLabel(options: Array<string | ProfileFieldOption> | undefined, value: string): string {
  const normalized = value.trim()
  if (!normalized) return ""
  for (const option of options ?? []) {
    if (typeof option === "string") {
      if (option === normalized) return option
      continue
    }
    if (String(option.value) === normalized) return String(option.label || option.value)
  }
  return normalized
}

function formatProfileSummaryValue(fieldName: string, fieldConfig: TestProfileFieldConfig | undefined, value: string): string {
  if (!value) return ""
  if (fieldName === "gender") {
    if (value === "male") return "남"
    if (value === "female") return "여"
  }
  if (fieldName === "school_age" || fieldName === "school_age_range") {
    const fromOptions = optionLabel(fieldConfig?.options, value)
    if (fromOptions !== value) return fromOptions
    const index = Number(value)
    if (Number.isInteger(index) && index >= 0 && index < SCHOOL_AGE_LABELS.length) return SCHOOL_AGE_LABELS[index]
  }
  return optionLabel(fieldConfig?.options, value)
}

function findSchoolSummary(profile: Profile, sections: TestProfileSection[], isMixed: boolean): string {
  const candidates: Array<{ key: string; config?: TestProfileFieldConfig }> = []
  for (const section of sections) {
    for (const fieldName of ["school_age_range", "school_age"]) {
      candidates.push({
        key: profileFieldKey(fieldName, section.subject_type, isMixed),
        config: section.fields?.[fieldName],
      })
    }
  }
  candidates.push(
    { key: "school_age_range" },
    { key: "school_age" },
    { key: "child_school_age_range" },
    { key: "child_school_age" },
  )

  const seen = new Set<string>()
  for (const candidate of candidates) {
    if (seen.has(candidate.key)) continue
    seen.add(candidate.key)
    const value = stringProfileValue(profile[candidate.key])
    if (!value) continue
    return `소속: ${formatProfileSummaryValue(candidate.key.includes("range") ? "school_age_range" : "school_age", candidate.config, value)}`
  }
  return ""
}

function profileSummary(profile: Profile, payload: InitialPayload | null) {
  const sections = profileSections(payload)
  const isMixed = sections.length > 1
  const entries: string[] = []

  if (isMixed) {
    for (const section of sections) {
      const value = stringProfileValue(profile[profileFieldKey("name", section.subject_type, true)])
      if (!value) continue
      const label = SUBJECT_HEADER_LABELS[section.subject_type] ?? section.subject_type
      entries.push(`${label}: ${value}`)
      if (entries.length >= 2) break
    }
    const school = findSchoolSummary(profile, sections, true)
    if (school) entries.push(school)
  } else {
    const section = sections[0] ?? { subject_type: "self", fields: {} }
    const name = stringProfileValue(profile.name)
    if (name) entries.push(`이름: ${name}`)
    const gender = stringProfileValue(profile.gender)
    if (gender) entries.push(`성별: ${formatProfileSummaryValue("gender", section.fields?.gender, gender)}`)
    const school = findSchoolSummary(profile, sections, false)
    if (school) entries.push(school)
  }

  if (!entries.length) return "입력 정보 없음"
  return entries.slice(0, 3).join(" / ")
}

function shouldShowTestTypeStep(payload: InitialPayload | null): boolean {
  const config = payload?.test_type_selection
  return Boolean(config?.enabled && Array.isArray(config.options) && config.options.length >= 2)
}

export function AssessmentPage() {
  const { accessToken } = useParams()
  const token = accessToken ?? ""

  const [initialPayload, setInitialPayload] = React.useState<InitialPayload | null>(null)
  const [parts, setParts] = React.useState<AssessmentPart[]>([])
  const [sessions, setSessions] = React.useState<AssessmentSession[]>([])
  const [activeSessionIndex, setActiveSessionIndex] = React.useState(0)
  const [sessionAnswers, setSessionAnswers] = React.useState<AnswerState>({})
  const sessionAnswersRef = React.useRef<AnswerState>({})
  const [activeProfile, setActiveProfile] = React.useState<Profile | null>(null)
  const [selectedTestType, setSelectedTestType] = React.useState<string | null>(null)
  const [step, setStep] = React.useState<AssessmentStep>("profile")
  const [visibleStep, setVisibleStep] = React.useState<AssessmentStep>("profile")
  const [stepTransitionState, setStepTransitionState] = React.useState<"idle" | "out" | "in">("idle")
  const [loading, setLoading] = React.useState(true)
  const [consentInfo, setConsentInfo] = React.useState<{
    requires_consent: boolean
    consent_text: string
    requires_security_notice?: boolean
    security_notice_text?: string
  } | null>(null)
  const [profileLoading, setProfileLoading] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [activeDraft, setActiveDraft] = React.useState<AssessmentDraft | null>(null)
  const [draftStatus, setDraftStatus] = React.useState<"idle" | "restored" | "saving" | "saved" | "error">("idle")
  const [completedSubmissionId, setCompletedSubmissionId] = React.useState<number | null>(null)
  const [completedReportAccessToken, setCompletedReportAccessToken] = React.useState<string | null>(null)
  const [completedShowReportResult, setCompletedShowReportResult] = React.useState(true)
  const [error, setError] = React.useState("")

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
  const draftSaveTimerRef = React.useRef<number | null>(null)
  const draftStatusTimerRef = React.useRef<number | null>(null)
  const visibleStepRef = React.useRef<AssessmentStep>("profile")

  React.useEffect(() => {
    return () => {
      if (draftSaveTimerRef.current !== null) window.clearTimeout(draftSaveTimerRef.current)
      if (draftStatusTimerRef.current !== null) window.clearTimeout(draftStatusTimerRef.current)
    }
  }, [])

  React.useEffect(() => {
    if (step === "complete" || step === visibleStepRef.current) return

    let entryTimer: number | null = null
    setStepTransitionState("out")
    const exitTimer = window.setTimeout(() => {
      visibleStepRef.current = step
      setVisibleStep(step)
      setStepTransitionState("in")
      entryTimer = window.setTimeout(() => {
        setStepTransitionState("idle")
      }, 30)
    }, STEP_TRANSITION_MS)

    return () => {
      window.clearTimeout(exitTimer)
      if (entryTimer !== null) window.clearTimeout(entryTimer)
    }
  }, [step])

  React.useEffect(() => {
    let mounted = true
    async function load() {
      if (!token) {
        setError("유효하지 않은 접근입니다.")
        setLoading(false)
        return
      }

      let shouldStayComplete = false
      try {
        if (sessionStorage.getItem(completionStorageKey(token)) === "1") {
          setStep("complete")
          shouldStayComplete = true
        } else {
          const storedSubmission = readCompletedSubmission(token)
            if (storedSubmission !== null) {
              setCompletedSubmissionId(storedSubmission.submissionId)
              setCompletedReportAccessToken(storedSubmission.accessToken)
              setCompletedShowReportResult(storedSubmission.showReportResult)
              setStep("complete")
              shouldStayComplete = true
            }
        }
      } catch {
        // Ignore storage failures.
      }

      try {
        const [payload, consent] = await Promise.all([
          api<InitialPayload>(`/api/assessment-links/${token}`),
          api<{
            requires_consent: boolean
            consent_text: string
            requires_security_notice?: boolean
            security_notice_text?: string
          }>(`/api/assessment-links/${token}/consent`),
        ])
        if (!mounted) return
        setInitialPayload(payload)
        if (!shouldStayComplete && shouldShowTestTypeStep(payload)) {
          const defaultValue = payload.test_type_selection?.default_value || payload.test_type_selection?.options[0] || null
          setSelectedTestType(defaultValue)
          setStep("test_type")
        }
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
      autoRegisterOnAutoCreateRequired?: boolean
      client_id?: number | null
      responder_choice?: "existing" | "new" | null
      candidate_client_ids?: number[]
      allow_retake?: boolean
    } = {}
  ) {
    const { autoRegisterOnAutoCreateRequired = true, client_id, responder_choice, candidate_client_ids, allow_retake = false } = options
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
        draft?: AssessmentDraft | null
      }>(
        `/api/assessment-links/${token}/validate-profile`,
        {
          method: "POST",
          body: JSON.stringify({
            profile,
            client_id: client_id ?? null,
            responder_choice: responder_choice ?? null,
            allow_retake,
            selected_test_type: selectedTestType,
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
      setSessions(result.assessment_payload ? normalizeAssessmentSessions(result.assessment_payload, nextParts) : normalizeAssessmentSessions({ parts: nextParts }, nextParts))
      setActiveSessionIndex(0)
      const restoredAnswers = result.draft?.answers ?? {}
      sessionAnswersRef.current = restoredAnswers
      setSessionAnswers(restoredAnswers)
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
      if (result.draft) {
        setActiveDraft(result.draft)
        setDraftStatus("restored")
      } else {
        setActiveDraft(null)
        setDraftStatus("idle")
      }
      setStep("intro")
    } catch (err) {
      const apiError = err as ApiError
      if (apiError.code === AUTO_CREATE_CONFIRM_REQUIRED_CODE) {
        if (autoRegisterOnAutoCreateRequired) {
          try {
            await api(`/api/assessment-links/${token}/register-client`, {
              method: "POST",
              body: JSON.stringify({ profile }),
            })
            await proceedToQuestionStep(profile, { autoRegisterOnAutoCreateRequired: false })
          } catch (registerError) {
            setError(registerError instanceof Error ? registerError.message : "내담자 등록과 배정에 실패했습니다.")
          }
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
    if (!retakePrompt || initialPayload?.show_report_result === false) return
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
      const result = await api<{ submission_id?: number; access_token?: string; show_report_result?: boolean }>(`/api/assessment-links/${token}/submit`, {
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
      const showReportResult = result.show_report_result !== false
      setCompletedSubmissionId(submissionId)
      setCompletedReportAccessToken(reportAccessToken)
      setCompletedShowReportResult(showReportResult)
      setActiveDraft(null)
      setDraftStatus("idle")
      if (draftSaveTimerRef.current !== null) {
        window.clearTimeout(draftSaveTimerRef.current)
        draftSaveTimerRef.current = null
      }
      try {
        sessionStorage.setItem(
          completionStorageKey(token),
          submissionId === null || reportAccessToken === null
            ? "1"
            : JSON.stringify({ submission_id: submissionId, access_token: reportAccessToken, show_report_result: showReportResult })
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

  function handleSessionSubmit(answers: AnswerState) {
    const mergedAnswers = { ...sessionAnswersRef.current, ...answers }
    sessionAnswersRef.current = mergedAnswers
    setSessionAnswers(mergedAnswers)
    if (activeSessionIndex < sessions.length - 1) {
      setActiveSessionIndex((current) => current + 1)
      setStep("intro")
      return
    }
    void handleSubmit(mergedAnswers)
  }

  const activeSession = sessions[activeSessionIndex] ?? sessions[0] ?? null
  const activeSessionParts = activeSession
    ? parts.filter((part) => part.session_id === activeSession.session_id)
    : parts

  const handleQuestionProgressChange = React.useCallback(
    (state: { answers: AnswerState; currentPartIndex: number; currentPage: number }) => {
      if (!activeProfile || confirmedClientId === null || submitting) return
      const mergedAnswers = { ...sessionAnswersRef.current, ...state.answers }
      if (draftSaveTimerRef.current !== null) window.clearTimeout(draftSaveTimerRef.current)
      draftSaveTimerRef.current = window.setTimeout(async () => {
        setDraftStatus("saving")
        try {
          const result = await api<{ draft?: AssessmentDraft | null }>(`/api/assessment-links/${token}/draft`, {
            method: "PUT",
            body: JSON.stringify({
              profile: activeProfile,
              answers: mergedAnswers,
              client_id: confirmedClientId,
              current_part_index: state.currentPartIndex,
              current_page: state.currentPage,
              is_ambiguous_match: ambiguousMatchContext?.is_ambiguous_match ?? false,
              responder_choice: ambiguousMatchContext?.responder_choice ?? null,
              candidate_client_ids: ambiguousMatchContext?.candidate_client_ids ?? [],
            }),
          })
          if (result.draft) setActiveDraft(result.draft)
          setDraftStatus("saved")
          if (draftStatusTimerRef.current !== null) window.clearTimeout(draftStatusTimerRef.current)
          draftStatusTimerRef.current = window.setTimeout(() => setDraftStatus("idle"), 2500)
        } catch {
          setDraftStatus("error")
        }
      }, 900)
    },
    [activeProfile, ambiguousMatchContext, confirmedClientId, submitting, token]
  )

  function handleRestart() {
    try {
      sessionStorage.removeItem(completionStorageKey(token))
    } catch {
      // Ignore storage failures.
    }
    window.location.href = window.location.pathname
  }

  const SESSION_CLASSES = ["session-teal", "session-ocean", "session-navy"] as const
  const sessionClass = SESSION_CLASSES[Math.min(activeSessionIndex, SESSION_CLASSES.length - 1)]

  const title = initialPayload?.custom_test_name || "검사 실시"
  const stepMeta: Record<AssessmentStep, { label: string; helper: string }> = {
    consent: {
      label: "개인정보동의",
      helper: "개인정보 수집·이용 동의 여부를 선택해주세요.",
    },
    test_type: {
      label: "검사 유형",
      helper: "검사 시작 전 진행할 유형을 선택합니다.",
    },
    profile: {
      label: "인적사항",
      helper: "검사 대상 확인과 결과 연결에 필요한 정보를 입력합니다.",
    },
    intro: {
      label: "검사 안내",
      helper: "검사 방법과 구성을 확인한 뒤 시작하세요.",
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
  const activeStep = visibleStep
  const shellWidthClass =
    activeStep === "test_type" ? "w-full max-w-none"
    : activeStep === "profile" ? "w-full max-w-none"
    : activeStep === "question" ? "w-full"
    : activeStep === "intro" ? "w-full max-w-none"
    : "w-full max-w-5xl"
  const progressSteps: Exclude<AssessmentStep, "consent">[] = shouldShowTestTypeStep(initialPayload)
    ? ["test_type", "profile", "intro", "question", "complete"]
    : ["profile", "intro", "question", "complete"]
  const currentStepIndex = progressSteps.findIndex((itemStep) => itemStep === activeStep)
  const stepForProgress: AssessmentStep = activeStep
  const stepTransitionClass =
    stepTransitionState === "out" ? "assessment-step-out"
    : stepTransitionState === "in" ? "assessment-step-in"
    : "assessment-step-idle"
  const draftStatusText =
    draftStatus === "restored" ? "저장된 응답을 불러왔습니다."
    : draftStatus === "saving" ? "임시저장 중..."
    : draftStatus === "saved" ? "임시저장됨"
    : draftStatus === "error" ? "임시저장 실패"
    : ""

  if (loading) {
    return (
      <main className="hero-tint min-h-screen bg-[#eef2f4] px-4 py-10">
        <div className="mx-auto max-w-[500px] rounded-xl bg-white p-6 text-center text-sm text-muted-foreground assessment-card">
          검사 정보를 불러오는 중입니다.
        </div>
      </main>
    )
  }

  if (!initialPayload && step !== "complete") {
    return (
      <main className="hero-tint min-h-screen bg-[#eef2f4] px-4 py-10">
        <div className="mx-auto max-w-[500px] rounded-xl bg-white p-6 text-center text-sm text-destructive assessment-card">
          {error || "검사 정보를 불러오지 못했습니다."}
        </div>
      </main>
    )
  }

  if (step === "complete") {
    return (
      <CompleteStep
        onRestart={handleRestart}
        reportAccessToken={completedReportAccessToken}
        submissionId={completedSubmissionId}
        showReportResult={completedShowReportResult}
      />
    )
  }

  return (
    <main className={
      activeStep === "test_type" ? "min-h-screen bg-[#f4f6f5] transition-colors duration-300 ease-out"
      : activeStep === "profile" ? "min-h-screen bg-[#f4f6f5] transition-colors duration-300 ease-out"
      : activeStep === "question" ? "min-h-screen transition-colors duration-300 ease-out"
      : activeStep === "intro" ? "min-h-screen bg-[#eef2f4] transition-colors duration-300 ease-out"
      : "hero-tint min-h-screen bg-[#eef2f4] px-4 py-6 transition-colors duration-300 ease-out sm:py-8"
    }>
      <div className={`relative mx-auto flex ${shellWidthClass} flex-col gap-4`}>
        {activeStep !== "test_type" && activeStep !== "profile" && activeStep !== "question" && activeStep !== "intro" && (
          <header className="overflow-hidden rounded-xl border border-[#d8e3df] bg-white assessment-card">
            <div className="h-[3px] bg-[#175e63]" />
            <div className="flex flex-col gap-4 px-5 py-4 sm:px-6 sm:py-5 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#175e63]">
                  {stepMeta[activeStep].label}
                </p>
                <h1 className="assessment-korean-title mt-1 text-xl font-bold text-foreground sm:text-2xl">{title}</h1>
                <p className="mt-1 text-sm text-muted-foreground">{stepMeta[activeStep].helper}</p>
              </div>
              <nav className="flex shrink-0 items-center gap-1.5 pt-0.5" aria-label="검사 단계">
                {progressSteps.map((itemStep, index) => {
                  const isCurrent = itemStep === stepForProgress
                  const isPast = currentStepIndex >= 0 && index < currentStepIndex
                  const isLast = index === progressSteps.length - 1
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

        <div className={`assessment-step-frame ${stepTransitionClass}`} data-assessment-step={activeStep}>
          {activeStep === "test_type" && initialPayload && initialPayload.test_type_selection && (
            <TestTypeStep
              testName={initialPayload.custom_test_name || initialPayload.display_name || "검사"}
              heading={initialPayload.test_type_selection.heading}
              description={initialPayload.test_type_selection.description}
              options={initialPayload.test_type_selection.options}
              value={selectedTestType}
              onNext={(value) => {
                setSelectedTestType(value)
                setStep("profile")
              }}
            />
          )}

          {activeStep === "profile" && initialPayload && (
            <ProfileStep
              payload={initialPayload}
              onNext={proceedToQuestionStep}
              loading={profileLoading}
              error={error}
              initialProfile={activeProfile}
              requiresConsent={consentInfo?.requires_consent ?? false}
              consentText={consentInfo?.consent_text}
              requiresSecurityNotice={consentInfo?.requires_security_notice ?? false}
              securityNoticeText={consentInfo?.security_notice_text}
              scrollToHistory={retakePrompt !== null}
              retakeInfo={retakePrompt?.existingSubmission ?? null}
              retakeProfile={retakePrompt?.profile ?? null}
              onRetakeConfirm={handleRetakeConfirm}
              onViewExistingResult={handleViewExistingResult}
              showReportResult={initialPayload.show_report_result !== false}
            />
          )}

          {activeStep === "intro" && initialPayload && parts.length > 0 && (
            <IntroStep
              payload={initialPayload}
              parts={activeSessionParts.length ? activeSessionParts : parts}
              session={activeSession}
              profile={activeProfile}
              onStart={() => setStep("question")}
              onBack={() => setStep("profile")}
              sessionClass={sessionClass}
            />
          )}

          {activeStep === "question" && activeProfile && (
            <QuestionStep
              key={activeSession?.session_id || "session_1"}
              parts={activeSessionParts.length ? activeSessionParts : parts}
              onSubmit={handleSessionSubmit}
              submitting={submitting}
              error={error}
              testName={activeSession?.title ? `${title} · ${activeSession.title}` : title}
              userSummary={profileSummary(activeProfile, initialPayload)}
              saveStatusText={draftStatusText}
              submitLabel={activeSessionIndex < sessions.length - 1 ? "다음 세션 안내" : "제출하기"}
              submittingLabel={activeSessionIndex < sessions.length - 1 ? "이동 중..." : "제출 중..."}
              initialAnswers={sessionAnswers}
              initialPartIndex={activeSessionIndex === 0 ? activeDraft?.current_part_index ?? 0 : 0}
              initialPage={activeSessionIndex === 0 ? activeDraft?.current_page ?? 0 : 0}
              onProgressChange={handleQuestionProgressChange}
              sessionClass={sessionClass}
              allowUnansweredSubmission={Boolean(initialPayload?.allow_unanswered_submission)}
            />
          )}
        </div>

      </div>

      {ambiguousProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f2a2c]/35 px-4 backdrop-blur-sm">
          <section className="assessment-modal-fit-wide overflow-hidden rounded-2xl border border-[#dfe5e3] bg-white shadow-2xl">
            <div className="h-[3px] bg-[#175e63]" />
            <div className="p-6">
              <h2 className="text-lg font-semibold text-[#161d1b]">내담자 확인</h2>
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
                    className="flex w-full items-center justify-between rounded-lg border border-[#dfe5e3] bg-white px-4 py-3 text-sm transition-colors hover:border-[#175e63]/40 hover:bg-[#eef2f4]/60 disabled:opacity-50"
                  >
                    <span className="font-medium text-[#161d1b]">{c.name}</span>
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
                  className="h-10 rounded-lg border border-[#dfe5e3] bg-white px-4 text-sm font-medium text-[#3a4a47] transition-colors hover:bg-[#f3f5f4] disabled:opacity-50"
                >
                  취소
                </button>
                <button
                  type="button"
                  disabled={ambiguousResolving}
                  onClick={() => handleAmbiguousSelect({ type: "new" })}
                  className="h-10 rounded-lg bg-[#175e63] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#124b4f] disabled:opacity-50"
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
