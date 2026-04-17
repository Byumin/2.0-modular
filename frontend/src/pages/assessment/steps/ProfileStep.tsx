import * as React from "react"
import type { InitialPayload, AdditionalProfileField, Profile } from "../types"

const SCHOOL_AGE_OPTIONS = [
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
  "대학생 신입생",
  "대학생 재학생",
  "대학생 졸업생",
  "대학원 신입생",
  "대학원 재학생",
  "대학원 졸업생",
]

const PRIVACY_CONTENT = `개인정보 수집 및 이용 동의

1. 수집 항목
이름, 성별, 생년월일, 학령 및 검사 응답 결과

2. 수집 목적
심리검사 결과 산출, 내담자 관리, 결과 조회 및 관리자 확인

3. 보유 기간
기관 내 보관 정책에 따르며, 동의 철회 시 즉시 삭제 처리합니다.

4. 제3자 제공
수집된 개인정보는 제3자에게 제공되지 않습니다.

5. 동의 거부 권리
개인정보 수집·이용에 동의하지 않을 권리가 있으며, 동의 거부 시 검사 실시가 제한될 수 있습니다.`

interface Props {
  payload: InitialPayload
  onNext: (profile: Profile) => void
  loading: boolean
  error: string
  requiresConsent?: boolean
  consentText?: string
  scrollToHistory?: boolean
  retakeInfo?: { submission_id: number; access_token: string; submitted_at?: string } | null
  retakeProfile?: Profile | null
  onRetakeConfirm?: () => void
  onViewExistingResult?: () => void
}

