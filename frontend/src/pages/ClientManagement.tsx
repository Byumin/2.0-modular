import * as React from "react"
import { Link, useNavigate } from "react-router-dom"
import { IconPlus, IconSearch, IconSettings, IconUsers, IconClipboardList } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"

interface Group { id: number; name: string; color: string }

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
  phone?: string
  address?: string
  tags?: string[]
  memo?: string
  assigned_custom_tests?: AssignedTest[]
  last_assessed_on?: string | null
  status: string
  created_at: string
  groups?: Group[]
}

interface TestGroup {
  id: number
  name: string
  parentName?: string
  clients: Client[]
}

interface TestOverviewItem {
  custom_test_id: number
  custom_test_name: string
  parent_test_name?: string | null
  assigned_count: number
  pending_count: number
  not_started_count: number
  completed_count: number
  last_assessed_on?: string | null
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
  const [viewMode, setViewMode] = React.useState<"client" | "test">("client")
  const [clients, setClients] = React.useState<Client[]>([])
  const [search, setSearch] = React.useState("")
  const [gender, setGender] = React.useState("")
  const [status, setStatus] = React.useState("")
  const [groupId, setGroupId] = React.useState("")
  const [selectedTestGroupId, setSelectedTestGroupId] = React.useState("")
  const [groups, setGroups] = React.useState<Group[]>([])
  const [testOverviewItems, setTestOverviewItems] = React.useState<TestOverviewItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [testOverviewLoading, setTestOverviewLoading] = React.useState(false)
  const [showGroupManager, setShowGroupManager] = React.useState(false)
  const [newGroupName, setNewGroupName] = React.useState("")
  const [newGroupColor, setNewGroupColor] = React.useState("#3b82f6")
  const [creatingGroup, setCreatingGroup] = React.useState(false)
  const [showCreateModal, setShowCreateModal] = React.useState(false)
  const [createName, setCreateName] = React.useState("")
  const [createGender, setCreateGender] = React.useState("")
  const [createBirthDay, setCreateBirthDay] = React.useState("")
  const [createMemo, setCreateMemo] = React.useState("")
  const [createMessage, setCreateMessage] = React.useState<{ text: string; error: boolean } | null>(null)
  const [creating, setCreating] = React.useState(false)

