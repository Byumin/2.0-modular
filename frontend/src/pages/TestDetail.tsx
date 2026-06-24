import * as React from "react"
import { useParams, useNavigate } from "react-router-dom"
import { IconArrowLeft, IconLink, IconCopy, IconPlus, IconUpload, IconX } from "@tabler/icons-react"
import * as XLSX from "xlsx"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface AdditionalProfileField {
  label: string
  type: string
  required: boolean
}

interface TestDetail {
  id: number
  custom_test_name: string
  client_intake_mode?: string
  requires_consent?: boolean
  consent_text?: string
  requires_security_notice?: boolean
  show_research_notice?: boolean
  allow_unanswered_submission?: boolean
  show_report_result?: boolean
  test_ids?: string[]
  session_configs?: SessionConfig[]
  created_at: string
  selected_scale_codes?: string[]
  scale_count?: number
  additional_profile_fields?: AdditionalProfileField[]
}

interface PreRegisteredEntry {
  id: number
  profile_data: Record<string, string>
  has_provisional_client: boolean
  created_at: string | null
}

type ClientIntakeMode = "pre_registered_only" | "auto_create"

interface SessionConfig {
  session_id: string
  title: string
  description: string
  guide_items: string[]
  test_ids: string[]
}

const intakeModeLabels: Record<ClientIntakeMode, string> = {
  pre_registered_only: "사전 등록 필수",
  auto_create: "검사 진행 시 자동 생성 허용",
}

function normalizeClientIntakeMode(value?: string): ClientIntakeMode {
  return value === "auto_create" ? "auto_create" : "pre_registered_only"
}

function normalizeExcelHeader(value: unknown) {
  return String(value ?? "").trim().toLowerCase().replace(/[\s_-]/g, "")
}

function buildExcelHeaderLookup(fields: { key: string; label: string }[]) {
  const aliases: Record<string, string[]> = {
    name: ["이름", "성명", "내담자명", "수검자명", "name"],
    gender: ["성별", "gender"],
    birth_day: ["생년월일", "생일", "출생일", "birth_day", "birth", "birthday"],
    phone: ["휴대폰 번호", "휴대폰번호", "휴대전화", "핸드폰", "핸드폰 번호", "전화번호", "연락처", "phone"],
  }
  const lookup = new Map<string, string>()
  fields.forEach((field) => {
    const values = [field.key, field.label, ...(aliases[field.key] ?? [])]
    values.forEach((value) => {
      const normalized = normalizeExcelHeader(value)
      if (normalized) lookup.set(normalized, field.key)
    })
  })
  return lookup
}

function normalizeExcelRowHeaders(row: Record<string, unknown>, fields: { key: string; label: string }[]) {
  const lookup = buildExcelHeaderLookup(fields)
  const normalizedRow: Record<string, string> = {}
  Object.entries(row).forEach(([rawKey, rawValue]) => {
    const value = String(rawValue ?? "").trim()
    if (!value) return
    const key = lookup.get(normalizeExcelHeader(rawKey)) ?? rawKey.trim()
    normalizedRow[key] = value
  })
  return normalizedRow
}

function normalizeSessionConfigs(raw: unknown, fallbackTestIds: string[] = []): SessionConfig[] {
  if (!Array.isArray(raw)) {
    return fallbackTestIds.length ? [{
      session_id: "session_1",
      title: "세션 1",
      description: "",
      guide_items: [],
      test_ids: fallbackTestIds,
    }] : []
  }
  return raw
    .map((item, index) => {
      if (!item || typeof item !== "object") return null
      const source = item as Record<string, unknown>
      const testIds = Array.isArray(source.test_ids)
        ? source.test_ids.map(String).filter(Boolean)
        : []
      if (!testIds.length) return null
      return {
        session_id: String(source.session_id || `session_${index + 1}`),
        title: String(source.title || `세션 ${index + 1}`),
        description: String(source.description || ""),
        guide_items: Array.isArray(source.guide_items)
          ? source.guide_items.map(String).filter(Boolean).slice(0, 8)
          : [],
        test_ids: testIds,
      }
    })
    .filter((item): item is SessionConfig => Boolean(item))
}

