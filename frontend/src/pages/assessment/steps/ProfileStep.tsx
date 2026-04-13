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

interface Props {
  payload: InitialPayload
  onNext: (profile: Profile) => void
  loading: boolean
  error: string
}

export function ProfileStep({ payload, onNext, loading, error }: Props) {
  const required = payload.required_profile_fields ?? []
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setValidationError("")
    const missing = validate()
    if (missing) {
      setValidationError(`${missing} 항목을 입력해주세요.`)
      return
    }
    const profile: Profile = { name: name.trim() }
    if (required.includes("gender")) profile.gender = gender
    if (required.includes("birth_day")) profile.birth_day = birthDay
    if (required.includes("school_age")) profile.school_age = schoolAge
    additional.forEach((f) => { profile[f.label] = extras[f.label] ?? "" })
    onNext(profile)
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
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col gap-4 rounded-xl bg-white p-5 shadow-sm sm:p-6"
    >
      <article className="rounded-lg border border-blue-100 bg-blue-50/60 px-3 py-2.5">
        <p className="text-xs font-semibold text-primary">안내</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          입력하신 인적정보는 검사 진행과 결과 해석 목적에만 사용됩니다.
        </p>
      </article>

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
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
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
                <label key={value} className={`flex min-h-10 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 text-sm font-semibold transition-colors
                  ${gender === value ? "border-primary bg-primary/10 text-primary" : "border-input bg-background hover:bg-accent"}`}>
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
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
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
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
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
        type="submit"
        disabled={loading}
        className="mt-1 h-11 w-full rounded-lg bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
      >
        {loading ? "확인 중..." : "다음"}
      </button>
    </form>
  )
}