export function ProfileStep({ payload, onNext, loading, error, requiresConsent = false, consentText, scrollToHistory, retakeInfo, retakeProfile, onRetakeConfirm, onViewExistingResult }: Props) {
  const required = payload.required_profile_fields ?? []
  const testName = payload.custom_test_name || payload.display_name || "검사"
  const [identityOpen, setIdentityOpen] = React.useState(false)
  const [privacyAgreed, setPrivacyAgreed] = React.useState(false)
  const [privacyModalOpen, setPrivacyModalOpen] = React.useState(false)
  const [retakeConfirmOpen, setRetakeConfirmOpen] = React.useState(false)
  const historyRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (scrollToHistory && historyRef.current) {
      historyRef.current.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }, [scrollToHistory])

  const additional = React.useMemo(
    () => (payload.additional_profile_fields ?? [])
      .map((raw) => {
        if (typeof raw === "string") {
          const label = raw.trim()
          if (!label) return null
          return { label, type: "short_text" as const, required: true, placeholder: "", options: [] }
        }
        if (!raw || typeof raw !== "object" || !raw.label?.trim()) return null
        return {
          ...raw,
          options: Array.isArray(raw.options) ? raw.options : [],
        }
      })
      .filter((f): f is AdditionalProfileField => Boolean(f))
      .filter((f) => !["이름", "성별", "생년월일", "학령"].includes(f.label.toLowerCase())),
    [payload.additional_profile_fields]
  )

  const [name, setName] = React.useState("")
  const [gender, setGender] = React.useState("")
  const [birthDay, setBirthDay] = React.useState("")
  const [schoolAge, setSchoolAge] = React.useState("")
  const [extras, setExtras] = React.useState<Record<string, string | string[]>>({})
  const [validationError, setValidationError] = React.useState("")

  function setExtra(label: string, value: string | string[]) {
    setExtras((prev) => ({ ...prev, [label]: value }))
  }

  function toggleMultiSelect(label: string, option: string) {
    setExtras((prev) => {
      const current = Array.isArray(prev[label]) ? (prev[label] as string[]) : []
      const next = current.includes(option)
        ? current.filter((v) => v !== option)
        : [...current, option]
      return { ...prev, [label]: next }
    })
  }

  function validate(): string {
    if (!name.trim()) return "이름"
    if (required.includes("gender") && !gender) return "성별"
    if (required.includes("birth_day") && !birthDay) return "생년월일"
    if (required.includes("school_age") && !schoolAge) return "학령"
    for (const f of additional) {
      if (!f.required) continue
      if (f.type === "multi_select") {
        const val = extras[f.label]
        if (!Array.isArray(val) || val.length === 0) return f.label
      } else {
        if (!String(extras[f.label] ?? "").trim()) return f.label
      }
    }
    return ""
  }

  function buildProfile(): Profile {
    const profile: Profile = { name: name.trim() }
    if (required.includes("gender")) profile.gender = gender
    if (required.includes("birth_day")) profile.birth_day = birthDay
    if (required.includes("school_age")) profile.school_age = schoolAge
    additional.forEach((f) => { profile[f.label] = extras[f.label] ?? "" })
    return profile
  }

  function normalizeProfileValue(value: string | string[] | undefined): string | string[] {
    if (Array.isArray(value)) return [...value].sort()
    return String(value ?? "").trim()
  }

  function isSameProfile(a: Profile, b: Profile): boolean {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)])
    for (const key of keys) {
      const left = normalizeProfileValue(a[key])
      const right = normalizeProfileValue(b[key])
      if (Array.isArray(left) || Array.isArray(right)) {
        if (!Array.isArray(left) || !Array.isArray(right)) return false
        if (left.length !== right.length) return false
        if (left.some((value, index) => value !== right[index])) return false
        continue
      }
      if (left !== right) return false
    }
    return true
  }

  function submitProfile() {
    if (loading) return
    setValidationError("")
    const missing = validate()
    if (missing) {
      setValidationError(`${missing} 항목을 입력해주세요.`)
      return
    }
    const profile = buildProfile()
    if (retakeInfo) {
      if (retakeProfile && isSameProfile(profile, retakeProfile)) {
        setRetakeConfirmOpen(true)
      } else {
        onNext(profile)
      }
      return
    }
    onNext(profile)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    submitProfile()
  }

  function handleStartClick() {
    if (loading) return
    if (requiresConsent && !privacyAgreed) {
      setValidationError("개인정보 수집 및 이용에 동의해주세요.")
      return
    }
    setValidationError("")
    setIdentityOpen(true)
  }

  function renderAdditionalField(f: AdditionalProfileField, idx: number) {
    const id = `extra_${idx}`
    const val = extras[f.label]

    if (f.type === "long_text") {
      return (
        <div key={idx} className="flex flex-col gap-1.5">
          <label htmlFor={id} className="text-sm font-medium">
            {f.label}{f.required && <span className="text-destructive ml-0.5">*</span>}
          </label>
          <textarea
            id={id}
            rows={3}
            placeholder={f.placeholder || `${f.label} 입력`}
            required={f.required}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            value={String(val ?? "")}
            onChange={(e) => setExtra(f.label, e.target.value)}
          />
        </div>
      )
    }

    if (f.type === "select") {
      return (
        <div key={idx} className="flex flex-col gap-1.5">
          <label htmlFor={id} className="text-sm font-medium">
            {f.label}{f.required && <span className="text-destructive ml-0.5">*</span>}
          </label>
          <select
            id={id}
            required={f.required}
            value={String(val ?? "")}
            onChange={(e) => setExtra(f.label, e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <option value="" disabled>{f.placeholder || `${f.label} 선택`}</option>
            {f.options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>
      )
    }

    if (f.type === "multi_select") {
      const checked = Array.isArray(val) ? val : []
      return (
        <div key={idx} className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">
            {f.label}{f.required && <span className="text-destructive ml-0.5">*</span>}
          </span>
          <div className="flex flex-wrap gap-2">
            {f.options.map((opt) => (
              <label key={opt} className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm cursor-pointer transition-colors ${checked.includes(opt) ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-accent"}`}>
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={checked.includes(opt)}
                  onChange={() => toggleMultiSelect(f.label, opt)}
                />
                {opt}
              </label>
            ))}
          </div>
        </div>
      )
    }

    const inputType =
      f.type === "number" ? "number"
      : f.type === "date" ? "date"
      : f.type === "phone" ? "tel"
      : f.type === "email" ? "email"
      : "text"

    return (
      <div key={idx} className="flex flex-col gap-1.5">
        <label htmlFor={id} className="text-sm font-medium">
          {f.label}{f.required && <span className="text-destructive ml-0.5">*</span>}
        </label>
        <input
          id={id}
          type={inputType}
          placeholder={f.placeholder || `${f.label} 입력`}
          required={f.required}
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          value={String(val ?? "")}
          onChange={(e) => setExtra(f.label, e.target.value)}
        />
      </div>
    )
  }

  return (
    <>
      <form
        onSubmit={handleSubmit}
        noValidate
        className="min-h-screen bg-[#f4f6f5]"
      >
        <div className="grid min-h-screen lg:grid-cols-2">
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
                <h1 className="mt-4 max-w-md text-3xl font-bold leading-tight sm:text-4xl">{testName}</h1>
                <p className="mt-4 whitespace-nowrap text-sm leading-6 text-[#5f6f73]">
                  검사 시작 전 본인 확인을 진행합니다. 응답은 제출 후 결과 산출과 관리자 확인에 사용됩니다.
                </p>
              </div>
            </div>
          </section>

          <section className="flex min-h-screen items-start bg-[#f7f8f7] px-5 py-10 sm:px-8 lg:px-12">
            <div className="mx-auto w-full max-w-xl">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight text-[#161d1b]">검사 실시하기</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">인적사항 입력을 완료하면 검사 문항이 시작됩니다.</p>
                </div>
                <span className="w-fit rounded-full border border-[#d8e3df] bg-white px-3 py-1 text-[11px] font-semibold text-[#175e63]">실시 가능</span>
              </div>

              <button
                type="button"
                onClick={handleStartClick}
                disabled={loading}
                className="mt-6 h-13 w-full rounded-md bg-[#175e63] px-5 py-4 text-base font-semibold text-white shadow-sm transition-colors hover:bg-[#124b4f] disabled:opacity-50"
              >
                {loading ? "확인 중..." : "검사 실시하기"}
              </button>

              {requiresConsent && (
                <div className="mt-3 flex items-center justify-between rounded-lg border border-[#dfe5e3] bg-white px-4 py-3">
                  <label className="flex cursor-pointer items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={privacyAgreed}
                      onChange={(e) => {
                        setPrivacyAgreed(e.target.checked)
                        if (e.target.checked) setValidationError("")
                      }}
                      className="h-4 w-4 cursor-pointer rounded border-[#c5d0ce] accent-[#175e63]"
                    />
                    <span className="text-sm text-[#3a4a47]">개인정보 수집 및 이용에 동의합니다 <span className="text-destructive">*</span></span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setPrivacyModalOpen(true)}
                    className="ml-3 shrink-0 text-xs text-[#175e63] underline underline-offset-2 hover:text-[#124b4f]"
                  >
                    내용 보기
                  </button>
                </div>
              )}

              {validationError && !identityOpen && (
                <p className="mt-2 text-sm text-destructive">{validationError}</p>
              )}

              {/* 인적사항 입력 영역 */}
              <div className={`${identityOpen ? "mt-6 grid" : "hidden"} gap-4 rounded-xl border border-[#dfe5e3] bg-white p-5 shadow-sm`}>
                <div>
                  <p className="text-sm font-semibold text-[#161d1b]">인적사항 입력</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">검사 대상과 결과 연결을 위해 필수 정보를 입력해주세요.</p>
                </div>
              {/* 이름 (항상 필수) */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="required_name" className="text-sm font-medium">
                  이름 <span className="text-destructive">*</span>
                </label>
                <input
                  id="required_name"
                  type="text"
                  maxLength={60}
                  placeholder="이름 입력"
                  required
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#175e63]/30"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              {/* 성별 */}
              {required.includes("gender") && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium">성별 <span className="text-destructive">*</span></span>
                  <div className="flex gap-2" role="radiogroup" aria-label="성별">
                    {[{ value: "male", label: "남" }, { value: "female", label: "여" }].map(({ value, label }) => (
                      <label key={value} className={`flex min-h-10 flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border px-3 text-sm font-semibold transition-colors
                        ${gender === value ? "border-[#175e63] bg-[#e8f3f1] text-[#175e63]" : "border-input bg-background hover:bg-accent"}`}>
                        <input
                          type="radio"
                          name="required_gender"
                          value={value}
                          checked={gender === value}
                          onChange={() => setGender(value)}
                          className="sr-only"
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* 생년월일 */}
              {required.includes("birth_day") && (
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="required_birth_day" className="text-sm font-medium">
                    생년월일 <span className="text-destructive">*</span>
                  </label>
                  <input
                    id="required_birth_day"
                    type="date"
                    required
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#175e63]/30"
                    value={birthDay}
                    onChange={(e) => setBirthDay(e.target.value)}
                  />
                </div>
              )}

              {/* 학령 */}
              {required.includes("school_age") && (
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="required_school_age" className="text-sm font-medium">
                    학령 <span className="text-destructive">*</span>
                  </label>
                  <select
                    id="required_school_age"
                    required
                    value={schoolAge}
                    onChange={(e) => setSchoolAge(e.target.value)}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#175e63]/30"
                  >
                    <option value="" disabled>학령을 선택하세요</option>
                    {SCHOOL_AGE_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
              )}

              {/* 추가 필드 */}
              {additional.map((f, i) => renderAdditionalField(f, i))}

              {(validationError || error) && (
                <p className="text-sm text-destructive">{validationError || error}</p>
              )}

              <button
                type="button"
                disabled={loading}
                onClick={submitProfile}
                className="mt-1 h-11 w-full rounded-md bg-[#175e63] text-sm font-semibold text-white transition-colors hover:bg-[#124b4f] disabled:opacity-50"
              >
                {loading ? "확인 중..." : "시작하기"}
              </button>
              </div>

              {/* 전체 실시 내역 */}
              <div ref={historyRef} className="mt-6 rounded-xl border border-[#dfe5e3] bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between border-b border-[#edf0ef] pb-4">
                  <div>
                    <p className="text-sm font-semibold text-[#161d1b]">과거 실시 내역</p>
                    <p className="mt-1 text-xs text-muted-foreground">과거 실시한 기존 결과입니다.</p>
                  </div>
                  <span className="rounded-full bg-[#f3f5f4] px-3 py-1 text-[11px] font-semibold text-muted-foreground">전체</span>
                </div>
                {loading ? (
                  <div className="py-6 text-sm text-muted-foreground">
                    입력하신 정보를 확인하는 중입니다.
                  </div>
                ) : retakeInfo ? (
                  <div className="flex items-center justify-between py-4">
                    <div>
                      <p className="text-sm font-medium text-[#161d1b]">
                        {retakeInfo.submitted_at
                          ? `제출 : ${new Date(retakeInfo.submitted_at).toLocaleString("ko-KR", { year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true })}`
                          : "제출 정보 없음"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={onViewExistingResult}
                      disabled={loading}
                      className="rounded-md border border-[#175e63] px-3 py-1.5 text-xs font-semibold text-[#175e63] hover:bg-[#e8f3f1] transition-colors"
                    >
                      결과 보기
                    </button>
                  </div>
                ) : (
                  <div className="py-6 text-sm text-muted-foreground">
                    인적사항을 입력하면 과거 실시 내역을 확인할 수 있습니다.
                  </div>
                )}
              </div>

            </div>
          </section>
        </div>
      </form>

      {/* 개인정보 모달 */}
      {requiresConsent && privacyModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setPrivacyModalOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#edf0ef] px-6 py-4">
              <h3 className="text-base font-semibold text-[#161d1b]">개인정보 수집 및 이용 동의</h3>
              <button
                type="button"
                onClick={() => setPrivacyModalOpen(false)}
                className="text-muted-foreground hover:text-[#161d1b] text-xl leading-none"
              >
                ✕
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto px-6 py-5">
              <p className="whitespace-pre-wrap font-sans text-sm leading-7 text-[#3a4a47]">{consentText || PRIVACY_CONTENT}</p>
            </div>
            <div className="border-t border-[#edf0ef] px-6 py-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setPrivacyModalOpen(false)}
                className="rounded-md border border-[#dfe5e3] px-4 py-2 text-sm font-medium text-[#3a4a47] hover:bg-[#f3f5f4]"
              >
                닫기
              </button>
              <button
                type="button"
                onClick={() => { setPrivacyAgreed(true); setPrivacyModalOpen(false) }}
                className="rounded-md bg-[#175e63] px-4 py-2 text-sm font-semibold text-white hover:bg-[#124b4f]"
              >
                동의하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 재검사 확인 모달 */}
      {retakeConfirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setRetakeConfirmOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-5">
              <h3 className="text-base font-semibold text-[#161d1b]">검사를 다시 실시하시겠습니까?</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                기존 결과를 확인하거나, 새 응답으로 검사를 다시 실시할 수 있습니다.
              </p>
            </div>
            <div className="border-t border-[#edf0ef] px-6 py-4 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={onViewExistingResult}
                disabled={loading}
                className="mr-auto rounded-md border border-[#175e63] px-4 py-2 text-sm font-semibold text-[#175e63] hover:bg-[#e8f3f1] disabled:opacity-50"
              >
                기존 결과 보기
              </button>
              <button
                type="button"
                onClick={() => setRetakeConfirmOpen(false)}
                disabled={loading}
                className="rounded-md border border-[#dfe5e3] px-4 py-2 text-sm font-medium text-[#3a4a47] hover:bg-[#f3f5f4] disabled:opacity-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => { setRetakeConfirmOpen(false); onRetakeConfirm?.() }}
                disabled={loading}
                className="rounded-md bg-[#175e63] px-4 py-2 text-sm font-semibold text-white hover:bg-[#124b4f] disabled:opacity-50"
              >
                {loading ? "확인 중..." : "확인"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
