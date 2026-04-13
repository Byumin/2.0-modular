import * as React from "react"
import { Link, useNavigate } from "react-router-dom"
import { IconPlus, IconSearch } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"

interface AssignedTest {
  id: number
  custom_test_name: string
  parent_test_name?: string
}

interface Client {
  id: number
  name: string
  gender: string
  birth_day?: string
  memo?: string
  assigned_custom_tests?: AssignedTest[]
  last_assessed_on?: string | null
  status: string
  created_at: string
}

function assignedSummary(client: Client): string {
  const tests = client.assigned_custom_tests ?? []
  if (!tests.length) return "미배정"
  const first = tests[0]
  const label = first.parent_test_name
    ? `${first.custom_test_name} (기반: ${first.parent_test_name})`
    : first.custom_test_name
  return tests.length === 1 ? label : `${label} 외 ${tests.length - 1}건`
}

const statusVariant = (status: string): "success" | "warning" | "secondary" => {
  if (status === "미실시" || status === "배정대기") return "warning"
  if (status === "실시완료") return "success"
  return "secondary"
}

export function ClientManagement() {
  const navigate = useNavigate()
  const [clients, setClients] = React.useState<Client[]>([])
  const [search, setSearch] = React.useState("")
  const [gender, setGender] = React.useState("")
  const [status, setStatus] = React.useState("")
  const [loading, setLoading] = React.useState(true)
  const [showCreateModal, setShowCreateModal] = React.useState(false)
  const [createName, setCreateName] = React.useState("")
  const [createGender, setCreateGender] = React.useState("")
  const [createBirthDay, setCreateBirthDay] = React.useState("")
  const [createMemo, setCreateMemo] = React.useState("")
  const [createMessage, setCreateMessage] = React.useState<{ text: string; error: boolean } | null>(null)
  const [creating, setCreating] = React.useState(false)

  const fetchClients = React.useCallback(() => {
    setLoading(true)
    fetch("/api/admin/clients")
      .then((r) => r.json())
      .then((data) => {
        let items: Client[] = data.items ?? []
        if (search.trim()) {
          const q = search.trim().toLowerCase()
          items = items.filter((c) =>
            c.name.toLowerCase().includes(q) ||
            (c.memo ?? "").toLowerCase().includes(q)
          )
        }
        if (gender) items = items.filter((c) => c.gender === gender)
        if (status) items = items.filter((c) => c.status === status)
        setClients(items)
      })
      .catch(() => setClients([]))
      .finally(() => setLoading(false))
  }, [search, gender, status])

  React.useEffect(() => { fetchClients() }, [fetchClients])

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!createName.trim() || !createGender) {
      setCreateMessage({ text: "이름과 성별은 필수입니다.", error: true })
      return
    }

    setCreating(true)
    setCreateMessage(null)
    try {
      const res = await fetch("/api/admin/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createName.trim(),
          gender: createGender,
          birth_day: createBirthDay || null,
          memo: createMemo,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail || "내담자 등록에 실패했습니다.")
      }
      setShowCreateModal(false)
      setCreateName("")
      setCreateGender("")
      setCreateBirthDay("")
      setCreateMemo("")
      await fetchClients()
    } catch (error) {
      setCreateMessage({ text: error instanceof Error ? error.message : "내담자 등록에 실패했습니다.", error: true })
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6 overflow-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">내담자 관리</h2>
          <p className="text-sm text-muted-foreground mt-0.5">내담자를 조회하고 관리합니다</p>
        </div>
        <Button size="sm" onClick={() => setShowCreateModal(true)}>
          <IconPlus className="size-4" />
          내담자 등록
        </Button>
      </div>

      {/* 필터 */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <IconSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="이름·메모 검색..."
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            className="pl-8 w-48"
          />
        </div>
        <select
          value={gender}
          onChange={(e) => setGender(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <option value="">성별 전체</option>
          <option value="male">남성</option>
          <option value="female">여성</option>
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <option value="">상태 전체</option>
          <option value="배정대기">배정대기</option>
          <option value="미실시">미실시</option>
          <option value="실시완료">실시완료</option>
        </select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              불러오는 중...
            </div>
          ) : clients.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              내담자가 없습니다.
            </div>
          ) : (
            <>
              {/* 헤더 */}
              <div className="hidden md:grid grid-cols-[2fr_2fr_1fr_1fr_auto] gap-2 px-4 py-2 border-b text-xs font-medium text-muted-foreground">
                <span>이름</span>
                <span>배정 검사</span>
                <span>마지막 실시일</span>
                <span>상태</span>
                <span></span>
              </div>
              <div className="divide-y">
                {clients.map((client) => (
                  <div
                    key={client.id}
                    className="grid grid-cols-1 md:grid-cols-[2fr_2fr_1fr_1fr_auto] gap-2 items-center px-4 py-3 hover:bg-muted/40 cursor-pointer"
                    onClick={() => navigate(`/admin/clients/${client.id}`)}
                  >
                    <span className="text-sm font-medium">{client.name}</span>
                    <span className="text-sm text-muted-foreground">{assignedSummary(client)}</span>
                    <span className="text-sm text-muted-foreground">
                      {client.last_assessed_on ?? "아직 실시하지 않음"}
                    </span>
                    <Badge variant={statusVariant(client.status)}>
                      {client.status}
                    </Badge>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                      <Link to={`/admin/clients/${client.id}`}>상세</Link>
                    </Button>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <section className="w-full max-w-lg rounded-lg border bg-card p-6 shadow-lg">
            <h3 className="text-lg font-semibold">내담자 등록</h3>
            <form onSubmit={handleCreate} className="mt-5 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="create_client_name" className="text-sm font-medium">이름 *</label>
                <Input
                  id="create_client_name"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="이름"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="create_client_gender" className="text-sm font-medium">성별 *</label>
                <select
                  id="create_client_gender"
                  value={createGender}
                  onChange={(e) => setCreateGender(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">선택</option>
                  <option value="male">남성</option>
                  <option value="female">여성</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="create_client_birth_day" className="text-sm font-medium">생년월일</label>
                <Input
                  id="create_client_birth_day"
                  type="date"
                  value={createBirthDay}
                  onChange={(e) => setCreateBirthDay(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="create_client_memo" className="text-sm font-medium">메모</label>
                <textarea
                  id="create_client_memo"
                  value={createMemo}
                  onChange={(e) => setCreateMemo(e.target.value)}
                  rows={3}
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
                />
              </div>
              {createMessage && (
                <p className={`text-sm ${createMessage.error ? "text-destructive" : "text-green-600"}`}>
                  {createMessage.text}
                </p>
              )}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)} disabled={creating}>
                  취소
                </Button>
                <Button type="submit" disabled={creating}>
                  {creating ? "등록 중..." : "등록"}
                </Button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  )
}