  const fetchClients = React.useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams()
    const searchText = search.trim()
    if (groupId && viewMode === "client") params.set("group_id", groupId)
    if (searchText) params.set("q", searchText)
    if (gender) params.set("gender", gender)
    if (status) params.set("status", status)
    fetch(`/api/admin/clients?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setClients(data.items ?? [])
      })
      .catch(() => setClients([]))
      .finally(() => setLoading(false))
  }, [search, gender, status, groupId, viewMode])

  const fetchGroups = React.useCallback(() => {
    fetch("/api/admin/client-groups").then((r) => r.json()).then((d) => setGroups(d.items ?? [])).catch(() => {})
  }, [])

  const fetchTestOverview = React.useCallback(() => {
    if (viewMode !== "test") return
    setTestOverviewLoading(true)
    const params = new URLSearchParams()
    const searchText = search.trim()
    if (searchText) params.set("q", searchText)
    if (status) params.set("status", status)
    fetch(`/api/admin/client-test-overview?${params}`)
      .then((r) => r.json())
      .then((data) => setTestOverviewItems(data.items ?? []))
      .catch(() => setTestOverviewItems([]))
      .finally(() => setTestOverviewLoading(false))
  }, [search, status, viewMode])

  React.useEffect(() => { fetchClients() }, [fetchClients])
  React.useEffect(() => { fetchGroups() }, [fetchGroups])
  React.useEffect(() => { fetchTestOverview() }, [fetchTestOverview])

  // 검사별 그룹핑 (test view mode)
  const testGroups = React.useMemo<TestGroup[]>(() => {
    if (viewMode !== "test") return []
    const map = new Map<number, TestGroup>()
    const unassigned: Client[] = []
    for (const client of clients) {
      const tests = client.assigned_custom_tests ?? []
      if (tests.length === 0) {
        unassigned.push(client)
      } else {
        for (const t of tests) {
          if (!map.has(t.id)) {
            map.set(t.id, { id: t.id, name: t.custom_test_name, parentName: t.parent_test_name, clients: [] })
          }
          map.get(t.id)!.clients.push(client)
        }
      }
    }
    const sorted = Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, "ko"))
    if (unassigned.length > 0) {
      sorted.push({ id: -1, name: "미배정", clients: unassigned })
    }
    return sorted
  }, [clients, viewMode])

  const selectedTestGroup = React.useMemo(() => {
    if (testGroups.length === 0) return null
    return testGroups.find((group) => String(group.id) === selectedTestGroupId) ?? testGroups[0]
  }, [selectedTestGroupId, testGroups])

  const selectedOverviewItem = React.useMemo(() => (
    testOverviewItems.find((item) => String(item.custom_test_id) === selectedTestGroupId) ?? testOverviewItems[0] ?? null
  ), [selectedTestGroupId, testOverviewItems])

  React.useEffect(() => {
    if (viewMode !== "test") return
    if (testOverviewItems.length === 0) {
      setSelectedTestGroupId("")
      return
    }
    if (!testOverviewItems.some((item) => String(item.custom_test_id) === selectedTestGroupId)) {
      setSelectedTestGroupId(String(testOverviewItems[0].custom_test_id))
    }
  }, [selectedTestGroupId, testOverviewItems, viewMode])

  const handleSwitchView = (mode: "client" | "test") => {
    if (mode === "test") setGroupId("")
    if (mode === "client") setSelectedTestGroupId("")
    setViewMode(mode)
  }

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || creatingGroup) return
    setCreatingGroup(true)
    try {
      const res = await fetch("/api/admin/client-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newGroupName.trim(), color: newGroupColor }),
      })
      if (res.ok) { setNewGroupName(""); fetchGroups() }
    } finally { setCreatingGroup(false) }
  }

  const handleDeleteGroup = async (gid: number) => {
    if (!confirm("그룹을 삭제하면 소속 내담자들이 그룹에서 제거됩니다. 삭제하시겠습니까?")) return
    await fetch(`/api/admin/client-groups/${gid}`, { method: "DELETE" })
    fetchGroups()
    setGroupId("")
  }

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
    <div className="flex min-w-[640px] flex-col gap-6 overflow-auto p-6">
      {/* 헤더 */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold">내담자 관리</h2>
          <p className="text-sm text-muted-foreground mt-0.5">내담자를 조회하고 관리합니다</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowGroupManager(true)}>
            <IconSettings className="size-4" />
            그룹 관리
          </Button>
          <Button size="sm" onClick={() => setShowCreateModal(true)}>
            <IconPlus className="size-4" />
            내담자 등록
          </Button>
        </div>
      </div>

      {/* 필터 + 뷰 전환 */}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative w-full sm:w-auto">
            <IconSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="이름·그룹·검사·메모·태그 검색..."
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              className="pl-8 w-full sm:w-72"
            />
          </div>
          {viewMode === "client" && (
            <select
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <option value="">그룹 전체</option>
              {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          )}
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

        {/* 뷰 모드 토글 */}
        <div className="flex overflow-hidden rounded-md border text-xs">
          <button
            className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors ${
              viewMode === "client"
                ? "bg-primary text-primary-foreground"
                : "bg-background text-muted-foreground hover:bg-muted"
            }`}
            onClick={() => handleSwitchView("client")}
          >
            <IconUsers className="size-3.5" />내담자별
          </button>
          <button
            className={`flex items-center gap-1.5 border-l px-3 py-1.5 transition-colors ${
              viewMode === "test"
                ? "bg-primary text-primary-foreground"
                : "bg-background text-muted-foreground hover:bg-muted"
            }`}
            onClick={() => handleSwitchView("test")}
          >
            <IconClipboardList className="size-3.5" />검사별
          </button>
        </div>
      </div>

