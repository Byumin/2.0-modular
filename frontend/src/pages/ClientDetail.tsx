import * as React from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { IconArrowLeft, IconEdit, IconPlus, IconX, IconFileText } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

// ── 타입 ─────────────────────────────────────────────────────────────────────

interface Group { id: number; name: string; color: string }

interface Assignment {
  id: number
  custom_test_name: string
  parent_test_name?: string
}

interface AssessmentLog {
  id: number
  assessed_on: string
  custom_test_name: string
  parent_test_name?: string
}

interface TestResult {
  id: string
  custom_test_name: string
  parent_test_name: string
  assessed_on: string | null
}

interface ReportSection { title: string; content: string }

interface ClientItem {
  id: number
  name: string
  gender: string
  birth_day: string | null
  phone: string
  address: string
  is_closed: boolean
  tags: string[]
  memo: string
  groups: Group[]
  assigned_custom_tests: Assignment[]
  assessment_logs: AssessmentLog[]
  custom_test_results: TestResult[]
  report: { sections: ReportSection[]; updated_at: string | null }
  created_at: string
}

interface GroupOption { id: number; name: string; color: string }
interface CustomTestOption { id: number; custom_test_name: string; test_id: string }

// ── 유틸 ─────────────────────────────────────────────────────────────────────

function genderLabel(g: string) {
  return g === "male" ? "남" : g === "female" ? "여" : g
}

function ageText(birth_day: string | null) {
  if (!birth_day) return null
  const birth = new Date(birth_day)
  const today = new Date()
  let years = today.getFullYear() - birth.getFullYear()
  let months = today.getMonth() - birth.getMonth()
  if (months < 0) { years--; months += 12 }
  return `만 ${years}세 ${months}개월`
}

async function apiFetch(url: string, init?: RequestInit) {
  const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...init })
  if (!res.ok) {
    const d = await res.json().catch(() => ({}))
    throw new Error(typeof d?.detail === "string" ? d.detail : d?.detail?.message || "요청 실패")
  }
  return res.json()
}

// ── 하위 컴포넌트들 ───────────────────────────────────────────────────────────

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[100px_1fr] gap-2 items-start py-2 border-b border-border/50 last:border-0">
      <span className="text-xs text-muted-foreground pt-0.5">{label}</span>
      <div className="text-sm">{children}</div>
    </div>
  )
}

function EditableField({ label, value, onSave }: { label: string; value: string; onSave: (v: string) => Promise<void> }) {
  const [editing, setEditing] = React.useState(false)
  const [draft, setDraft] = React.useState(value)
  const [saving, setSaving] = React.useState(false)

  async function handleSave() {
    setSaving(true)
    try { await onSave(draft); setEditing(false) } finally { setSaving(false) }
  }

  if (editing) {
    return (
      <div className="grid grid-cols-[100px_1fr] gap-2 items-center py-2 border-b border-border/50">
        <span className="text-xs text-muted-foreground">{label}</span>
        <div className="flex gap-1.5">
          <input
            className="flex-1 h-7 rounded border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            autoFocus
          />
          <Button size="sm" className="h-7 text-xs" disabled={saving} onClick={handleSave}>저장</Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setDraft(value); setEditing(false) }}>취소</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-[100px_1fr] gap-2 items-center py-2 border-b border-border/50 last:border-0 group">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className="text-sm flex-1">{value || <span className="text-muted-foreground">—</span>}</span>
        <button onClick={() => setEditing(true)} className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-muted">
          <IconEdit className="size-3.5 text-muted-foreground" />
        </button>
      </div>
    </div>
  )
}

