import * as React from "react"
import { useParams, useNavigate } from "react-router-dom"
import { IconArrowLeft, IconLink, IconCopy } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface TestDetail {
  id: number
  custom_test_name: string
  client_intake_mode?: string
  test_ids?: string[]
  created_at: string
  selected_scale_codes?: string[]
  scale_count?: number
}

type ClientIntakeMode = "pre_registered_only" | "auto_create"

const intakeModeLabels: Record<ClientIntakeMode, string> = {
  pre_registered_only: "사전 등록 필수",
  auto_create: "검사 진행 시 자동 생성 허용",
}

function normalizeClientIntakeMode(value?: string): ClientIntakeMode {
  return value === "auto_create" ? "auto_create" : "pre_registered_only"
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
      })
      .catch(() => setError("검사 정보를 불러올 수 없습니다."))
      .finally(() => setLoading(false))
  }, [id])

  const handleSaveSettings = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
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
      const res = await fetch(`/api/admin/custom-tests/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          custom_test_name: trimmedName,
          client_intake_mode: intakeMode,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(typeof data.detail === "string" ? data.detail : "검사 설정 저장에 실패했습니다.")
      }

      setTest((prev) => prev ? { ...prev, custom_test_name: trimmedName, client_intake_mode: intakeMode } : prev)
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
    await navigator.clipboard.writeText(accessLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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
      </div>
    </div>
  )
}