      {/* 내담자별 뷰 */}
      {viewMode === "client" && (
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">불러오는 중...</div>
            ) : clients.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">내담자가 없습니다.</div>
            ) : (
              <>
                <div className="hidden md:grid md:grid-cols-[40px_1fr_1.5fr_2fr_1fr_0.8fr_72px] gap-2 px-4 py-2 border-b text-xs font-medium text-muted-foreground">
                  <span className="text-center">#</span>
                  <span className="text-center">이름</span>
                  <span className="text-center">그룹</span>
                  <span className="text-center">배정 검사</span>
                  <span className="text-center">마지막 실시일</span>
                  <span className="text-center">상태</span>
                  <span />
                </div>
                <div className="divide-y">
                  {clients.map((client, idx) => (
                    <div
                      key={client.id}
                      className="grid grid-cols-1 md:grid-cols-[40px_1fr_1.5fr_2fr_1fr_0.8fr_72px] gap-2 items-center px-4 py-3 hover:bg-muted/40 cursor-pointer"
                      onClick={() => navigate(`/admin/clients/${client.id}`)}
                    >
                      <span className="hidden md:block text-center text-xs text-muted-foreground">{idx + 1}</span>
                      <span className="text-sm font-medium text-center">{client.name}</span>
                      <div className="flex flex-wrap gap-1 justify-center">
                        {(client.groups ?? []).length === 0 ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          (client.groups ?? []).map((g) => (
                            <span
                              key={g.id}
                              className="inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium"
                              style={{ backgroundColor: g.color + "20", color: g.color, border: `1px solid ${g.color}50` }}
                            >
                              {g.name}
                            </span>
                          ))
                        )}
                      </div>
                      <span className="text-sm text-muted-foreground text-center">{assignedSummary(client)}</span>
                      <span className="text-sm text-muted-foreground text-center">{client.last_assessed_on ?? "—"}</span>
                      <div className="flex justify-center">
                        <Badge variant={statusVariant(client.status)}>{client.status}</Badge>
                      </div>
                      <div className="flex justify-center">
                        <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                          <Link to={`/admin/clients/${client.id}`}>상세</Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* 검사별 뷰 */}
      {viewMode === "test" && (
        <div className="flex flex-col gap-4">
          {loading || testOverviewLoading ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">불러오는 중...</div>
          ) : testOverviewItems.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">조건에 맞는 검사가 없습니다.</div>
          ) : (
            <>
              <Card>
                <div className="flex flex-col gap-1 px-4 py-3 border-b">
                  <span className="text-sm font-semibold">검사별 현황</span>
                  <span className="text-xs text-muted-foreground">검사를 선택하면 해당 검사에 배정된 내담자만 아래에 표시됩니다.</span>
                </div>
                <CardContent className="p-0">
                  <div className="hidden md:grid md:grid-cols-[2fr_1.2fr_0.7fr_0.7fr_0.7fr_1fr] gap-2 px-4 py-2 border-b text-xs font-medium text-muted-foreground">
                    <span className="text-center">검사명</span>
                    <span className="text-center">기반 검사</span>
                    <span className="text-center">배정</span>
                    <span className="text-center">미실시</span>
                    <span className="text-center">실시완료</span>
                    <span className="text-center">마지막 실시일</span>
                  </div>
                  <div className="max-h-80 divide-y overflow-auto">
                    {testOverviewItems.map((item) => {
                      const selected = String(item.custom_test_id) === selectedTestGroupId
                      return (
                        <button
                          key={item.custom_test_id}
                          type="button"
                          className={`grid w-full grid-cols-1 gap-2 px-4 py-3 text-left transition-colors md:grid-cols-[2fr_1.2fr_0.7fr_0.7fr_0.7fr_1fr] md:items-center ${
                            selected ? "bg-muted" : "hover:bg-muted/40"
                          }`}
                          onClick={() => setSelectedTestGroupId(String(item.custom_test_id))}
                        >
                          <span className="text-sm font-medium md:text-center">{item.custom_test_name}</span>
                          <span className="text-sm text-muted-foreground md:text-center">{item.parent_test_name ?? "—"}</span>
                          <span className="text-sm text-muted-foreground md:text-center">{item.assigned_count}명</span>
                          <span className="text-sm text-muted-foreground md:text-center">{item.not_started_count}명</span>
                          <span className="text-sm text-muted-foreground md:text-center">{item.completed_count}명</span>
                          <span className="text-sm text-muted-foreground md:text-center">{item.last_assessed_on ?? "—"}</span>
                        </button>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <div className="flex flex-col gap-3 px-4 py-3 border-b sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold">{selectedOverviewItem?.custom_test_name ?? "검사 선택"}</span>
                    <span className="text-xs text-muted-foreground">
                      {selectedOverviewItem?.parent_test_name ? `기반: ${selectedOverviewItem.parent_test_name} · ` : ""}
                      배정 {selectedOverviewItem?.assigned_count ?? 0}명 · 미실시 {selectedOverviewItem?.not_started_count ?? 0}명 · 실시완료 {selectedOverviewItem?.completed_count ?? 0}명
                    </span>
                  </div>
                </div>
                {selectedTestGroup ? (
                  <CardContent className="p-0">
                    <div className="hidden md:grid md:grid-cols-[40px_1.5fr_1fr_0.8fr_72px] gap-2 px-4 py-2 border-b text-xs font-medium text-muted-foreground">
                      <span className="text-center">#</span>
                      <span className="text-center">이름</span>
                      <span className="text-center">마지막 실시일</span>
                      <span className="text-center">상태</span>
                      <span />
                    </div>
                    <div className="divide-y">
                      {selectedTestGroup.clients.map((client, idx) => (
                        <div
                          key={client.id}
                          className="grid grid-cols-1 md:grid-cols-[40px_1.5fr_1fr_0.8fr_72px] gap-2 items-center px-4 py-3 hover:bg-muted/40 cursor-pointer"
                          onClick={() => navigate(`/admin/clients/${client.id}`)}
                        >
                          <span className="hidden md:block text-center text-xs text-muted-foreground">{idx + 1}</span>
                          <span className="text-sm font-medium text-center">{client.name}</span>
                          <span className="text-sm text-muted-foreground text-center">{client.last_assessed_on ?? "—"}</span>
                          <div className="flex justify-center">
                            <Badge variant={statusVariant(client.status)}>{client.status}</Badge>
                          </div>
                          <div className="flex justify-center">
                            <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                              <Link to={`/admin/clients/${client.id}`}>상세</Link>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                ) : (
                  <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">선택한 검사에 표시할 내담자가 없습니다.</div>
                )}
              </Card>
            </>
          )}
        </div>
      )}

      {/* 내담자 등록 모달 */}
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

      {/* 그룹 관리 모달 */}
      {showGroupManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <section className="w-full max-w-md rounded-lg border bg-card p-6 shadow-lg">
            <h3 className="text-lg font-semibold">그룹 관리</h3>
            <p className="text-xs text-muted-foreground mt-0.5 mb-4">내담자를 분류할 그룹을 만들고 관리합니다</p>
            <div className="flex gap-2 mb-4">
              <input
                type="color"
                value={newGroupColor}
                onChange={(e) => setNewGroupColor(e.target.value)}
                className="h-9 w-10 cursor-pointer rounded border border-input p-0.5"
                title="그룹 색상"
              />
              <Input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="새 그룹 이름"
                className="flex-1"
                onKeyDown={(e) => e.key === "Enter" && handleCreateGroup()}
              />
              <Button size="sm" onClick={handleCreateGroup} disabled={creatingGroup || !newGroupName.trim()}>
                <IconPlus className="size-4" />추가
              </Button>
            </div>
            {groups.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">그룹이 없습니다.</p>
            ) : (
              <div className="flex flex-col divide-y rounded-lg border max-h-64 overflow-y-auto">
                {groups.map((g) => (
                  <div key={g.id} className="flex items-center justify-between px-3 py-2.5 gap-2">
                    <div className="flex items-center gap-2">
                      <span className="size-3 rounded-full shrink-0" style={{ backgroundColor: g.color }} />
                      <span className="text-sm">{g.name}</span>
                    </div>
                    <Button
                      variant="ghost" size="sm"
                      className="h-7 text-xs text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeleteGroup(g.id)}
                    >
                      삭제
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-5 flex justify-end">
              <Button variant="outline" onClick={() => setShowGroupManager(false)}>닫기</Button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
