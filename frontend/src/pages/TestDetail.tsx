import * as React from "react"
import { useParams, useNavigate } from "react-router-dom"
import { IconArrowLeft, IconLink, IconCopy, IconPlus, IconX } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface TestDetail {
  id: number
  custom_test_name: string
  client_intake_mode?: string
  requires_consent?: boolean
  test_ids?: string[]
  session_configs?: SessionConfig[]
  created_at: string
  selected_scale_codes?: string[]
  scale_count?: number
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
  const [generatingLink, setGeneratingLink] = React.useState(false)
  const [copied, setCopied] = React.useState(false)
  const [nameValue, setNameValue] = React.useState("")
  const [intakeMode, setIntakeMode] = React.useState<ClientIntakeMode>("pre_registered_only")
  const [sessionConfigs, setSessionConfigs] = React.useState<SessionConfig[]>([])
  const [savingSettings, setSavingSettings] = React.useState(false)
  const [saveMessage, setSaveMessage] = React.useState<{ text: string; error: boolean } | null>(null)

  React.useEffect(() => {
    if (!id) return
    fetch(`/api/admin/custom-tests/${id}`)
      .then((r) => r.json())
      .then((data) => {
        const item = data.item ?? data
        setTest(item)
        setNameValue(item.custom_test_name ?? "")
        setIntakeMode(normalizeClientIntakeMode(item.client_intake_mode))
        setSessionConfigs(normalizeSessionConfigs(item.session_configs, item.test_ids ?? []))
      })
      .catch(() => setError("검사 정보를 불러올 수 없습니다."))
      .finally(() => setLoading(false))
  }, [id])

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
          requires_consent: Boolean(test.requires_consent),
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
    } catch {
      setError("링크 생성에 실패했습니다.")
    } finally {
      setGeneratingLink(false)
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
          </CardContent>
        </Card>

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