function TagsSection({ tags, onUpdate }: { tags: string[]; onUpdate: (tags: string[]) => Promise<void> }) {
  const [newTag, setNewTag] = React.useState("")
  const [adding, setAdding] = React.useState(false)

  async function handleAdd() {
    const tag = newTag.trim().replace(/^#/, "")
    if (!tag || tags.includes(tag)) { setNewTag(""); return }
    setAdding(true)
    try { await onUpdate([...tags, tag]); setNewTag("") } finally { setAdding(false) }
  }

  async function handleRemove(tag: string) {
    await onUpdate(tags.filter((t) => t !== tag))
  }

  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      {tags.map((tag) => (
        <span key={tag} className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
          #{tag}
          <button onClick={() => handleRemove(tag)} className="hover:text-blue-900">
            <IconX className="size-3" />
          </button>
        </span>
      ))}
      <div className="flex items-center gap-1">
        <input
          className="h-6 w-24 rounded border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          placeholder="태그 입력"
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          disabled={adding}
        />
        <button onClick={handleAdd} disabled={adding || !newTag.trim()} className="inline-flex items-center gap-0.5 rounded-full border border-dashed border-border px-2 py-0.5 text-xs text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-40">
          <IconPlus className="size-3" />태그 추가
        </button>
      </div>
    </div>
  )
}

function GroupsSection({ clientId, groups, allGroups, onRefresh }: {
  clientId: number; groups: Group[]; allGroups: GroupOption[]; onRefresh: () => void
}) {
  const [showAdd, setShowAdd] = React.useState(false)
  const [selectedGroupId, setSelectedGroupId] = React.useState("")

  const availableGroups = allGroups.filter((g) => !groups.some((cg) => cg.id === g.id))

  async function handleAdd() {
    if (!selectedGroupId) return
    await apiFetch(`/api/admin/clients/${clientId}/groups`, {
      method: "POST",
      body: JSON.stringify({ group_id: Number(selectedGroupId) }),
    })
    setShowAdd(false); setSelectedGroupId(""); onRefresh()
  }

  async function handleRemove(groupId: number) {
    await apiFetch(`/api/admin/clients/${clientId}/groups/${groupId}`, { method: "DELETE" })
    onRefresh()
  }

  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      {groups.map((g) => (
        <span key={g.id} className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium"
          style={{ backgroundColor: g.color + "20", color: g.color, border: `1px solid ${g.color}50` }}>
          {g.name}
          <button onClick={() => handleRemove(g.id)} className="hover:opacity-70"><IconX className="size-3" /></button>
        </span>
      ))}
      {showAdd ? (
        <div className="flex items-center gap-1">
          <select
            className="h-6 rounded border border-input bg-background px-1.5 text-xs"
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
          >
            <option value="">그룹 선택</option>
            {availableGroups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <Button size="sm" className="h-6 text-xs px-2" onClick={handleAdd} disabled={!selectedGroupId}>추가</Button>
          <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => setShowAdd(false)}>취소</Button>
        </div>
      ) : (
        <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-0.5 rounded-md border border-dashed border-border px-2 py-0.5 text-xs text-muted-foreground hover:border-primary hover:text-primary">
          <IconPlus className="size-3" />그룹 추가
        </button>
      )}
    </div>
  )
}

