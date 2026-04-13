import * as React from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { IconArrowLeft, IconChartBar } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface Assignment {
  id: number
  custom_test_name: string
  parent_test_name?: string
}

interface AssessmentLog {
  id: number
  assessed_on: string | null
  created_at: string
}

interface CustomTestOption {
  id: number
  custom_test_name: string
  test_id: string
  assigned_count: number
  assessed_count: number
  progress_status: string
}

interface ClientItem {
  id: number
  name: string
  gender: string
  birth_day: string | null
  memo: string
  assigned_custom_tests?: Assignment[]
  assessment_logs?: AssessmentLog[]
}

export function ClientDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [client, setClient] = React.useState<ClientItem | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [assigning, setAssigning] = React.useState(false)
  const [generatingId, setGeneratingId] = React.useState<number | null>(null)
  const [message, setMessage] = React.useState<{ text: string; error: boolean } | null>(null)
  const [assignmentMessage, setAssignmentMessage] = React.useState<{ text: string; error: boolean } | null>(null)
  const [customTests, setCustomTests] = React.useState<CustomTestOption[]>([])
  const [selectedCustomTestId, setSelectedCustomTestId] = React.useState("")

  const [name, setName] = React.useState("")
  const [gender, setGender] = React.useState("")
  const [birthDay, setBirthDay] = React.useState("")
  const [memo, setMemo] = React.useState("")

  const load = React.useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/clients/${id}`)
      const data = await res.json()
      const item: ClientItem = data.item || data
      setClient(item)
      setName(item.name || "")
      setGender(item.gender || "")
      setBirthDay(item.birth_day || "")
      setMemo(item.memo || "")
    } catch {
      setMessage({ text: "내담자 정보를 불러올 수 없습니다.", error: true })
    } finally {
      setLoading(false)
    }
  }, [id])

  React.useEffect(() => { load() }, [load])

  React.useEffect(() => {
    fetch("/api/admin/custom-tests")
      .then((r) => r.json())
      .then((data) => {
        const items: CustomTestOption[] = data.items ?? []
        setCustomTests(items)
        setSelectedCustomTestId((prev) => prev || String(items[0]?.id ?? ""))
      })
      .catch(() => setCustomTests([]))
  }, [])

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!name.trim() || !gender) {
      setMessage({ text: "이름과 성별은 필수입니다.", error: true })
      return
    }
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch(`/api/admin/clients/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), gender, birth_day: birthDay || null, memo }),
      })
      if (res.ok) {
        setMessage({ text: "내담자 정보가 저장되었습니다.", error: false })
        await load()
      } else {
        const d = await res.json().catch(() => ({}))
        setMessage({ text: d.detail ?? "저장에 실패했습니다.", error: true })
      }
    } catch {
      setMessage({ text: "서버 오류가 발생했습니다.", error: true })
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveAssignment = async (customTestId: number) => {
    if (!confirm("이 검사 배정을 삭제하시겠습니까?")) return
    await fetch(`/api/admin/clients/${id}/assignments/${customTestId}`, { method: "DELETE" })

    await load()
  }

  const handleAddAssignment = async () => {
    if (!id || !selectedCustomTestId) {
      setAssignmentMessage({ text: "배정할 검사를 선택해주세요.", error: true })
      return
    }
    setAssigning(true)
    setAssignmentMessage(null)
    try {
      const res = await fetch(`/api/admin/clients/${id}/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin_custom_test_id: Number(selectedCustomTestId) }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.detail || "검사 배정에 실패했습니다.")
      setAssignmentMessage({ text: data.message || "검사가 배정되었습니다.", error: false })
      await load()
    } catch (error) {
      setAssignmentMessage({ text: error instanceof Error ? error.message : "검사 배정에 실패했습니다.", error: true })
    } finally {
      setAssigning(false)
    }
  }

  const handleCopyAssignmentUrl = async (customTestId: number) => {
    setGeneratingId(customTestId)
    setAssignmentMessage(null)
    try {
      const res = await fetch(`/api/admin/custom-tests/${customTestId}/access-link`, { method: "POST" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.detail || "검사 URL 생성에 실패했습니다.")
      const fullUrl = `${window.location.origin}${data.assessment_url}`
      await navigator.clipboard.writeText(fullUrl)
      setAssignmentMessage({ text: "검사 URL이 클립보드에 복사되었습니다.", error: false })
    } catch (error) {
      setAssignmentMessage({ text: error instanceof Error ? error.message : "검사 URL 생성에 실패했습니다.", error: true })
    } finally {
      setGeneratingId(null)
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
        <Button variant="ghost" size="icon" className="size-8" onClick={() => navigate("/admin/clients")}>
          <IconArrowLeft className="size-4" />
        </Button>
        <div>
          <h2 className="text-xl font-semibold">{client?.name ?? "내담자 상세"}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">내담자 정보를 수정하고 검사를 관리합니다</p>
        </div>
        <div className="ml-auto">
          {client?.assessment_logs && client.assessment_logs.length > 0 ? (
            <Button variant="outline" size="sm" asChild>
              <Link to={`/admin/clients/${id}/result`}>
                <IconChartBar className="size-4" />
                결과 보기
              </Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              <IconChartBar className="size-4" />
              결과 보기
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">기본 정보</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">이름 *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="gender">성별 *</Label>
                <select
                  id="gender"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  <option value="">선택</option>
                  <option value="male">남성</option>
                  <option value="female">여성</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="birth_day">생년월일</Label>
                <Input
                  id="birth_day"
                  type="date"
                  value={birthDay}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBirthDay(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="memo">메모</Label>
                <textarea
                  id="memo"
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 resize-none"
                />
              </div>
              {message && (
                <p className={`text-sm ${message.error ? "text-destructive" : "text-green-600"}`}>
                  {message.text}
                </p>
              )}
              <Button type="submit" disabled={saving} className="w-full">
                {saving ? "저장 중..." : "저장"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">배정된 검사</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 pt-0">
            <div className="rounded-md border bg-muted/20 p-3">
              <div className="flex flex-col gap-2 sm:flex-row">
                <select
                  value={selectedCustomTestId}
                  onChange={(e) => setSelectedCustomTestId(e.target.value)}
                  className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {customTests.length === 0 ? (
                    <option value="">배정 가능한 검사 없음</option>
                  ) : customTests.map((test) => (
                    <option key={test.id} value={test.id}>
                      {test.custom_test_name} ({test.test_id})
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddAssignment}
                  disabled={assigning || !customTests.length}
                >
                  {assigning ? "배정 중..." : "검사 배정"}
                </Button>
              </div>
              {assignmentMessage && (
                <p className={`mt-2 text-sm ${assignmentMessage.error ? "text-destructive" : "text-green-600"}`}>
                  {assignmentMessage.text}
                </p>
              )}
            </div>
            {!client?.assigned_custom_tests || client.assigned_custom_tests.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">배정된 검사가 없습니다.</p>
            ) : (
              <div className="flex flex-col divide-y">
                {client.assigned_custom_tests.map((a) => (
                  <div key={a.id} className="flex items-center justify-between py-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium">{a.custom_test_name}</span>
                      {a.parent_test_name && (
                        <span className="text-xs text-muted-foreground">{a.parent_test_name}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => handleCopyAssignmentUrl(a.id)}
                        disabled={generatingId === a.id}
                      >
                        {generatingId === a.id ? "생성 중..." : "URL 복사"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemoveAssignment(a.id)}
                      >
                        삭제
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {client?.assessment_logs && client.assessment_logs.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">검사 이력</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-col divide-y">
                {client.assessment_logs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between py-2.5">
                    <span className="text-sm">
                      {log.assessed_on
                        ? new Date(log.assessed_on).toLocaleDateString("ko-KR")
                        : "날짜 미기록"}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      등록: {new Date(log.created_at).toLocaleDateString("ko-KR")}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
