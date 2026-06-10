import * as React from "react"
import { ResearchNotice } from "../components/ResearchNotice"
import type { InitialPayload, AdditionalProfileField, Profile, TestProfileSection } from "../types"

const INFORMANT_LABELS: Record<string, string> = {
  mother: "어머니",
  father: "아버지",
  etc: "기타",
}

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
  initialProfile?: Profile | null
  requiresConsent?: boolean
  consentText?: string
  scrollToHistory?: boolean
  retakeInfo?: { submission_id: number; access_token: string; submitted_at?: string } | null
  retakeProfile?: Profile | null
  onRetakeConfirm?: () => void
  onViewExistingResult?: () => void
  showReportResult?: boolean
}

// subject_type별 섹션 라벨
const SUBJECT_TYPE_LABELS: Record<string, string> = {
  self: "개인 정보",
  child: "자녀 정보",
  parent: "부모/보호자 정보",
  teacher: "선생님 정보",
  classmate: "친구/동료 정보",
  guardian: "보호자 정보",
}

// subject_type별 이름 필드 라벨
const SUBJECT_NAME_LABELS: Record<string, string> = {
  self: "이름",
  child: "자녀 이름",
  parent: "부모 이름",
  teacher: "선생님 이름",
  classmate: "친구/동료 이름",
  guardian: "보호자 이름",
}

// subject_type별 필드 키 네이밍
// - informant: 항상 prefix 없음 (특수 필드)
// - child 섹션의 name: 클라이언트 매칭 기준이므로 prefix 없이 "name"으로 저장
// - self 섹션: prefix 없음
// - 그 외(parent 등): subjectType_fieldName
function fieldKey(name: string, subjectType: string, isMixed: boolean): string {
  if (!isMixed || name === "informant") return name
  if (subjectType === "self" || (subjectType === "child" && name === "name")) return name
  return `${subjectType}_${name}`
}

const BASE_FIELDS = ["name", "gender", "birth_day"] as const

function calcKoreanAge(birthDayStr: string): string {
  if (!birthDayStr) return ""
  const birth = new Date(birthDayStr)
  if (isNaN(birth.getTime())) return ""
  const today = new Date()
  let years = today.getFullYear() - birth.getFullYear()
  let months = today.getMonth() - birth.getMonth()
  if (today.getDate() < birth.getDate()) months -= 1
  if (months < 0) { years -= 1; months += 12 }
  if (years < 0) return ""
  if (years === 0 && months === 0) return "(만 0세)"
  if (years === 0) return `(만 ${months}개월)`
  if (months === 0) return `(만 ${years}세)`
  return `(만 ${years}세 ${months}개월)`
}

function getLabel(fieldName: string, section: TestProfileSection): string {
  const custom = section.fields?.[fieldName]?.label
  if (custom) return custom
  const defaults: Record<string, string> = {
    name: "이름", birth_day: "생년월일", gender: "성별", school_age: "학령", informant: "관찰자",
  }
  return defaults[fieldName] ?? fieldName
}