function AssignmentSection({ clientId, assigned, allTests, onRefresh }: {
  clientId: number
  assigned: Assignment[]
  allTests: CustomTestOption[]
  onRefresh: () => void
}) {
  const [selectedId, setSelectedId] = React.useState("")
  const [assigning, setAssigning] = React.useState(false)
  const [generatingId, setGeneratingId] = React.useState<number | null>(null)
  const [copiedId, setCopiedId] = React.useState<number | null>(null)
  const [msg, setMsg] = React.useState("")

  const available = allTests.filter((t) => !assigned.some((a) => a.id === t.id))

  async function handleAssign() {
    if (!selectedId || assigning) return
    setAssigning(true); setMsg("")
    try {
      const res = await apiFetch(`/api/admin/clients/${clientId}/assignments`, {
        method: "POST", body: JSON.stringify({ admin_custom_test_id: Number(selectedId) }),
      })
      setMsg(res.message || "검사가 배정되었습니다."); setSelectedId(""); onRefresh()
    } catch (e) { setMsg(e instanceof Error ? e.message : "실패") } finally { setAssigning(false) }
  }

  async function handleRemove(testId: number) {
    await apiFetch(`/api/admin/clients/${clientId}/assignments/${testId}`, { method: "DELETE" })
    onRefresh()
  }

  async function handleCopyUrl(testId: number) {
    setGeneratingId(testId)
    try {
      const data = await apiFetch(`/api/admin/custom-tests/${testId}/access-link`, { method: "POST" })
      await navigator.clipboard.writeText(`${window.location.origin}${data.assessment_url}`)
      setCopiedId(testId); setTimeout(() => setCopiedId(null), 2000)
    } catch { /* ignore */ } finally { setGeneratingId(null) }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="h-8 flex-1 rounded-md border border-input bg-background px-2 text-sm"
        >
          <option value="">배정할 검사 선택</option>
          {available.map((t) => <option key={t.id} value={t.id}>{t.custom_test_name}</option>)}
        </select>
        <Button size="sm" className="h-8" onClick={handleAssign} disabled={assigning || !selectedId}>
          {assigning ? "배정 중..." : "검사 배정"}
        </Button>
      </div>
      {msg && <p className="text-xs text-muted-foreground">{msg}</p>}
      {assigned.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-3">배정된 검사가 없습니다.</p>
      ) : (
        <div className="flex flex-col divide-y rounded-lg border">
          {assigned.map((a) => (
            <div key={a.id} className="flex items-center justify-between px-3 py-2.5">
              <span className="text-sm font-medium">{a.custom_test_name}</span>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" className="h-7 text-xs"
                  onClick={() => handleCopyUrl(a.id)} disabled={generatingId === a.id}>
                  {generatingId === a.id ? "생성 중..." : copiedId === a.id ? "복사됨!" : "URL 복사"}
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-destructive"
                  onClick={() => handleRemove(a.id)}>삭제</Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const DEFAULT_SECTIONS = [
  { title: "1. 기본 정보", content: "" },
  { title: "2. 의뢰 사유 및 검사 목적", content: "" },
  { title: "3. 검사 행동 관찰", content: "" },
  { title: "4. 검사 결과 분석", content: "" },
  { title: "5. 종합 소견 및 권고사항", content: "" },
]

function ReportSection({ clientId, client, report, onRefresh }: {
  clientId: number
  client: ClientItem
  report: { sections: ReportSection[]; updated_at: string | null }
  onRefresh: () => void
}) {
  const [editing, setEditing] = React.useState(false)
  const [sections, setSections] = React.useState<ReportSection[]>([])
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (report.sections.length > 0) {
      setSections(report.sections)
    } else {
      const autoInfo = [
        `피검사자명: ${client.name}`,
        `성별/연령: ${genderLabel(client.gender)}${client.birth_day ? `, ${ageText(client.birth_day)}` : ""}`,
        `검사일자: ${report.updated_at ? report.updated_at.slice(0, 10) : ""}`,
      ].join("\n")
      setSections(DEFAULT_SECTIONS.map((s, i) => i === 0 ? { ...s, content: autoInfo } : s))
    }
  }, [report, client])

  async function handleSave() {
    setSaving(true)
    try {
      await apiFetch(`/api/admin/clients/${clientId}/report`, {
        method: "PUT",
        body: JSON.stringify({ sections }),
      })
      setEditing(false); onRefresh()
    } finally { setSaving(false) }
  }

  function updateSection(idx: number, field: "title" | "content", value: string) {
    setSections((prev) => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s))
  }

  const hasContent = report.sections.length > 0

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">종합평가 보고서</h3>
        <div className="flex gap-2">
          {hasContent && (
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5"
              onClick={() => window.print()}>
              <IconFileText className="size-3.5" />PDF 출력
            </Button>
          )}
          {!editing ? (
            <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => setEditing(true)}>
              <IconEdit className="size-3.5" />수정하기
            </Button>
          ) : (
            <div className="flex gap-1.5">
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setEditing(false)}>취소</Button>
              <Button size="sm" className="h-8 text-xs" disabled={saving} onClick={handleSave}>
                {saving ? "저장 중..." : "저장"}
              </Button>
            </div>
          )}
        </div>
      </div>

      {editing ? (
        <div className="flex flex-col gap-4">
          {sections.map((s, i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <input
                className="h-8 rounded border border-input bg-background px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={s.title}
                onChange={(e) => updateSection(i, "title", e.target.value)}
              />
              <textarea
                rows={5}
                className="w-full rounded border border-input bg-background px-3 py-2 text-sm resize-y focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={s.content}
                onChange={(e) => updateSection(i, "content", e.target.value)}
                placeholder={s.title + " 내용 입력..."}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border bg-background p-5 space-y-5 text-sm leading-relaxed">
          <h4 className="text-base font-semibold text-center">심리평가 종합 보고서</h4>
          {sections.map((s, i) => (
            <div key={i}>
              <p className="font-semibold mb-1">{s.title}</p>
              <p className="whitespace-pre-wrap text-foreground/80">{s.content || <span className="text-muted-foreground italic">내용 없음</span>}</p>
            </div>
          ))}
          {!hasContent && (
            <p className="text-center text-muted-foreground text-xs py-4">
              아직 작성된 보고서가 없습니다. "수정하기"를 눌러 작성해주세요.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

export function ClientDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [client, setClient] = React.useState<ClientItem | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [allGroups, setAllGroups] = React.useState<GroupOption[]>([])
  const [allTests, setAllTests] = React.useState<CustomTestOption[]>([])
  const [showAssign, setShowAssign] = React.useState(false)
  const [editingMemo, setEditingMemo] = React.useState(false)
  const [memoDraft, setMemoDraft] = React.useState("")
  const [savingMemo, setSavingMemo] = React.useState(false)

  const load = React.useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const data = await apiFetch(`/api/admin/clients/${id}`)
      const item: ClientItem = data.item || data
      setClient(item)
      setMemoDraft(item.memo || "")
    } catch {
      // ignore
    } finally { setLoading(false) }
  }, [id])

  React.useEffect(() => { load() }, [load])

  React.useEffect(() => {
    apiFetch("/api/admin/client-groups").then((d) => setAllGroups(d.items ?? [])).catch(() => {})
    apiFetch("/api/admin/custom-tests").then((d) => setAllTests(d.items ?? [])).catch(() => {})
  }, [])

  async function patchClient(fields: Partial<{
    name: string; gender: string; birth_day: string | null
    phone: string; address: string; is_closed: boolean; tags: string[]; memo: string
  }>) {
    if (!client) return
    await apiFetch(`/api/admin/clients/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        name: client.name,
        gender: client.gender,
        birth_day: client.birth_day,
        phone: client.phone,
        address: client.address,
        is_closed: client.is_closed,
        tags: client.tags,
        memo: client.memo,
        ...fields,
      }),
    })
    await load()
  }

  async function handleToggleClosed() {
    await patchClient({ is_closed: !client?.is_closed })
  }

  async function handleSaveMemo() {
    setSavingMemo(true)
    try { await patchClient({ memo: memoDraft }); setEditingMemo(false) } finally { setSavingMemo(false) }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-24 text-sm text-muted-foreground p-6">불러오는 중...</div>
  }

  if (!client) {
    return <div className="p-6 text-sm text-destructive">내담자를 찾을 수 없습니다.</div>
  }

  const age = ageText(client.birth_day)
  const inProgressLogs = client.assessment_logs.filter((l) => !l.assessed_on)
  const completedLogs = client.assessment_logs.filter((l) => !!l.assessed_on)

  return (
    <div className="flex flex-col gap-6 p-6 overflow-auto">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="size-8" onClick={() => navigate("/admin/clients")}>
          <IconArrowLeft className="size-4" />
        </Button>
        <nav className="text-xs text-muted-foreground">
          내담자 관리 <span className="mx-1">&gt;</span> 피검사자 상세 정보
        </nav>
        <Button variant="outline" size="sm" className="ml-auto h-8 text-xs" onClick={() => navigate("/admin/clients")}>
          목록으로
        </Button>
      </div>

      {/* 프로필 카드 */}
      <div className="rounded-xl border bg-white shadow-sm p-5 flex flex-col gap-4">
        {/* 이름/성별/나이 + 액션 버튼 */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold">{client.name}</h2>
              <span className="text-sm text-muted-foreground">
                {genderLabel(client.gender)}
                {client.birth_day && `, ${client.birth_day}`}
                {age && ` (${age})`}
              </span>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => setShowAssign(!showAssign)}>
              검사 예약
            </Button>
            <Button size="sm" className="h-9 gap-1.5" asChild>
              <Link to={`/admin/clients/${id}/result`}>검사 실시</Link>
            </Button>
          </div>
        </div>

        {/* 필드 그리드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
          <div>
            <FieldRow label="그룹">
              <GroupsSection
                clientId={client.id}
                groups={client.groups}
                allGroups={allGroups}
                onRefresh={load}
              />
            </FieldRow>
            <FieldRow label="등록일">
              <span>{new Date(client.created_at).toLocaleDateString("ko-KR")}</span>
            </FieldRow>
            <EditableField label="연락처" value={client.phone} onSave={(v) => patchClient({ phone: v })} />
            <EditableField label="주소" value={client.address} onSave={(v) => patchClient({ address: v })} />
          </div>
          <div>
            <FieldRow label="종결 여부">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleToggleClosed}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${client.is_closed ? "bg-gray-400" : "bg-primary"}`}
                >
                  <span className={`inline-block size-4 rounded-full bg-white shadow transition-transform ${client.is_closed ? "translate-x-4" : "translate-x-0.5"}`} />
                </button>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${client.is_closed ? "bg-gray-100 text-gray-600" : "bg-blue-50 text-blue-700"}`}>
                  {client.is_closed ? "종결" : "진행중"}
                </span>
              </div>
            </FieldRow>
          </div>
        </div>

        {/* 태그 */}
        <div className="pt-1 border-t border-border/50">
          <div className="grid grid-cols-[100px_1fr] gap-2 items-start py-2">
            <span className="text-xs text-muted-foreground pt-1">태그</span>
            <TagsSection
              tags={client.tags}
              onUpdate={(tags) => patchClient({ tags })}
            />
          </div>
        </div>

        {/* 비고 */}
        <div className="pt-1 border-t border-border/50">
          <div className="grid grid-cols-[100px_1fr] gap-2 items-start py-2">
            <span className="text-xs text-muted-foreground pt-0.5">비고</span>
            {editingMemo ? (
              <div className="flex flex-col gap-2">
                <textarea
                  rows={3}
                  className="w-full rounded border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={memoDraft}
                  onChange={(e) => setMemoDraft(e.target.value)}
                  autoFocus
                />
                <div className="flex gap-1.5">
                  <Button size="sm" className="h-7 text-xs" disabled={savingMemo} onClick={handleSaveMemo}>저장</Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setMemoDraft(client.memo); setEditingMemo(false) }}>취소</Button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-1.5 group">
                <span className="flex-1 text-sm">{client.memo || <span className="text-muted-foreground">—</span>}</span>
                <button onClick={() => setEditingMemo(true)} className="opacity-0 group-hover:opacity-100 mt-0.5 transition-opacity p-0.5 rounded hover:bg-muted">
                  <IconEdit className="size-3.5 text-muted-foreground" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 검사 배정 (토글) */}
        {showAssign && (
          <div className="pt-3 border-t border-border/50">
            <h3 className="text-sm font-semibold mb-3">검사 배정</h3>
            <AssignmentSection
              clientId={client.id}
              assigned={client.assigned_custom_tests}
              allTests={allTests}
              onRefresh={load}
            />
          </div>
        )}
      </div>

      {/* 검사결과 섹션 */}
      <div className="rounded-xl border bg-white shadow-sm p-5">
        <h3 className="font-semibold text-sm mb-4">검사결과</h3>

        {client.assessment_logs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">아직 검사 기록이 없습니다.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {inProgressLogs.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-2">응시중 검사</p>
                <div className="flex flex-wrap gap-2">
                  {inProgressLogs.map((log) => (
                    <Badge key={log.id} variant="secondary" className="text-xs">{log.custom_test_name}</Badge>
                  ))}
                </div>
              </div>
            )}
            {completedLogs.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-2">완료된 검사</p>
                <div className="flex flex-col divide-y rounded-lg border">
                  {completedLogs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="text-xs shrink-0">{log.custom_test_name}</Badge>
                        <span className="text-sm text-muted-foreground">{log.assessed_on}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
                          <Link to={`/admin/report/${log.id}`}>결과 확인</Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 종합평가 보고서 섹션 */}
      <div className="rounded-xl border bg-white shadow-sm p-5">
        <ReportSection
          clientId={client.id}
          client={client}
          report={client.report}
          onRefresh={load}
        />
      </div>
    </div>
  )
}