async function copyTextWithPromptFallback(value: string) {
  try {
    await navigator.clipboard.writeText(value)
    return true
  } catch {
    window.prompt("클립보드 복사가 차단되었습니다. 아래 URL을 복사하세요.", value)
    return false
  }
}

export function TestDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [test, setTest] = React.useState<TestDetail | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState("")
  const [accessLink, setAccessLink] = React.useState("")
  const [accessToken, setAccessToken] = React.useState("")
  const [allowUnansweredSubmission, setAllowUnansweredSubmission] = React.useState(false)
  const [showReportResult, setShowReportResult] = React.useState(true)
  const [savingLinkOptions, setSavingLinkOptions] = React.useState(false)
  const [generatingLink, setGeneratingLink] = React.useState(false)
  const [copied, setCopied] = React.useState(false)
  const [matchFieldKeys, setMatchFieldKeys] = React.useState<string[]>(["name"])
  const [availableFields, setAvailableFields] = React.useState<{ key: string; label: string }[]>([
    { key: "name", label: "이름" },
    { key: "gender", label: "성별" },
    { key: "birth_day", label: "생년월일" },
  ])
  const [preRegisteredEntries, setPreRegisteredEntries] = React.useState<PreRegisteredEntry[]>([])
  const [loadingPreRegistered, setLoadingPreRegistered] = React.useState(false)
  const [addingEntry, setAddingEntry] = React.useState(false)
  const [newEntryValues, setNewEntryValues] = React.useState<Record<string, string>>({})
  const [uploadingExcel, setUploadingExcel] = React.useState(false)
  const [uploadResult, setUploadResult] = React.useState<{ added: number; skipped: number; errors: string[] } | null>(null)
  const [preSearchQuery, setPreSearchQuery] = React.useState("")
  const [preCurrentPage, setPreCurrentPage] = React.useState(1)
  const excelInputRef = React.useRef<HTMLInputElement>(null)
  const [nameValue, setNameValue] = React.useState("")
  const [intakeMode, setIntakeMode] = React.useState<ClientIntakeMode>("pre_registered_only")
  const [requiresConsent, setRequiresConsent] = React.useState(false)
  const [consentText, setConsentText] = React.useState("")
  const [requiresSecurityNotice, setRequiresSecurityNotice] = React.useState(false)
  const [showResearchNotice, setShowResearchNotice] = React.useState(true)
  const [sessionConfigs, setSessionConfigs] = React.useState<SessionConfig[]>([])
  const [savingSettings, setSavingSettings] = React.useState(false)
  const [saveMessage, setSaveMessage] = React.useState<{ text: string; error: boolean } | null>(null)

  const loadPreRegistered = React.useCallback(async (token: string) => {
    if (!token) return
    setLoadingPreRegistered(true)
    try {
      const res = await fetch(`/api/admin/access-links/${token}/pre-registered`)
      if (!res.ok) return
      const data = await res.json()
      setMatchFieldKeys(data.match_field_keys ?? ["name"])
      setPreRegisteredEntries(data.entries ?? [])
      if (Array.isArray(data.available_profile_fields) && data.available_profile_fields.length > 0) {
        setAvailableFields(data.available_profile_fields)
      }
    } finally {
      setLoadingPreRegistered(false)
    }
  }, [])

  React.useEffect(() => {
    if (!id) return
    fetch(`/api/admin/custom-tests/${id}`)
      .then((r) => r.json())
      .then((data) => {
        const item = data.item ?? data
        setTest(item)
        setNameValue(item.custom_test_name ?? "")
        const mode = normalizeClientIntakeMode(item.client_intake_mode)
        setIntakeMode(mode)
        setRequiresConsent(Boolean(item.requires_consent))
        setConsentText(item.consent_text ?? "")
        setRequiresSecurityNotice(Boolean(item.requires_security_notice))
        setShowResearchNotice(item.show_research_notice !== false)
        setSessionConfigs(normalizeSessionConfigs(item.session_configs, item.test_ids ?? []))
        if (item.access_token) {
          const fullUrl = `${window.location.origin}/assessment/custom/${item.access_token}`
          setAccessLink(fullUrl)
          setAccessToken(item.access_token)
          setAllowUnansweredSubmission(Boolean(item.allow_unanswered_submission))
          setShowReportResult(item.show_report_result !== false)
          if (mode === "pre_registered_only") {
            loadPreRegistered(item.access_token)
          }
        }
      })
      .catch(() => setError("검사 정보를 불러올 수 없습니다."))
      .finally(() => setLoading(false))
  }, [id, loadPreRegistered])

  const saveSettings = async () => {
    if (!test || savingSettings) return

    const trimmedName = nameValue.trim()
    if (!trimmedName) {
      setSaveMessage({ text: "검사 이름을 입력해주세요.", error: true })
      return
    }

    setSavingSettings(true)
    setSaveMessage(null)
    setError("")

    try {
      const normalizedSessions = sessionConfigs.map((session, index) => ({
        session_id: session.session_id || `session_${index + 1}`,
        title: session.title.trim() || `세션 ${index + 1}`,
        description: session.description.trim(),
        guide_items: session.guide_items.map((item) => item.trim()).filter(Boolean).slice(0, 8),
        test_ids: session.test_ids,
      }))
      const res = await fetch(`/api/admin/custom-tests/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          custom_test_name: trimmedName,
          client_intake_mode: intakeMode,
          requires_consent: requiresConsent,
          consent_text: consentText.trim(),
          requires_security_notice: requiresSecurityNotice,
          show_research_notice: showResearchNotice,
          session_configs: normalizedSessions,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(typeof data.detail === "string" ? data.detail : "검사 설정 저장에 실패했습니다.")
      }

      setTest((prev) => prev ? {
        ...prev,
        custom_test_name: trimmedName,
        client_intake_mode: intakeMode,
        requires_consent: requiresConsent,
        consent_text: consentText.trim(),
        requires_security_notice: requiresSecurityNotice,
        show_research_notice: showResearchNotice,
        session_configs: normalizedSessions,
      } : prev)
      setSessionConfigs(normalizedSessions)
      setSaveMessage({ text: "검사 설정이 저장되었습니다.", error: false })
    } catch (err) {
      setSaveMessage({
        text: err instanceof Error ? err.message : "검사 설정 저장에 실패했습니다.",
        error: true,
      })
    } finally {
      setSavingSettings(false)
    }
  }

  const handleSaveSettings = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await saveSettings()
  }

  const updateSession = (sessionId: string, patch: Partial<Pick<SessionConfig, "title" | "description">>) => {
    setSessionConfigs((prev) => prev.map((session) =>
      session.session_id === sessionId ? { ...session, ...patch } : session
    ))
  }

  const updateSessionGuideItem = (sessionId: string, index: number, value: string) => {
    setSessionConfigs((prev) => prev.map((session) => {
      if (session.session_id !== sessionId) return session
      return {
        ...session,
        guide_items: session.guide_items.map((item, itemIndex) => itemIndex === index ? value : item),
      }
    }))
  }

  const addSessionGuideItem = (sessionId: string) => {
    setSessionConfigs((prev) => prev.map((session) => {
      if (session.session_id !== sessionId || session.guide_items.length >= 8) return session
      return { ...session, guide_items: [...session.guide_items, ""] }
    }))
  }

  const removeSessionGuideItem = (sessionId: string, index: number) => {
    setSessionConfigs((prev) => prev.map((session) => {
      if (session.session_id !== sessionId) return session
      return {
        ...session,
        guide_items: session.guide_items.filter((_, itemIndex) => itemIndex !== index),
      }
    }))
  }

  const handleGenerateLink = async () => {
    setGeneratingLink(true)
    try {
      const res = await fetch(`/api/admin/custom-tests/${id}/access-link`, { method: "POST" })
      const data = await res.json()
      const fullUrl = `${window.location.origin}${data.assessment_url}`
      setAccessLink(fullUrl)
      const token = data.access_token ?? ""
      setAccessToken(token)
      setAllowUnansweredSubmission(Boolean(data.allow_unanswered_submission))
      setShowReportResult(data.show_report_result !== false)
      if (intakeMode === "pre_registered_only" && token) {
        await loadPreRegistered(token)
      }
    } catch {
      setError("링크 생성에 실패했습니다.")
    } finally {
      setGeneratingLink(false)
    }
  }

  const saveMatchKeysToServer = async ({ clearEntryValues = false }: { clearEntryValues?: boolean } = {}) => {
    if (!accessToken) throw new Error("실시 링크가 없습니다.")
    if (matchFieldKeys.length === 0) throw new Error("확인 기준 필드를 하나 이상 선택해야 합니다.")

    const res = await fetch(`/api/admin/access-links/${accessToken}/match-field-keys`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ match_field_keys: matchFieldKeys }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(typeof data.detail === "string" ? data.detail : "확인 기준 필드 저장에 실패했습니다.")
    }
    if (clearEntryValues) setNewEntryValues({})
  }

  const saveCurrentMatchKeysForEntry = async () => {
    try {
      await saveMatchKeysToServer()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : "확인 기준 필드 저장에 실패했습니다.")
      return false
    }
  }

  const handleSaveLinkOptions = async () => {
    if (!accessToken || savingLinkOptions) return
    setSavingLinkOptions(true)
    setError("")
    try {
      const res = await fetch(`/api/admin/access-links/${accessToken}/response-options`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          allow_unanswered_submission: allowUnansweredSubmission,
          show_report_result: showReportResult,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(typeof data.detail === "string" ? data.detail : "실시 링크 옵션 저장에 실패했습니다.")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "실시 링크 옵션 저장에 실패했습니다.")
    } finally {
      setSavingLinkOptions(false)
    }
  }

  const handleAddEntry = async () => {
    if (!accessToken || addingEntry) return
    const profileData: Record<string, string> = {}
    for (const key of matchFieldKeys) {
      const val = (newEntryValues[key] ?? "").trim()
      if (!val) { setError(`'${key}' 값을 입력해주세요.`); return }
      profileData[key] = val
    }
    setAddingEntry(true)
    setError("")
    try {
      if (!(await saveCurrentMatchKeysForEntry())) return
      const res = await fetch(`/api/admin/access-links/${accessToken}/pre-registered`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile_data: profileData }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(typeof d.detail === "string" ? d.detail : "등록에 실패했습니다.")
      }
      const d = await res.json()
      setPreRegisteredEntries((prev) => [...prev, d.entry])
      setNewEntryValues({})
    } catch (e) {
      setError(e instanceof Error ? e.message : "등록에 실패했습니다.")
    } finally {
      setAddingEntry(false)
    }
  }

  const handleDeleteEntry = async (entryId: number) => {
    if (!accessToken) return
    try {
      const res = await fetch(`/api/admin/access-links/${accessToken}/pre-registered/${entryId}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      setPreRegisteredEntries((prev) => prev.filter((e) => e.id !== entryId))
    } catch {
      setError("삭제에 실패했습니다.")
    }
  }

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !accessToken) return
    e.target.value = ""
    setUploadingExcel(true)
    setUploadResult(null)
    setError("")
    try {
      if (!(await saveCurrentMatchKeysForEntry())) return
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: "array" })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" })
      const rows: Record<string, string>[] = rawRows.map((row) => normalizeExcelRowHeaders(row, availableFields))
      if (rows.length === 0) { setError("엑셀에 데이터가 없습니다."); return }
      const res = await fetch(`/api/admin/access-links/${accessToken}/pre-registered/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(typeof data.detail === "string" ? data.detail : "업로드 실패")
      setUploadResult({ added: data.added, skipped: data.skipped, errors: data.errors ?? [] })
      await loadPreRegistered(accessToken)
    } catch (err) {
      setError(err instanceof Error ? err.message : "엑셀 업로드에 실패했습니다.")
    } finally {
      setUploadingExcel(false)
    }
  }

  const handleCopy = async () => {
    if (!accessLink) return
    const copied = await copyTextWithPromptFallback(accessLink)
    if (copied) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-muted-foreground p-6">
        불러오는 중...
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-6 overflow-auto">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => navigate("/admin/create")}
        >
          <IconArrowLeft className="size-4" />
        </Button>
        <div className="flex flex-col gap-0.5">
          <h2 className="text-xl font-semibold">{test?.custom_test_name ?? "검사 상세"}</h2>
          <p className="text-sm text-muted-foreground">
            {test?.test_ids?.join(", ")} · 생성일{" "}
            {test?.created_at && new Date(test.created_at).toLocaleDateString("ko-KR")}
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">검사 설정</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveSettings} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="detail_custom_test_name">검사 이름</Label>
                <Input
                  id="detail_custom_test_name"
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  placeholder="검사 이름"
                  maxLength={120}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="detail_client_intake_mode">내담자 등록 방식</Label>
                <select
                  id="detail_client_intake_mode"
                  value={intakeMode}
                  onChange={(e) => setIntakeMode(normalizeClientIntakeMode(e.target.value))}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="pre_registered_only">{intakeModeLabels.pre_registered_only}</option>
                  <option value="auto_create">{intakeModeLabels.auto_create}</option>
                </select>
                <p className="text-xs text-muted-foreground">
                  자동 생성 허용은 사전 배정이 없어도 수검자가 확인 후 내담자 등록과 검사 배정을 진행합니다.
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>실시 링크 안내</Label>
                <label className="flex cursor-pointer items-center gap-2 rounded-md border bg-muted/20 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={showResearchNotice}
                    onChange={(event) => setShowResearchNotice(event.target.checked)}
                    className="size-4 rounded border-input"
                  />
                  <span className="text-sm">첫 화면에 연구 참여 안내 카드 표시</span>
                </label>
                <p className="text-xs text-muted-foreground">
                  끄면 실시 링크 첫 화면의 왼쪽 안내 카드가 표시되지 않습니다.
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>개인정보동의</Label>
                <label className="flex cursor-pointer items-center gap-2 rounded-md border bg-muted/20 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={requiresConsent}
                    onChange={(event) => setRequiresConsent(event.target.checked)}
                    className="size-4 rounded border-input"
                  />
                  <span className="text-sm">수검 전 개인정보 수집·이용 동의 받기</span>
                </label>
                {requiresConsent ? (
                  <div className="flex flex-col gap-1.5 rounded-md border bg-muted/20 p-3">
                    <Label htmlFor="detail_consent_text" className="text-xs text-muted-foreground">
                      이 검사에 표시할 개인정보 수집·이용 동의서 문구
                    </Label>
                    <textarea
                      id="detail_consent_text"
                      value={consentText}
                      onChange={(event) => setConsentText(event.target.value)}
                      placeholder="비워두면 설정 메뉴의 기본 동의서 문구를 사용합니다."
                      maxLength={10000}
                      rows={8}
                      className="min-h-40 resize-y rounded-md border border-input bg-background px-3 py-2 text-sm leading-6 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                    <p className="text-xs text-muted-foreground">
                      검사별 문구가 비어 있으면 관리자 설정의 기본 문구가 적용됩니다. Markdown 문법을 사용할 수 있습니다.
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">끄면 수검자는 동의 단계 없이 바로 검사 인적사항 입력으로 이동합니다.</p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>개인정보 보안관리 안내</Label>
                <label className="flex cursor-pointer items-center gap-2 rounded-md border bg-muted/20 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={requiresSecurityNotice}
                    onChange={(event) => setRequiresSecurityNotice(event.target.checked)}
                    className="size-4 rounded border-input"
                  />
                  <span className="text-sm">수검 전 개인정보 보안관리 안내 확인 받기</span>
                </label>
                <p className="text-xs text-muted-foreground">
                  켜면 수검자가 설정 메뉴의 보안관리 안내 문구를 확인해야 검사를 시작할 수 있습니다.
                </p>
              </div>
              <div className="flex items-center justify-between gap-3">
                <Badge variant={intakeMode === "auto_create" ? "success" : "secondary"} className="text-xs">
                  {intakeModeLabels[intakeMode]}
                </Badge>
                <Button type="submit" size="sm" disabled={savingSettings}>
                  {savingSettings ? "저장 중..." : "설정 저장"}
                </Button>
              </div>
              {saveMessage && (
                <p className={saveMessage.error ? "text-sm text-destructive" : "text-sm text-green-600"}>
                  {saveMessage.text}
                </p>
              )}
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">검사 링크 생성</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              {intakeMode === "auto_create"
                ? "사전 배정이 없어도 확인 후 내담자 등록과 검사 배정을 진행할 수 있습니다."
                : "사전에 배정된 내담자에게 제공할 검사 접속 링크를 생성합니다."}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateLink}
              disabled={generatingLink}
            >
              <IconLink className="size-4" />
              {generatingLink ? "생성 중..." : "링크 생성"}
            </Button>
            {accessLink && (
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">생성된 링크</Label>
                <div className="flex gap-2">
                  <Input value={accessLink} readOnly className="text-xs font-mono" />
                  <Button variant="outline" size="icon" className="shrink-0" onClick={handleCopy}>
                    {copied ? (
                      <span className="text-xs text-green-600">✓</span>
                    ) : (
                      <IconCopy className="size-4" />
                    )}
                  </Button>
                </div>
              </div>
            )}
            {accessToken && (
              <div className="flex flex-col gap-2 rounded-md border bg-muted/20 p-3">
                <label className="flex cursor-pointer items-center justify-between gap-3">
                  <span className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">무응답 제출 허용</span>
                    <span className="text-xs text-muted-foreground">
                      켜면 수검자가 미응답 문항 확인 후 그대로 제출할 수 있습니다.
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    checked={allowUnansweredSubmission}
                    onChange={(event) => setAllowUnansweredSubmission(event.target.checked)}
                    className="size-4 rounded border-input"
                  />
                </label>
                <label className="flex cursor-pointer items-center justify-between gap-3">
                  <span className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">제출 후 결과 보기 제공</span>
                    <span className="text-xs text-muted-foreground">
                      끄면 수검자 제출 완료 화면에 결과 보기 버튼이 표시되지 않습니다.
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    checked={showReportResult}
                    onChange={(event) => setShowReportResult(event.target.checked)}
                    className="size-4 rounded border-input"
                  />
                </label>
                <div className="flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleSaveLinkOptions}
                    disabled={savingLinkOptions}
                  >
                    {savingLinkOptions ? "저장 중..." : "링크 옵션 저장"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {intakeMode === "pre_registered_only" && accessToken && (
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">사전 등록 내담자 관리</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {/* 확인 기준 필드 선택 */}
              <div className="flex flex-col gap-2">
                <Label className="text-xs font-semibold text-muted-foreground">확인 기준 필드</Label>
                <p className="text-xs text-muted-foreground">
                  수검자가 입력한 값 중 어떤 필드로 사전 등록 여부를 확인할지 선택합니다.
                </p>
                <div className="flex flex-wrap gap-2">
                  {availableFields.map(({ key, label }) => (
                    <label key={key} className="flex cursor-pointer items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs">
                      <input
                        type="checkbox"
                        checked={matchFieldKeys.includes(key)}
                        onChange={(e) => {
                          setMatchFieldKeys((prev) =>
                            e.target.checked ? [...prev, key] : prev.filter((k) => k !== key)
                          )
                        }}
                        className="size-3.5"
                      />
                      {label}
                    </label>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  선택한 기준은 내담자 추가와 엑셀 업로드 시 자동으로 반영됩니다.
                </p>
              </div>

              <hr className="border-border" />

              {/* 등록 폼 */}
              <div className="flex flex-col gap-2">
                <Label className="text-xs font-semibold text-muted-foreground">내담자 추가</Label>
                <div className="flex flex-wrap gap-2 items-end">
                  {matchFieldKeys.map((key) => {
                    const fieldDef = availableFields.find((f) => f.key === key)
                    const label = fieldDef?.label ?? key
                    return (
                      <div key={key} className="flex flex-col gap-1">
                        <Label className="text-xs">{label}</Label>
                        <Input
                          value={newEntryValues[key] ?? ""}
                          onChange={(e) => setNewEntryValues((prev) => ({ ...prev, [key]: e.target.value }))}
                          placeholder={label}
                          className="h-8 text-xs w-44"
                        />
                      </div>
                    )
                  })}
                  <Button size="sm" onClick={handleAddEntry} disabled={addingEntry} className="h-8">
                    <IconPlus className="size-3.5" />
                    {addingEntry ? "등록 중..." : "추가"}
                  </Button>
                </div>
              </div>

              {/* 엑셀 업로드 */}
              <div className="flex flex-col gap-2">
                <Label className="text-xs font-semibold text-muted-foreground">엑셀로 일괄 등록</Label>
                <p className="text-xs text-muted-foreground">
                  첫 행이 헤더인 엑셀 파일을 업로드하세요. 헤더 이름이 확인 기준 필드명과 일치해야 합니다.
                  <br />
                  기준 필드: {matchFieldKeys.map((k) => {
                    const f = availableFields.find((f) => f.key === k)
                    return f?.label ?? k
                  }).join(", ")}
                </p>
                <div className="flex items-center gap-2">
                  <input
                    ref={excelInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={handleExcelUpload}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => excelInputRef.current?.click()}
                    disabled={uploadingExcel}
                  >
                    <IconUpload className="size-3.5" />
                    {uploadingExcel ? "업로드 중..." : "엑셀 파일 선택"}
                  </Button>
                </div>
                {uploadResult && (
                  <div className="rounded-md border bg-muted/20 px-3 py-2 text-xs">
                    <span className="text-green-600 font-medium">{uploadResult.added}명 등록</span>
                    {uploadResult.skipped > 0 && (
                      <span className="ml-2 text-muted-foreground">{uploadResult.skipped}명 건너뜀</span>
                    )}
                    {uploadResult.errors.length > 0 && (
                      <ul className="mt-1 text-destructive">
                        {uploadResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                      </ul>
                    )}
                  </div>
                )}
              </div>

              {/* 목록 */}
              {loadingPreRegistered ? (
                <p className="text-xs text-muted-foreground">불러오는 중...</p>
              ) : preRegisteredEntries.length === 0 ? (
                <p className="rounded-md border border-dashed bg-muted/20 px-4 py-3 text-center text-xs text-muted-foreground">
                  등록된 내담자가 없습니다.
                </p>
              ) : (() => {
                const PAGE_SIZE = 10
                const q = preSearchQuery.trim().toLowerCase()
                const filtered = q
                  ? preRegisteredEntries.filter((entry) =>
                      matchFieldKeys.some((key) =>
                        String(entry.profile_data[key] ?? "").toLowerCase().includes(q)
                      )
                    )
                  : preRegisteredEntries
                const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
                const safePage = Math.min(preCurrentPage, totalPages)
                const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
                return (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <Input
                        value={preSearchQuery}
                        onChange={(e) => { setPreSearchQuery(e.target.value); setPreCurrentPage(1) }}
                        placeholder="이름, 생년월일 등으로 검색"
                        className="h-8 text-xs max-w-xs"
                      />
                      <span className="text-xs text-muted-foreground shrink-0">
                        {filtered.length}명 / 전체 {preRegisteredEntries.length}명
                      </span>
                    </div>
                    <div className="rounded-md border border-border overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-muted/30">
                          <tr>
                            {matchFieldKeys.map((key) => {
                              const fieldDef = availableFields.find((f) => f.key === key)
                              return (
                                <th key={key} className="px-3 py-2 text-left font-medium text-muted-foreground">
                                  {fieldDef?.label ?? key}
                                </th>
                              )
                            })}
                            <th className="px-3 py-2 text-left font-medium text-muted-foreground">등록일</th>
                            <th className="px-3 py-2 text-left font-medium text-muted-foreground">상태</th>
                            <th className="px-3 py-2" />
                          </tr>
                        </thead>
                        <tbody>
                          {paged.map((entry) => (
                            <tr key={entry.id} className="border-t border-border">
                              {matchFieldKeys.map((key) => (
                                <td key={key} className="px-3 py-2">{entry.profile_data[key] ?? "-"}</td>
                              ))}
                              <td className="px-3 py-2 text-muted-foreground">
                                {entry.created_at ? new Date(entry.created_at).toLocaleDateString("ko-KR") : "-"}
                              </td>
                              <td className="px-3 py-2">
                                {entry.has_provisional_client ? (
                                  <Badge variant="success" className="text-[10px]">접속 이력 있음</Badge>
                                ) : (
                                  <Badge variant="secondary" className="text-[10px]">미접속</Badge>
                                )}
                              </td>
                              <td className="px-3 py-2">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteEntry(entry.id)}
                                  className="flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                >
                                  <IconX className="size-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {totalPages > 1 && (
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => setPreCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={safePage === 1}
                          className="rounded border px-2 py-1 text-xs text-muted-foreground hover:bg-muted disabled:opacity-30"
                        >
                          이전
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                          .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 2)
                          .reduce<(number | "...")[]>((acc, p, i, arr) => {
                            if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("...")
                            acc.push(p)
                            return acc
                          }, [])
                          .map((p, i) =>
                            p === "..." ? (
                              <span key={`ellipsis-${i}`} className="px-1 text-xs text-muted-foreground">…</span>
                            ) : (
                              <button
                                key={p}
                                type="button"
                                onClick={() => setPreCurrentPage(p as number)}
                                className={`rounded border px-2.5 py-1 text-xs ${safePage === p ? "border-primary bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted"}`}
                              >
                                {p}
                              </button>
                            )
                          )}
                        <button
                          type="button"
                          onClick={() => setPreCurrentPage((p) => Math.min(totalPages, p + 1))}
                          disabled={safePage === totalPages}
                          className="rounded border px-2 py-1 text-xs text-muted-foreground hover:bg-muted disabled:opacity-30"
                        >
                          다음
                        </button>
                      </div>
                    )}
                  </div>
                )
              })()}
            </CardContent>
          </Card>
        )}

        {test?.selected_scale_codes && test.selected_scale_codes.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                포함된 척도 ({test.scale_count ?? test.selected_scale_codes.length}개)
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-1.5">
                {test.selected_scale_codes.map((code) => (
                  <Badge key={code} variant="secondary" className="text-xs">{code}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {sessionConfigs.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
              <CardTitle className="text-sm font-medium">세션별 검사 안내</CardTitle>
              <Button type="button" size="sm" onClick={saveSettings} disabled={savingSettings}>
                {savingSettings ? "저장 중..." : "안내 저장"}
              </Button>
            </CardHeader>
            <CardContent className="grid gap-4">
              {sessionConfigs.map((session, sessionIndex) => (
                <div key={session.session_id} className="rounded-lg border border-border bg-muted/20 p-4">
                  <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor={`session_title_${session.session_id}`}>세션 이름</Label>
                        <Input
                          id={`session_title_${session.session_id}`}
                          value={session.title}
                          onChange={(e) => updateSession(session.session_id, { title: e.target.value })}
                          placeholder={`세션 ${sessionIndex + 1}`}
                          maxLength={80}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor={`session_description_${session.session_id}`}>검사 안내 문구</Label>
                        <textarea
                          id={`session_description_${session.session_id}`}
                          value={session.description}
                          onChange={(e) => updateSession(session.session_id, { description: e.target.value })}
                          placeholder="세션 시작 전 보여줄 검사 안내 문구"
                          rows={4}
                          maxLength={500}
                          className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                      </div>
                      <div className="flex min-h-8 flex-wrap items-center gap-1.5 rounded-md border border-dashed border-border bg-background p-2">
                        {session.test_ids.map((testId) => (
                          <Badge key={testId} variant="secondary" className="font-mono text-[11px]">{testId}</Badge>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-md border border-border bg-background p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold">안내사항</p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">수검자 안내 화면의 번호 목록으로 표시됩니다.</p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => addSessionGuideItem(session.session_id)}
                          disabled={session.guide_items.length >= 8}
                        >
                          <IconPlus className="size-3.5" />
                          항목
                        </Button>
                      </div>
                      <div className="mt-3 grid gap-2">
                        {session.guide_items.length === 0 ? (
                          <p className="rounded-md border border-dashed bg-muted/30 px-3 py-3 text-center text-xs text-muted-foreground">
                            안내사항을 추가하지 않으면 기본 안내사항이 표시됩니다.
                          </p>
                        ) : session.guide_items.map((guideItem, guideIndex) => (
                          <div key={guideIndex} className="flex items-start gap-2">
                            <span className="mt-2 flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
                              {guideIndex + 1}
                            </span>
                            <textarea
                              value={guideItem}
                              onChange={(e) => updateSessionGuideItem(session.session_id, guideIndex, e.target.value)}
                              placeholder="안내사항 문구"
                              rows={2}
                              maxLength={180}
                              className="min-h-10 w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            />
                            <button
                              type="button"
                              onClick={() => removeSessionGuideItem(session.session_id, guideIndex)}
                              className="mt-1.5 flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                              aria-label={`안내사항 ${guideIndex + 1} 삭제`}
                            >
                              <IconX className="size-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