export function ProfileStep({ payload, onNext, loading, error, initialProfile, requiresConsent = false, consentText, scrollToHistory, retakeInfo, retakeProfile, onRetakeConfirm, onViewExistingResult, showReportResult = true }: Props) {
  const testName = payload.custom_test_name || payload.display_name || "검사"
  const showResearchNotice = payload.show_research_notice !== false

  // profile_config에서 섹션 목록 추출
  const sections: TestProfileSection[] = React.useMemo(() => {
    const pc = payload.profile_config
    if (!pc) {
      return [{ subject_type: "self", required_fields: payload.required_profile_fields ?? [] }]
    }
    if (pc.subject_type === "mixed" && pc.sections) return pc.sections
    return [pc as TestProfileSection]
  }, [payload.profile_config, payload.required_profile_fields])

  const isMixed = sections.length > 1
  const [identityOpen, setIdentityOpen] = React.useState(() => Boolean(initialProfile))
  const [privacyAgreed, setPrivacyAgreed] = React.useState(() => Boolean(initialProfile) && requiresConsent)
  const [privacyModalOpen, setPrivacyModalOpen] = React.useState(false)
  const [retakeConfirmOpen, setRetakeConfirmOpen] = React.useState(false)
  const historyRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (scrollToHistory && historyRef.current) {
      historyRef.current.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }, [scrollToHistory])

  React.useEffect(() => {
    if (!retakeInfo) return
    setRetakeConfirmOpen(true)
  }, [retakeInfo])

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

  const [examDate, setExamDate] = React.useState(() =>
    String(initialProfile?.exam_date ?? new Date().toISOString().slice(0, 10))
  )
  const [sectionValues, setSectionValues] = React.useState<Record<string, string>>(() => {
    if (!initialProfile) return {}
    const vals: Record<string, string> = {}
    for (const section of sections) {
      // base fields (name/gender/birth_day) 항상 복원
      for (const fieldName of BASE_FIELDS) {
        const key = fieldKey(fieldName, section.subject_type, sections.length > 1)
        const val = initialProfile[key]
        if (val !== undefined) vals[key] = String(val)
      }
      // 섹션 추가 필드
      for (const fieldName of Object.keys(section.fields ?? {})) {
        if ((BASE_FIELDS as readonly string[]).includes(fieldName)) continue
        const key = fieldKey(fieldName, section.subject_type, sections.length > 1)
        const val = initialProfile[key]
        if (val !== undefined) vals[key] = String(val)
      }
    }
    return vals
  })
  const [extras, setExtras] = React.useState<Record<string, string | string[]>>(() => {
    if (!initialProfile) return {}
    return additional.reduce<Record<string, string | string[]>>((acc, field) => {
      const value = initialProfile[field.label]
      if (value !== undefined) acc[field.label] = value
      return acc
    }, {})
  })
  const [validationError, setValidationError] = React.useState("")
  const [optOpen, setOptOpen] = React.useState(false)

  function setSectionValue(key: string, val: string) {
    setSectionValues(prev => ({ ...prev, [key]: val }))
  }

  function setExtra(label: string, value: string | string[]) {
    setExtras((prev) => ({ ...prev, [label]: value }))
  }

  function splitPhoneParts(value: string | string[] | undefined): [string, string, string] {
    const raw = Array.isArray(value) ? value.join("") : String(value ?? "")
    if (raw.includes("-")) {
      const [first = "", middle = "", last = ""] = raw.split("-")
      return [
        first.replace(/\D/g, "").slice(0, 3),
        middle.replace(/\D/g, "").slice(0, 4),
        last.replace(/\D/g, "").slice(0, 4),
      ]
    }
    const digits = raw.replace(/\D/g, "").slice(0, 11)
    return [digits.slice(0, 3), digits.slice(3, 7), digits.slice(7, 11)]
  }

  function joinPhoneParts(parts: [string, string, string]) {
    return parts.some(Boolean) ? parts.join("-") : ""
  }

  function isPhoneComplete(value: string | string[] | undefined) {
    const [first, middle, last] = splitPhoneParts(value)
    return first.length >= 2 && middle.length >= 3 && last.length === 4
  }

  function isPhoneFieldType(type: string | undefined) {
    return type === "phone" || type === "phon" || type === "phon_num_input"
  }

  function renderPhoneInput(
    idPrefix: string,
    value: string | string[] | undefined,
    onChange: (value: string) => void,
  ) {
    const parts = splitPhoneParts(value)
    const placeholders = ["010", "1234", "5678"]
    const maxLengths = [3, 4, 4]

    return (
      <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2">
        {parts.map((part, index) => (
          <React.Fragment key={`${idPrefix}_${index}`}>
            {index > 0 && <span className="text-center text-sm font-semibold text-muted-foreground">-</span>}
            <input
              id={index === 0 ? idPrefix : undefined}
              type="tel"
              inputMode="numeric"
              autoComplete={index === 0 ? "tel" : undefined}
              aria-label={`전화번호 ${index + 1}번째 입력`}
              placeholder={placeholders[index]}
              maxLength={maxLengths[index]}
              className="h-10 min-w-0 rounded-md border border-input bg-background px-3 text-center text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#175e63]/30"
              value={part}
              onChange={(event) => {
                const next = [...parts] as [string, string, string]
                next[index] = event.target.value.replace(/\D/g, "").slice(0, maxLengths[index])
                onChange(joinPhoneParts(next))
              }}
            />
          </React.Fragment>
        ))}
      </div>
    )
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
    if (!examDate) return "검사 실시일"
    for (const section of sections) {
      // 이름/성별/생년월일 항상 필수
      for (const fieldName of BASE_FIELDS) {
        const key = fieldKey(fieldName, section.subject_type, isMixed)
        if (!sectionValues[key]?.trim()) {
          const nameLabel = SUBJECT_NAME_LABELS[section.subject_type] ?? "이름"
          if (fieldName === "name") return nameLabel
          if (fieldName === "gender") return isMixed ? `${SUBJECT_TYPE_LABELS[section.subject_type] ?? section.subject_type} 성별` : "성별"
          if (fieldName === "birth_day") return isMixed ? `${SUBJECT_TYPE_LABELS[section.subject_type] ?? section.subject_type} 생년월일` : "생년월일"
        }
      }
      // 섹션 추가 필드
      for (const [fieldName, fieldCfg] of Object.entries(section.fields ?? {})) {
        if ((BASE_FIELDS as readonly string[]).includes(fieldName)) continue
        if (!fieldCfg.required) continue
        const key = fieldKey(fieldName, section.subject_type, isMixed)
        if (!sectionValues[key]?.trim()) {
          return fieldCfg.label ?? getLabel(fieldName, section)
        }
        if (isPhoneFieldType(fieldCfg.type) && !isPhoneComplete(sectionValues[key])) {
          return fieldCfg.label ?? getLabel(fieldName, section)
        }
      }
    }
    for (const f of additional) {
      if (!f.required) continue
      if (f.type === "multi_select") {
        const val = extras[f.label]
        if (!Array.isArray(val) || val.length === 0) return f.label
      } else if (isPhoneFieldType(f.type)) {
        if (!isPhoneComplete(extras[f.label])) return f.label
      } else {
        if (!String(extras[f.label] ?? "").trim()) return f.label
      }
    }
    return ""
  }

  function buildProfile(): Profile {
    const profile: Profile = { name: sectionValues.name ?? "", exam_date: examDate }
    Object.assign(profile, sectionValues)
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

    if (isPhoneFieldType(f.type)) {
      return (
        <div key={idx} className="flex flex-col gap-1.5">
          <label htmlFor={id} className="text-sm font-medium">
            {f.label}{f.required && <span className="text-destructive ml-0.5">*</span>}
          </label>
          {renderPhoneInput(id, val, (value) => setExtra(f.label, value))}
        </div>
      )
    }

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
                <p className="mt-4 max-w-[40rem] text-sm leading-6 text-[#5f6f73]">
                  검사 시작 전 본인 확인을 진행합니다. 응답은 제출 후 결과 산출과 관리자 확인에 사용됩니다.
                </p>
              </div>
              {showResearchNotice && <ResearchNotice showImmediateResult={showReportResult} />}
            </div>
          </section>

          <section className="flex min-h-screen items-center bg-[#f7f8f7] px-5 py-8 sm:px-8 sm:py-10 lg:px-12">
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

              <div className="flex flex-col gap-1.5">
                <label htmlFor="required_exam_date" className="text-sm font-medium">
                  검사 실시일 <span className="text-destructive">*</span>
                </label>
                <input
                  id="required_exam_date"
                  type="date"
                  required
                  max={new Date().toISOString().slice(0, 10)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#175e63]/30"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                />
              </div>

              {/* 섹션별 필드 */}
              {sections.map((section) => {
                const sectionLabel = section.section_hint ?? SUBJECT_TYPE_LABELS[section.subject_type] ?? section.subject_type
                const nameLabel = section.fields?.name?.label ?? SUBJECT_NAME_LABELS[section.subject_type] ?? "이름"
                const genderLabel = section.fields?.gender?.label ?? "성별"
                const birthDayLabel = section.fields?.birth_day?.label ?? "생년월일"
                const nameKey = fieldKey("name", section.subject_type, isMixed)
                const genderKey = fieldKey("gender", section.subject_type, isMixed)
                const birthDayKey = fieldKey("birth_day", section.subject_type, isMixed)
                return (
                <div key={section.subject_type} className={isMixed ? "grid gap-3 rounded-lg border border-[#e8eded] bg-[#f9fbfb] p-4" : "contents"}>
                  {isMixed && (
                    <p className="text-xs font-semibold" style={{ color: "var(--sa, #175e63)" }}>{sectionLabel}</p>
                  )}

                  {/* 이름 — 항상 필수 */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium">
                      {nameLabel} <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      maxLength={60}
                      placeholder={`${nameLabel} 입력`}
                      required
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#175e63]/30"
                      value={sectionValues[nameKey] ?? ""}
                      onChange={(e) => setSectionValue(nameKey, e.target.value)}
                    />
                  </div>

                  {/* 성별 — 항상 필수 */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium">{genderLabel} <span className="text-destructive">*</span></span>
                    <div className="flex gap-2" role="radiogroup">
                      {[{ value: "male", label: "남" }, { value: "female", label: "여" }].map(({ value, label: lbl }) => (
                        <label key={value} className={`flex min-h-10 flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border px-3 text-sm font-semibold transition-colors
                          ${sectionValues[genderKey] === value ? "border-[#175e63] bg-[#e8f3f1] text-[#175e63]" : "border-input bg-background hover:bg-accent"}`}>
                          <input type="radio" name={`gender_${section.subject_type}`} value={value}
                            checked={sectionValues[genderKey] === value}
                            onChange={() => setSectionValue(genderKey, value)} className="sr-only" />
                          {lbl}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* 생년월일 — 항상 필수 */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium">{birthDayLabel} <span className="text-destructive">*</span></label>
                      {sectionValues[birthDayKey] && (
                        <span className="text-xs text-muted-foreground">
                          {calcKoreanAge(sectionValues[birthDayKey])}
                        </span>
                      )}
                    </div>
                    <input
                      type="date"
                      required
                      max={new Date().toISOString().slice(0, 10)}
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#175e63]/30"
                      value={sectionValues[birthDayKey] ?? ""}
                      onChange={(e) => setSectionValue(birthDayKey, e.target.value)}
                    />
                  </div>

                  {/* 섹션 추가 필드 (base fields 제외) */}
                  {Object.entries(section.fields ?? {}).filter(([fn]) =>
                    !(BASE_FIELDS as readonly string[]).includes(fn)
                  ).map(([fieldName, fieldCfg]) => {
                    const key = fieldKey(fieldName, section.subject_type, isMixed)
                    const label = fieldCfg.label ?? getLabel(fieldName, section)
                    const isRequired = fieldCfg.required ?? false
                    const reqMark = isRequired ? <span className="text-destructive">*</span> : null
                    const options = fieldCfg.options ?? []
                    const type = fieldCfg.type

                    // 성별: radio without options → 남/여 고정
                    if (fieldName === "gender" && type === "radio" && options.length === 0) {
                      return (
                        <div key={fieldName} className="flex flex-col gap-1.5">
                          <span className="text-sm font-medium">{label} {reqMark}</span>
                          <div className="flex gap-2" role="radiogroup">
                            {[{ value: "male", label: "남" }, { value: "female", label: "여" }].map(({ value, label: lbl }) => (
                              <label key={value} className={`flex min-h-10 flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border px-3 text-sm font-semibold transition-colors
                                ${sectionValues[key] === value ? "border-[#175e63] bg-[#e8f3f1] text-[#175e63]" : "border-input bg-background hover:bg-accent"}`}>
                                <input type="radio" name={`gender_${section.subject_type}`} value={value}
                                  checked={sectionValues[key] === value}
                                  onChange={() => setSectionValue(key, value)} className="sr-only" />
                                {lbl}
                              </label>
                            ))}
                          </div>
                        </div>
                      )
                    }

                    // select: type=select 또는 school_age 기본 드롭다운
                    if (type === "select" || (fieldName === "school_age" && options.length === 0)) {
                      const selectOpts = options.length > 0 ? options : SCHOOL_AGE_OPTIONS
                      return (
                        <div key={fieldName} className="flex flex-col gap-1.5">
                          <label className="text-sm font-medium">{label} {reqMark}</label>
                          <select value={sectionValues[key] ?? ""}
                            onChange={(e) => setSectionValue(key, e.target.value)}
                            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#175e63]/30">
                            <option value="" disabled>{label} 선택</option>
                            {selectOpts.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                          </select>
                        </div>
                      )
                    }

                    // radio: type=radio with options
                    if (type === "radio" && options.length > 0) {
                      return (
                        <div key={fieldName} className="flex flex-col gap-1.5">
                          <span className="text-sm font-medium">{label} {reqMark}</span>
                          <div className="flex gap-2 flex-wrap" role="radiogroup">
                            {options.map((opt) => (
                              <label key={opt} className={`flex min-h-10 flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border px-3 text-sm font-semibold transition-colors
                                ${sectionValues[key] === opt ? "border-[#175e63] bg-[#e8f3f1] text-[#175e63]" : "border-input bg-background hover:bg-accent"}`}>
                                <input type="radio" name={`field_${key}`} value={opt}
                                  checked={sectionValues[key] === opt}
                                  onChange={() => setSectionValue(key, opt)} className="sr-only" />
                                {INFORMANT_LABELS[opt] ?? opt}
                              </label>
                            ))}
                          </div>
                        </div>
                      )
                    }

                    // date
                    if (type === "date" || (fieldName === "birth_day" && !type)) {
                      return (
                        <div key={fieldName} className="flex flex-col gap-1.5">
                          <label className="text-sm font-medium">{label} {reqMark}</label>
                          <input type="date"
                            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#175e63]/30"
                            value={sectionValues[key] ?? ""}
                            onChange={(e) => setSectionValue(key, e.target.value)} />
                        </div>
                      )
                    }

                    // 기타: text / number
                    const inputType = type === "number" ? "number" : isPhoneFieldType(type) ? "tel" : type === "email" ? "email" : "text"
                    if (isPhoneFieldType(type)) {
                      return (
                        <div key={fieldName} className="flex flex-col gap-1.5">
                          <label htmlFor={`field_${key}`} className="text-sm font-medium">{label} {reqMark}</label>
                          {renderPhoneInput(`field_${key}`, sectionValues[key], (value) => setSectionValue(key, value))}
                        </div>
                      )
                    }
                    return (
                      <div key={fieldName} className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium">{label} {reqMark}</label>
                        <input type={inputType} placeholder={`${label} 입력`}
                          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#175e63]/30"
                          value={sectionValues[key] ?? ""}
                          onChange={(e) => setSectionValue(key, e.target.value)} />
                      </div>
                    )
                  })}
                </div>
              )
              })}

              {/* 추가 인적사항 (optional_fields) */}
              {(() => {
                const optFields = payload.profile_config?.optional_fields
                if (!optFields || Object.keys(optFields).length === 0) return null
                return (
                  <div className="rounded-lg border border-[#e8eded] bg-[#f9fbfb]">
                    <button
                      type="button"
                      onClick={() => setOptOpen(v => !v)}
                      className="flex w-full items-center justify-between px-4 py-3 text-left"
                    >
                      <span className="text-xs font-semibold text-[#175e63]">추가 인적사항 (선택)</span>
                      <svg
                        className={`h-4 w-4 text-[#175e63] transition-transform ${optOpen ? "rotate-180" : ""}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {optOpen && <div className="grid gap-3 px-4 pb-4">
                    {Object.entries(optFields).map(([key, cfg]) => {
                      const label = cfg.label ?? key
                      const options = cfg.options ?? []

                      if (cfg.type === "long_text") {
                        return (
                          <div key={key} className="flex flex-col gap-1.5">
                            <label className="text-sm font-medium">{label}</label>
                            <textarea
                              rows={3}
                              placeholder={`${label} 입력`}
                              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#175e63]/30"
                              value={String(sectionValues[key] ?? "")}
                              onChange={(e) => setSectionValue(key, e.target.value)}
                            />
                          </div>
                        )
                      }

                      if (options.length > 0 && options.length <= 4) {
                        return (
                          <div key={key} className="flex flex-col gap-1.5">
                            <span className="text-sm font-medium">{label}</span>
                            <div className="flex gap-2 flex-wrap" role="radiogroup">
                              {options.map((opt) => (
                                <label key={opt} className={`flex min-h-10 flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border px-3 text-sm font-semibold transition-colors
                                  ${sectionValues[key] === opt ? "border-[#175e63] bg-[#e8f3f1] text-[#175e63]" : "border-input bg-background hover:bg-accent"}`}>
                                  <input type="radio" name={`opt_${key}`} value={opt}
                                    checked={sectionValues[key] === opt}
                                    onChange={() => setSectionValue(key, opt)}
                                    className="sr-only" />
                                  {opt}
                                </label>
                              ))}
                            </div>
                          </div>
                        )
                      }

                      if (options.length > 4) {
                        return (
                          <div key={key} className="flex flex-col gap-1.5">
                            <label className="text-sm font-medium">{label}</label>
                            <select
                              value={sectionValues[key] ?? ""}
                              onChange={(e) => setSectionValue(key, e.target.value)}
                              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#175e63]/30"
                            >
                              <option value="">{label} 선택</option>
                              {options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                          </div>
                        )
                      }

                      if (isPhoneFieldType(cfg.type)) {
                        return (
                          <div key={key} className="flex flex-col gap-1.5">
                            <label htmlFor={`opt_${key}`} className="text-sm font-medium">{label}</label>
                            {renderPhoneInput(`opt_${key}`, sectionValues[key], (value) => setSectionValue(key, value))}
                          </div>
                        )
                      }

                      const inputType = cfg.type === "number" ? "number"
                        : cfg.type === "date" ? "date"
                        : cfg.type === "email" ? "email"
                        : "text"
                      return (
                        <div key={key} className="flex flex-col gap-1.5">
                          <label className="text-sm font-medium">{label}</label>
                          <input
                            type={inputType}
                            placeholder={`${label} 입력`}
                            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#175e63]/30"
                            value={String(sectionValues[key] ?? "")}
                            onChange={(e) => setSectionValue(key, e.target.value)}
                          />
                        </div>
                      )
                    })}
                    </div>}
                  </div>
                )
              })()}

              {/* 추가 필드 (admin 설정) */}
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
                    {showReportResult && (
                      <button
                        type="button"
                        onClick={onViewExistingResult}
                        disabled={loading}
                        className="rounded-md border border-[#175e63] px-3 py-1.5 text-xs font-semibold text-[#175e63] hover:bg-[#e8f3f1] transition-colors"
                      >
                        결과 보기
                      </button>
                    )}
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
            className="assessment-modal-fit-wide rounded-2xl bg-white shadow-2xl"
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
            className="assessment-modal-fit rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-5">
              <h3 className="text-base font-semibold text-[#161d1b]">검사를 다시 실시하시겠습니까?</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {showReportResult
                  ? "기존 결과를 확인하거나, 새 응답으로 검사를 다시 실시할 수 있습니다."
                  : "이미 제출한 이력이 있습니다. 새 응답으로 검사를 다시 실시할 수 있습니다."}
              </p>
            </div>
            <div className="border-t border-[#edf0ef] px-6 py-4 flex flex-wrap justify-end gap-3">
              {showReportResult && (
                <button
                  type="button"
                  onClick={onViewExistingResult}
                  disabled={loading}
                  className="mr-auto rounded-md border border-[#175e63] px-4 py-2 text-sm font-semibold text-[#175e63] hover:bg-[#e8f3f1] disabled:opacity-50"
                >
                  기존 결과 보기
                </button>
              )}
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
