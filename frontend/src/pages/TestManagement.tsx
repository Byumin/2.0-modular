import * as React from "react"
import { useNavigate } from "react-router-dom"
import { IconCheck, IconChevronDown, IconChevronLeft, IconChevronRight, IconLink, IconPlus, IconSearch, IconTrash, IconX } from "@tabler/icons-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

interface CustomTest {
  id: number
  custom_test_name: string
  test_id: string
  scale_count: number
  assigned_count: number
  assessed_count: number
  status: string
  progress_status: string
  created_at: string
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

type ManagementTab = "custom-tests" | "status"

interface CatalogScale {
  code: string
  name?: string
  item_ids?: string[]
}

interface CatalogScaleNode {
  code: string
  name?: string
  path?: string[]
  item_ids?: string[]
  children?: CatalogScaleNode[]
}

interface CatalogSubTest {
  sub_test_json: string
  display_name?: string
  item_count?: number
  age_label?: string
  scales?: CatalogScale[]
  scale_tree?: CatalogScaleNode[]
}

interface CatalogTest {
  test_id: string
  sub_tests?: CatalogSubTest[]
}

interface CatalogResponse {
  tests?: CatalogTest[]
}

type FieldType = "short_text" | "long_text" | "number" | "date" | "select" | "multi_select" | "phone" | "email"

interface ProfileField {
  local_id: string
  label: string
  type: FieldType
  required: boolean
  placeholder: string
  options: string[]
}

interface SessionDraft {
  local_id: string
  title: string
  description: string
}

interface ScaleTreeItem {
  key: string
  test_id: string
  sub_test_json: string
  sub_test_jsons: string[]
  code: string
  name: string
  label: string
  path: string[]
  condition_label: string
  item_count: number
  source_keys: string[]
  children: ScaleTreeItem[]
}

interface ScaleGroupItem {
  key: string
  test_id: string
  sub_test_json: string
  code: string
  name: string
  label: string
  path: string[]
  condition_label: string
  item_count: number
}

interface ScaleGroup {
  test_id: string
  scales: ScaleGroupItem[]
  tree: ScaleTreeItem[]
}

interface MissingVariant {
  test_id: string
  label: string
  available_scale_codes: string[]
}

interface CreatePayload {
  custom_test_name: string
  client_intake_mode: string
  requires_consent: boolean
  test_configs: Array<{
    test_id: string
    selected_scale_codes: string[]
    excluded_sub_test_jsons: string[]
  }>
  session_configs: Array<{
    session_id: string
    title: string
    description: string
    test_ids: string[]
  }>
  additional_profile_fields: Array<{
    label: string
    type: FieldType
    required: boolean
    placeholder: string
    options: string[]
  }>
}

const progressVariant = (p: string): "secondary" | "success" | "warning" | "destructive" => {
  if (p === "종료") return "secondary"
  if (p === "실시") return "success"
  return "warning"
}

const fieldTypes: Array<{ value: FieldType; label: string }> = [
  { value: "short_text", label: "짧은 텍스트" },
  { value: "long_text", label: "긴 텍스트" },
  { value: "number", label: "숫자" },
  { value: "date", label: "날짜" },
  { value: "select", label: "단일 선택" },
  { value: "multi_select", label: "다중 선택" },
  { value: "phone", label: "전화번호" },
  { value: "email", label: "이메일" },
]

function isOptionType(type: FieldType) {
  return type === "select" || type === "multi_select"
}

const INFORMANT_LABEL: Record<string, string> = {
  mother: "어머니",
  father: "아버지",
  etc: "기타",
}

function informantSuffix(subTestJson: string): string {
  try {
    const parsed = JSON.parse(subTestJson)
    const informants: string[] = parsed?.informant ?? []
    if (informants.length === 0) return ""
    const labels = informants.map((v) => INFORMANT_LABEL[v] ?? v)
    return ` (관찰자: ${labels.join("·")})`
  } catch {
    return ""
  }
}

function scaleKey(testId: string, subTestJson: string, path: string[]) {
  return `${testId}::${subTestJson}::${path.join("/")}`
}

function describeSubTest(subTest: CatalogSubTest) {
  const parts = [
    subTest.display_name || "실시구간",
    subTest.age_label || "연령/학령 정보 없음",
    Number.isFinite(subTest.item_count) ? `${subTest.item_count}문항` : "",
  ].filter(Boolean)
  return parts.join(" | ")
}

function ageStartFromSubTest(subTest: CatalogSubTest) {
  try {
    const parsed = JSON.parse(subTest.sub_test_json || "{}")
    const ageRange = parsed?.age_range
    const ageRangeStart = ageRange?.start_inclusive
    if (Array.isArray(ageRangeStart) && Number.isFinite(Number(ageRangeStart[0]))) return Number(ageRangeStart[0])
    const schoolAgeRange = parsed?.school_age_range
    const schoolAgeRangeStart = schoolAgeRange?.start_inclusive
    if (Array.isArray(schoolAgeRangeStart) && Number.isFinite(Number(schoolAgeRangeStart[0]))) return Number(schoolAgeRangeStart[0])
    const age = parsed?.age
    if (Array.isArray(age) && Number.isFinite(Number(age[0]))) return Number(age[0])
    if (Number.isFinite(Number(age))) return Number(age)
  } catch {
    // Fall back to the display label below.
  }
  const label = subTest.age_label || ""
  const match = label.match(/-?\d+/)
  return match ? Number(match[0]) : Number.MAX_SAFE_INTEGER
}

function combineConditionLabels(labels: string[]) {
  const unique = [...new Set(labels.filter(Boolean))]
  if (unique.length <= 1) return unique[0] || "연령/학령 정보 없음"
  return unique.join(", ")
}

function collectScaleGroups(catalog: CatalogTest[], testIds: string[]): ScaleGroup[] {
  const flattenTree = (items: ScaleTreeItem[]): ScaleGroupItem[] => {
    const flattened: ScaleGroupItem[] = []
    items.forEach((item) => {
      if (item.children.length > 0) {
        flattened.push(...flattenTree(item.children))
        return
      }
      const sourceKeys = item.source_keys.length ? item.source_keys : [item.key]
      sourceKeys.forEach((key, index) => {
        flattened.push({
          key,
          test_id: item.test_id,
          sub_test_json: item.sub_test_jsons[index] ?? item.sub_test_json,
          code: item.code,
          name: item.name,
          label: item.label,
          path: item.path,
          condition_label: item.condition_label,
          item_count: item.item_count,
        })
      })
    })
    return flattened
  }

  const buildTreeItems = (
    testId: string,
    subTests: CatalogSubTest[],
    nodes: CatalogScaleNode[],
    parentPath: string[] = []
  ): ScaleTreeItem[] => {
    const conditionLabel = combineConditionLabels(subTests.map((subTest) => subTest.age_label || describeSubTest(subTest)))
    return nodes
      .map((node) => {
        const code = String(node.code || "").trim()
        if (!code) return null
        const path = node.path?.length ? node.path.map(String) : [...parentPath, code]
        const children = buildTreeItems(testId, subTests, node.children ?? [], path)
        const name = node.name || code
        const itemCount = Array.isArray(node.item_ids) ? node.item_ids.length : 0
        const sourceKeys = subTests.map((subTest) => scaleKey(testId, subTest.sub_test_json, path))
        return {
          key: `${testId}::${subTests.map((subTest) => subTest.sub_test_json).join("||")}::${path.join("/")}`,
          test_id: testId,
          sub_test_json: subTests[0]?.sub_test_json ?? "",
          sub_test_jsons: subTests.map((subTest) => subTest.sub_test_json),
          code,
          name,
          label: `${name} (${code})`,
          path,
          condition_label: conditionLabel,
          item_count: itemCount,
          source_keys: children.length > 0 ? [] : sourceKeys,
          children,
        }
      })
      .filter((item): item is ScaleTreeItem => Boolean(item))
  }

  return testIds
    .map((testId) => {
      const test = catalog.find((item) => item.test_id === testId)
      if (!test?.sub_tests?.length) return null

      const tree: ScaleTreeItem[] = []
      ;[...test.sub_tests]
        .sort((a, b) => {
          const ageOrder = ageStartFromSubTest(a) - ageStartFromSubTest(b)
          if (ageOrder !== 0) return ageOrder
          return a.sub_test_json.localeCompare(b.sub_test_json)
        })
        .forEach((subTest): void => {
          const nodes = subTest.scale_tree?.length
            ? subTest.scale_tree
            : (subTest.scales ?? []).map((scale) => ({
                code: scale.code,
                name: scale.name,
                item_ids: scale.item_ids,
                children: [],
              }))
          const conditionLabel = (subTest.age_label || describeSubTest(subTest)) + informantSuffix(subTest.sub_test_json)
          tree.push({
            key: `${testId}::${subTest.sub_test_json}`,
            test_id: testId,
            sub_test_json: subTest.sub_test_json,
            sub_test_jsons: [subTest.sub_test_json],
            code: subTest.sub_test_json,
            name: conditionLabel,
            label: conditionLabel,
            path: [],
            condition_label: conditionLabel,
            item_count: Number.isFinite(subTest.item_count) ? Number(subTest.item_count) : 0,
            source_keys: [],
            children: buildTreeItems(testId, [subTest], nodes),
          })
        })

      const scales = flattenTree(tree).sort((a, b) => {
        const conditionOrder = a.condition_label.localeCompare(b.condition_label)
        if (conditionOrder !== 0) return conditionOrder
        return a.path.join("/").localeCompare(b.path.join("/"))
      })

      return { test_id: testId, scales, tree }
    })
    .filter((item): item is ScaleGroup => Boolean(item))
}

function normalizeClientIntakeMode(value: string) {
  return value === "auto_create" ? "auto_create" : "pre_registered_only"
}

const CREATE_STEPS = [
  { id: 1, key: "basic",    title: "기본 정보",    hint: "이름과 운영 옵션" },
  { id: 2, key: "tests",    title: "검사 선택",    hint: "포함할 검사군" },
  { id: 3, key: "sessions", title: "세션 구성",    hint: "검사를 세션에 배정" },
  { id: 4, key: "scales",   title: "척도 선택",    hint: "사용할 척도 트리" },
  { id: 5, key: "profile",  title: "추가 인적사항", hint: "URL에서 받을 항목" },
] as const

async function copyTextWithPromptFallback(value: string) {
  try {
    await navigator.clipboard.writeText(value)
    alert("URL이 클립보드에 복사되었습니다.")
  } catch {
    window.prompt("클립보드 복사가 차단되었습니다. 아래 URL을 복사하세요.", value)
  }
}

export function TestManagement() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = React.useState<ManagementTab>("custom-tests")
  const [tests, setTests] = React.useState<CustomTest[]>([])
  const [testOverviewItems, setTestOverviewItems] = React.useState<TestOverviewItem[]>([])
  const [search, setSearch] = React.useState("")
  const [loading, setLoading] = React.useState(true)
  const [overviewLoading, setOverviewLoading] = React.useState(false)
  const [generatingId, setGeneratingId] = React.useState<number | null>(null)
  const [catalog, setCatalog] = React.useState<CatalogTest[]>([])
  const [showCreateModal, setShowCreateModal] = React.useState(false)
  const [createName, setCreateName] = React.useState("")
  const [createIntakeMode, setCreateIntakeMode] = React.useState("pre_registered_only")
  const [createRequiresConsent, setCreateRequiresConsent] = React.useState(false)
  const [createMessage, setCreateMessage] = React.useState<{ text: string; error: boolean } | null>(null)
  const [catalogMessage, setCatalogMessage] = React.useState("")
  const [creating, setCreating] = React.useState(false)
  const [selectedTestIds, setSelectedTestIds] = React.useState<string[]>([])
  const [expandedTestIds, setExpandedTestIds] = React.useState<Set<string>>(new Set())
  const [expandedScaleNodeKeys, setExpandedScaleNodeKeys] = React.useState<Set<string>>(new Set())
  const [allScaleTestIds, setAllScaleTestIds] = React.useState<Set<string>>(new Set())
  const [selectedScaleKeys, setSelectedScaleKeys] = React.useState<Set<string>>(new Set())
  const [sessionsDraft, setSessionsDraft] = React.useState<SessionDraft[]>([
    { local_id: "session_1", title: "세션 1", description: "표준화된 검사 안내를 확인한 뒤 응답을 시작합니다." },
  ])
  const [testSessionMap, setTestSessionMap] = React.useState<Record<string, string>>({})
  const [draggingTestId, setDraggingTestId] = React.useState<string | null>(null)
  const [profileFields, setProfileFields] = React.useState<ProfileField[]>([])
  const [pendingPayload, setPendingPayload] = React.useState<CreatePayload | null>(null)
  const [missingVariants, setMissingVariants] = React.useState<MissingVariant[]>([])
  const [createStep, setCreateStep] = React.useState(1)

  const scaleGroups = React.useMemo(
    () => collectScaleGroups(catalog, selectedTestIds),
    [catalog, selectedTestIds]
  )
  const createSummary = React.useMemo(() => {
    const selectedScaleCount = scaleGroups.reduce(
      (total, group) => total + group.scales.filter((scale) => selectedScaleKeys.has(scale.key)).length,
      0
    )
    let includedVariantCount = 0
    let excludedVariantCount = 0
    let estimatedItemCount = 0

    selectedTestIds.forEach((testId) => {
      const test = catalog.find((item) => item.test_id === testId)
      const selectedScales = (
        (scaleGroups.find((group) => group.test_id === testId)?.scales ?? [])
          .filter((scale) => selectedScaleKeys.has(scale.key))
      )

      ;(test?.sub_tests ?? []).forEach((subTest) => {
        const hasSelectedScale = selectedScales.some((scale) => scale.sub_test_json === subTest.sub_test_json)
        if (hasSelectedScale) {
          includedVariantCount += 1
          if (Number.isFinite(subTest.item_count)) {
            estimatedItemCount += Number(subTest.item_count)
          }
        } else {
          excludedVariantCount += 1
        }
      })
    })

    return {
      selectedTestCount: selectedTestIds.length,
      selectedScaleCount,
      includedVariantCount,
      excludedVariantCount,
      estimatedItemCount,
      sessionCount: sessionsDraft.filter((session) =>
        selectedTestIds.some((testId) => testSessionMap[testId] === session.local_id)
      ).length || (selectedTestIds.length ? 1 : 0),
      profileFieldCount: profileFields.length,
    }
  }, [catalog, profileFields.length, scaleGroups, selectedScaleKeys, selectedTestIds, sessionsDraft, testSessionMap])

  const fetchTests = React.useCallback(() => {
    if (activeTab !== "custom-tests") return
    setLoading(true)
    const qs = search ? `q=${encodeURIComponent(search)}` : ""
    fetch(`/api/admin/custom-tests/management${qs ? `?${qs}` : ""}`)
      .then((r) => r.json())
      .then((data) => setTests(data.items ?? []))
      .catch(() => setTests([]))
      .finally(() => setLoading(false))
  }, [activeTab, search])

  const fetchTestOverview = React.useCallback(() => {
    if (activeTab !== "status") return
    setOverviewLoading(true)
    const qs = search ? `q=${encodeURIComponent(search)}` : ""
    fetch(`/api/admin/client-test-overview${qs ? `?${qs}` : ""}`)
      .then((r) => r.json())
      .then((data) => setTestOverviewItems(data.items ?? []))
      .catch(() => setTestOverviewItems([]))
      .finally(() => setOverviewLoading(false))
  }, [activeTab, search])

  React.useEffect(() => { fetchTests() }, [fetchTests])
  React.useEffect(() => { fetchTestOverview() }, [fetchTestOverview])

  React.useEffect(() => {
    fetch("/api/admin/tests/catalog")
      .then((r) => r.ok ? r.json() : Promise.reject(new Error("로그인이 필요하거나 기반 검사 목록을 불러오지 못했습니다.")))
      .then((data: CatalogResponse) => {
        const items = data.tests ?? []
        setCatalog(items)
        setCatalogMessage(items.length ? "" : "생성 가능한 기반 검사가 없습니다.")
      })
      .catch((error) => {
        setCatalog([])
        setCatalogMessage(error instanceof Error ? error.message : "기반 검사 목록을 불러오지 못했습니다.")
      })
  }, [])

  const resetCreateForm = React.useCallback(() => {
    setCreateName("")
    setCreateIntakeMode("pre_registered_only")
    setCreateRequiresConsent(false)
    setCreateMessage(null)
    setSelectedTestIds([])
    setExpandedTestIds(new Set())
    setExpandedScaleNodeKeys(new Set())
    setAllScaleTestIds(new Set())
    setSelectedScaleKeys(new Set())
    setSessionsDraft([
      { local_id: "session_1", title: "세션 1", description: "표준화된 검사 안내를 확인한 뒤 응답을 시작합니다." },
    ])
    setTestSessionMap({})
    setDraggingTestId(null)
    setProfileFields([])
    setPendingPayload(null)
    setMissingVariants([])
    setCreateStep(1)
  }, [])

  const handleGenerateLink = async (id: number) => {
    setGeneratingId(id)
    try {
      const res = await fetch(`/api/admin/custom-tests/${id}/access-link`, { method: "POST" })
      const data = await res.json()
      if (!res.ok || !data.assessment_url) {
        alert("URL 생성에 실패했습니다.")
        return
      }
      const fullUrl = `${window.location.origin}${data.assessment_url}`
      await copyTextWithPromptFallback(fullUrl)
    } catch {
      alert("URL 생성에 실패했습니다.")
    } finally {
      setGeneratingId(null)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("이 검사를 삭제하시겠습니까?")) return
    await fetch("/api/admin/custom-tests/bulk-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ custom_test_ids: [id] }),
    })
    fetchTests()
  }

  const setTestSelected = (testId: string, checked: boolean) => {
    const group = collectScaleGroups(catalog, [testId])[0]
    const keys = group?.scales.map((scale) => scale.key) ?? []

    setSelectedTestIds((prev) => {
      if (checked) return prev.includes(testId) ? prev : [...prev, testId]
      return prev.filter((item) => item !== testId)
    })
    setTestSessionMap((prev) => {
      const next = { ...prev }
      if (checked) next[testId] = next[testId] || sessionsDraft[0]?.local_id || "session_1"
      else delete next[testId]
      return next
    })
    setAllScaleTestIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(testId)
      else next.delete(testId)
      return next
    })
    setSelectedScaleKeys((prev) => {
      const next = new Set(prev)
      keys.forEach((key) => checked ? next.add(key) : next.delete(key))
      return next
    })
  }

  const setAllScalesForTest = (testId: string, checked: boolean) => {
    const group = scaleGroups.find((item) => item.test_id === testId)
    const keys = group?.scales.map((scale) => scale.key) ?? []
    setAllScaleTestIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(testId)
      else next.delete(testId)
      return next
    })
    setSelectedScaleKeys((prev) => {
      const next = new Set(prev)
      keys.forEach((key) => {
        if (checked) next.add(key)
        else next.delete(key)
      })
      return next
    })
  }

  const setScaleSelected = (testId: string, keys: string | string[], checked: boolean) => {
    const targetKeys = Array.isArray(keys) ? keys : [keys]
    setAllScaleTestIds((prev) => {
      const next = new Set(prev)
      next.delete(testId)
      return next
    })
    setSelectedScaleKeys((prev) => {
      const next = new Set(prev)
      targetKeys.forEach((key) => {
        if (checked) next.add(key)
        else next.delete(key)
      })
      return next
    })
  }

  const addSession = () => {
    setSessionsDraft((prev) => [
      ...prev,
      {
        local_id: `session_${Date.now()}_${prev.length + 1}`,
        title: `세션 ${prev.length + 1}`,
        description: "이 세션의 검사 안내를 확인한 뒤 응답을 시작합니다.",
      },
    ])
  }

  const updateSession = (id: string, patch: Partial<SessionDraft>) => {
    setSessionsDraft((prev) => prev.map((session) => session.local_id === id ? { ...session, ...patch } : session))
  }

  const removeSession = (id: string) => {
    if (sessionsDraft.length <= 1) return
    const fallbackId = sessionsDraft.find((session) => session.local_id !== id)?.local_id || "session_1"
    setSessionsDraft((prev) => prev.filter((session) => session.local_id !== id))
    setTestSessionMap((prev) => {
      const next = { ...prev }
      Object.keys(next).forEach((testId) => {
        if (next[testId] === id) next[testId] = fallbackId
      })
      return next
    })
  }

  const setTestSession = (testId: string, sessionId: string) => {
    setTestSessionMap((prev) => ({ ...prev, [testId]: sessionId }))
  }

  const handleTestDragStart = (event: React.DragEvent<HTMLButtonElement>, testId: string) => {
    setDraggingTestId(testId)
    event.dataTransfer.effectAllowed = "move"
    event.dataTransfer.setData("text/plain", testId)
  }

  const handleSessionDrop = (event: React.DragEvent<HTMLDivElement>, sessionId: string) => {
    event.preventDefault()
    const testId = event.dataTransfer.getData("text/plain") || draggingTestId
    if (!testId || !selectedTestIds.includes(testId)) return
    setTestSession(testId, sessionId)
    setDraggingTestId(null)
  }

  const toggleScaleNode = (key: string) => {
    setExpandedScaleNodeKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const updateProfileField = (id: string, patch: Partial<ProfileField>) => {
    setProfileFields((prev) => prev.map((field) => {
      if (field.local_id !== id) return field
      const next = { ...field, ...patch }
      if (patch.type) {
        next.options = isOptionType(patch.type) ? (field.options.length ? field.options : [""]) : []
      }
      return next
    }))
  }

  const buildCreatePayload = (): { requestBody: CreatePayload; missing: MissingVariant[] } => {
    if (!createName.trim()) throw new Error("검사 이름을 입력해주세요.")
    if (!selectedTestIds.length) throw new Error("최소 1개 이상의 검사를 선택해주세요.")
    if (!selectedScaleKeys.size) throw new Error("최소 1개 이상의 척도를 선택해주세요.")

    const selectedByTest = new Map<string, Map<string, Set<string>>>()
    scaleGroups.forEach((group) => {
      group.scales.forEach((scale) => {
        if (!selectedScaleKeys.has(scale.key)) return
        const bySubTest = selectedByTest.get(group.test_id) ?? new Map<string, Set<string>>()
        const codes = bySubTest.get(scale.sub_test_json) ?? new Set<string>()
        codes.add(scale.code)
        bySubTest.set(scale.sub_test_json, codes)
        selectedByTest.set(group.test_id, bySubTest)
      })
    })

    const missing: MissingVariant[] = []
    const test_configs = selectedTestIds
      .map((testId) => {
        const test = catalog.find((item) => item.test_id === testId)
        const selectedBySubTest = selectedByTest.get(testId) ?? new Map<string, Set<string>>()
        const selectedCodes = [...new Set([...selectedBySubTest.values()].flatMap((codes) => [...codes]))]
        const excluded_sub_test_jsons: string[] = []

        ;(test?.sub_tests ?? []).forEach((subTest) => {
          const availableCodes = [...new Set(
            (scaleGroups.find((group) => group.test_id === testId)?.scales ?? [])
              .filter((scale) => scale.sub_test_json === subTest.sub_test_json)
              .map((scale) => String(scale.code || "").trim())
              .filter(Boolean)
          )]
          const matchedCodes = [...(selectedBySubTest.get(subTest.sub_test_json) ?? new Set<string>())]
          if (matchedCodes.length === 0) {
            excluded_sub_test_jsons.push(subTest.sub_test_json)
            missing.push({
              test_id: testId,
              label: `${testId} / ${subTest.age_label || describeSubTest(subTest)}`,
              available_scale_codes: availableCodes,
            })
          }
        })

        if ((test?.sub_tests ?? []).length > 0 && excluded_sub_test_jsons.length === (test?.sub_tests ?? []).length) {
          throw new Error(`${testId}: 선택한 척도로 생성 가능한 실시구간이 없습니다.`)
        }

        return {
          test_id: testId,
          selected_scale_codes: selectedCodes,
          excluded_sub_test_jsons,
        }
      })
      .filter((config) => config.selected_scale_codes.length > 0)

    if (!test_configs.length) throw new Error("검사별로 최소 1개 이상의 척도를 선택해주세요.")

    const session_configs = sessionsDraft
      .map((session, index) => {
        const title = session.title.trim() || `세션 ${index + 1}`
        const test_ids = selectedTestIds.filter((testId) => testSessionMap[testId] === session.local_id)
        return {
          session_id: `session_${index + 1}`,
          title,
          description: session.description.trim(),
          test_ids,
        }
      })
      .filter((session) => session.test_ids.length > 0)

    if (!session_configs.length) {
      throw new Error("선택한 검사를 담을 세션이 필요합니다.")
    }

    const seen = new Set<string>()
    const additional_profile_fields = profileFields.map((field) => {
      const label = field.label.trim()
      if (!label) throw new Error("추가 인적사항 항목명은 비워둘 수 없습니다.")
      const key = label.toLowerCase()
      if (seen.has(key)) throw new Error(`추가 인적사항 항목명 "${label}" 이(가) 중복됩니다.`)
      seen.add(key)

      const options = [...new Set(field.options.map((option) => option.trim()).filter(Boolean))]
      if (isOptionType(field.type) && options.length === 0) {
        throw new Error(`"${label}" 항목은 선택지를 최소 1개 이상 입력해야 합니다.`)
      }

      return {
        label,
        type: field.type,
        required: field.required,
        placeholder: field.placeholder.trim(),
        options: isOptionType(field.type) ? options : [],
      }
    })

    return {
      requestBody: {
        custom_test_name: createName.trim(),
        client_intake_mode: normalizeClientIntakeMode(createIntakeMode),
        requires_consent: createRequiresConsent,
        test_configs,
        session_configs,
        additional_profile_fields,
      },
      missing,
    }
  }

  const submitPayload = async (payload: CreatePayload) => {
    setCreating(true)
    setCreateMessage(null)
    try {
      const res = await fetch("/api/admin/custom-tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail || "검사 생성에 실패했습니다.")
      }
      setShowCreateModal(false)
      resetCreateForm()
      fetchTests()
    } catch (error) {
      setCreateMessage({ text: error instanceof Error ? error.message : "검사 생성에 실패했습니다.", error: true })
    } finally {
      setCreating(false)
    }
  }

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    try {
      const { requestBody, missing } = buildCreatePayload()
      if (missing.length) {
        setPendingPayload(requestBody)
        setMissingVariants(missing)
        return
      }
      await submitPayload(requestBody)
    } catch (error) {
      setCreateMessage({ text: error instanceof Error ? error.message : "검사 생성에 실패했습니다.", error: true })
    }
  }

  const addProfileField = () => {
    setProfileFields((prev) => [
      ...prev,
      {
        local_id: `field_${Date.now()}_${prev.length + 1}`,
        label: "",
        type: "short_text",
        required: false,
        placeholder: "",
        options: [],
      },
    ])
  }

  const searchPlaceholder = "검사명·기반 검사 검색..."

  const tabs: Array<{ value: ManagementTab; label: string }> = [
    { value: "custom-tests", label: "커스텀 검사" },
    { value: "status", label: "실시 현황" },
  ]

  const renderScaleNodes = (group: ScaleGroup, nodes: ScaleTreeItem[], depth = 0): React.ReactNode => {
    return nodes.map((node) => {
      const hasChildren = node.children.length > 0
      const isExpanded = expandedScaleNodeKeys.has(node.key)
      const selectableKeys = node.source_keys.length ? node.source_keys : [node.key]
      const isSelected = selectableKeys.every((key) => selectedScaleKeys.has(key))
      const itemCountLabel = node.item_count > 0 ? `${node.item_count}문항` : ""
      return (
        <div key={node.key} className="space-y-0.5">
          <div
            className="flex min-h-7 items-center gap-1.5 rounded px-1.5 py-1 text-xs hover:bg-muted/50"
            style={{ paddingLeft: `${4 + depth * 14}px` }}
          >
            {hasChildren ? (
              <button
                type="button"
                className="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-background hover:text-foreground"
                onClick={() => toggleScaleNode(node.key)}
                aria-label={isExpanded ? `${node.label} 접기` : `${node.label} 펼치기`}
              >
                {isExpanded ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
              </button>
            ) : (
              <span className="size-5 shrink-0" />
            )}

            {hasChildren ? (
              <button
                type="button"
                className="min-w-0 flex-1 text-left font-medium"
                onClick={() => toggleScaleNode(node.key)}
              >
                <span className="block truncate">{node.label}</span>
              </button>
            ) : (
              <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-2">
                <input
                  type="checkbox"
                  className="mt-0.5 size-3.5"
                  checked={isSelected}
                  disabled={allScaleTestIds.has(group.test_id)}
                  onChange={(e) => setScaleSelected(group.test_id, selectableKeys, e.target.checked)}
                />
                <span className="min-w-0">
                  <span className="block break-words">{node.label}</span>
                  {itemCountLabel && (
                    <span className="block text-[11px] leading-4 text-muted-foreground">{itemCountLabel}</span>
                  )}
                </span>
              </label>
            )}
          </div>
          {hasChildren && isExpanded && (
            <div className="space-y-0.5">
              {renderScaleNodes(group, node.children, depth + 1)}
            </div>
          )}
        </div>
      )
    })
  }

  return (
    <div className="flex flex-col gap-6 overflow-auto p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">검사 관리</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">맞춤형 검사를 생성하고 관리합니다</p>
        </div>
        {activeTab === "custom-tests" && (
          <Button size="sm" onClick={() => setShowCreateModal(true)}>
            <IconPlus className="size-4" />
            검사 생성
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex overflow-hidden rounded-md border text-xs">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              className={`border-l px-3 py-1.5 first:border-l-0 ${
                activeTab === tab.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:bg-muted"
              }`}
              onClick={() => {
                setActiveTab(tab.value)
                setSearch("")
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full max-w-sm">
          <IconSearch className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {activeTab === "custom-tests" && (
      <Card className="py-0 gap-0">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              불러오는 중...
            </div>
          ) : tests.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              등록된 검사가 없습니다.
            </div>
          ) : (
            <>
              <div className="hidden grid-cols-[2fr_1fr_1fr_1fr_1fr_152px] gap-2 border-b-2 px-4 h-10 text-xs font-medium text-foreground items-center content-center bg-muted md:grid">
                <span className="text-center">검사명</span>
                <span className="text-center">기반 검사</span>
                <span className="text-center">척도 수</span>
                <span className="text-center">배정 / 실시</span>
                <span className="text-center">진행 상태</span>
                <span></span>
              </div>
              <div className="divide-y">
                {tests.map((test) => (
                  <div
                    key={test.id}
                    className="grid grid-cols-1 items-center gap-2 px-4 py-3 hover:bg-muted/40 md:grid-cols-[2fr_1fr_1fr_1fr_1fr_152px]"
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-sm font-medium text-center">{test.custom_test_name}</span>
                      <span className="text-xs text-muted-foreground text-center">
                        {new Date(test.created_at).toLocaleDateString("ko-KR")} 생성
                      </span>
                    </div>
                    <span className="text-sm text-muted-foreground text-center">{test.test_id}</span>
                    <span className="text-sm text-center">척도 {test.scale_count}개</span>
                    <span className={`text-sm text-center ${test.assigned_count === 0 ? "text-yellow-600" : ""}`}>
                      {test.assigned_count} / {test.assessed_count}
                    </span>
                    <div className="flex items-center justify-center gap-1">
                      <Badge variant={test.status === "운영중" ? "success" : "secondary"}>
                        {test.status}
                      </Badge>
                      <Badge variant={progressVariant(test.progress_status)}>
                        {test.progress_status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        disabled={generatingId === test.id}
                        onClick={() => handleGenerateLink(test.id)}
                      >
                        <IconLink className="size-3" />
                        {generatingId === test.id ? "생성 중..." : "URL"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => navigate(`/admin/create/${test.id}`)}
                      >
                        상세
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(test.id)}
                      >
                        <IconTrash className="size-3" />
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

      {activeTab === "status" && (
        <Card className="py-0 gap-0">
          <CardContent className="p-0">
            {overviewLoading ? (
              <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                불러오는 중...
              </div>
            ) : testOverviewItems.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                조건에 맞는 실시 현황이 없습니다.
              </div>
            ) : (
              <>
                <div className="hidden grid-cols-[2fr_1.2fr_0.7fr_0.7fr_0.7fr_1fr] gap-2 border-b-2 px-4 h-10 text-xs font-medium text-foreground items-center content-center bg-muted md:grid">
                  <span className="text-center">검사명</span>
                  <span className="text-center">기반 검사</span>
                  <span className="text-center">배정</span>
                  <span className="text-center">미실시</span>
                  <span className="text-center">실시완료</span>
                  <span className="text-center">마지막 실시일</span>
                </div>
                <div className="divide-y">
                  {testOverviewItems.map((item) => (
                    <div
                      key={item.custom_test_id}
                      className="grid grid-cols-1 items-center gap-2 px-4 py-3 hover:bg-muted/40 md:grid-cols-[2fr_1.2fr_0.7fr_0.7fr_0.7fr_1fr]"
                    >
                      <span className="text-sm font-medium text-center">{item.custom_test_name}</span>
                      <span className="text-sm text-muted-foreground text-center">{item.parent_test_name ?? "—"}</span>
                      <span className="text-sm text-center">{item.assigned_count}명</span>
                      <span className="text-sm text-yellow-700 text-center">{item.not_started_count}명</span>
                      <span className="text-sm text-green-700 text-center">{item.completed_count}명</span>
                      <span className="text-sm text-muted-foreground text-center">{item.last_assessed_on ?? "—"}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}


      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
          <section className="flex h-[78vh] max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-lg border bg-card shadow-lg">

            {/* 헤더 */}
            <header className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold">검사 생성</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {CREATE_STEPS[createStep - 1].title} · 단계 {createStep}/{CREATE_STEPS.length}
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setShowCreateModal(false); resetCreateForm() }}
                aria-label="닫기"
                className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <IconX className="size-4" />
              </button>
            </header>

            <form onSubmit={handleCreate} className="flex min-h-0 flex-1 flex-col overflow-hidden">

              {/* 2-컬럼: 단계 rail + 콘텐츠 */}
              <div className="grid min-h-0 flex-1 grid-cols-[220px_1fr] overflow-hidden">

                {/* 왼쪽 단계 rail */}
                <aside className="flex flex-col gap-2 overflow-auto border-r bg-muted/30 p-4">
                  <p className="px-1 pb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">단계</p>
                  <ol className="flex flex-col gap-1">
                    {CREATE_STEPS.map((s) => {
                      const done = s.id < createStep
                      const active = s.id === createStep
                      return (
                        <li key={s.key}>
                          <button
                            type="button"
                            onClick={() => setCreateStep(s.id)}
                            className={`flex w-full items-start gap-3 rounded-md px-2.5 py-2 text-left transition-colors ${
                              active ? "border border-border bg-white shadow-sm" : "hover:bg-white/70"
                            }`}
                          >
                            <span className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                              done ? "bg-primary text-primary-foreground" :
                              active ? "bg-foreground text-background" :
                              "border border-border bg-white text-muted-foreground"
                            }`}>
                              {done ? <IconCheck className="size-3" /> : s.id}
                            </span>
                            <span className="min-w-0">
                              <span className="block text-sm font-medium leading-tight">{s.title}</span>
                              <span className="mt-0.5 block text-[11px] text-muted-foreground">{s.hint}</span>
                            </span>
                          </button>
                        </li>
                      )
                    })}
                  </ol>
                </aside>

                {/* 단계별 콘텐츠 */}
                <div className="min-h-0 overflow-auto p-6">

                  {/* Step 1: 기본 정보 */}
                  {createStep === 1 && (
                    <div className="flex max-w-xl flex-col gap-5">
                      <div>
                        <h4 className="text-sm font-semibold leading-tight">기본 정보</h4>
                        <p className="mt-0.5 text-xs text-muted-foreground">검사 이름과 운영 방식을 정합니다.</p>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="create_custom_test_name" className="text-sm font-medium">검사 이름</label>
                        <Input
                          id="create_custom_test_name"
                          value={createName}
                          onChange={(e) => setCreateName(e.target.value)}
                          placeholder="예: STS 파일럿-초등용"
                          maxLength={120}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="create_client_intake_mode" className="text-sm font-medium">내담자 등록 방식</label>
                        <select
                          id="create_client_intake_mode"
                          value={createIntakeMode}
                          onChange={(e) => setCreateIntakeMode(e.target.value)}
                          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                        >
                          <option value="pre_registered_only">사전 등록 필수</option>
                          <option value="auto_create">검사 진행 시 자동 생성 허용</option>
                        </select>
                        <p className="text-xs text-muted-foreground">자동 생성 허용은 검사 링크에서 내담자 등록과 배정을 진행합니다.</p>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium">개인정보동의</label>
                        <label className="flex cursor-pointer items-center gap-2">
                          <input
                            type="checkbox"
                            checked={createRequiresConsent}
                            onChange={(e) => setCreateRequiresConsent(e.target.checked)}
                            className="size-4 rounded border-input"
                          />
                          <span className="text-sm">수검 전 개인정보 수집·이용 동의 받기</span>
                        </label>
                        <p className="text-xs text-muted-foreground">동의서 내용은 설정 메뉴에서 관리합니다.</p>
                      </div>
                    </div>
                  )}

                  {/* Step 2: 검사 선택 */}
                  {createStep === 2 && (
                    <div className="flex flex-col gap-4">
                      <div>
                        <h4 className="text-sm font-semibold leading-tight">검사 선택</h4>
                        <p className="mt-0.5 text-xs text-muted-foreground">생성할 커스텀 검사에 포함할 검사군을 고릅니다.</p>
                      </div>
                      <div className="flex flex-col gap-2">
                        {catalog.length === 0 ? (
                          <p className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">{catalogMessage || "생성 가능한 기반 검사가 없습니다."}</p>
                        ) : catalog.map((test) => (
                          <label key={test.test_id} className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm">
                            <input
                              type="checkbox"
                              checked={selectedTestIds.includes(test.test_id)}
                              onChange={(e) => setTestSelected(test.test_id, e.target.checked)}
                            />
                            <span className="truncate">{test.test_id}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Step 3: 세션 구성 */}
                  {createStep === 3 && (
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-semibold leading-tight">세션 구성</h4>
                          <p className="mt-0.5 text-xs text-muted-foreground">검사를 묶을 세션과 세션별 안내 문구를 설정합니다.</p>
                        </div>
                        <Button type="button" size="sm" variant="outline" onClick={addSession}>
                          <IconPlus className="size-3.5" />
                          세션
                        </Button>
                      </div>
                      {selectedTestIds.length === 0 ? (
                        <p className="rounded-md border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">이전 단계에서 검사를 먼저 선택해주세요.</p>
                      ) : (
                        <div className="grid gap-4 lg:grid-cols-[200px_1fr]">
                          {/* 드래그 가능한 검사 칩 */}
                          <aside className="flex flex-col gap-2 self-start rounded-md border bg-muted/30 p-3">
                            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">선택한 검사</p>
                            <p className="text-[11px] text-muted-foreground">아래 칩을 세션으로 드래그</p>
                            <div className="mt-1 flex flex-wrap gap-1.5">
                              {selectedTestIds.map((testId) => {
                                const session = sessionsDraft.find((item) => item.local_id === testSessionMap[testId])
                                return (
                                  <button
                                    key={testId}
                                    type="button"
                                    draggable
                                    data-session-test-chip={testId}
                                    onDragStart={(event) => handleTestDragStart(event, testId)}
                                    onDragEnd={() => setDraggingTestId(null)}
                                    className={`cursor-grab rounded-md border bg-white px-2.5 py-1.5 font-mono text-[11px] font-semibold shadow-sm transition-colors hover:border-primary/40 active:cursor-grabbing ${draggingTestId === testId ? "opacity-50" : ""}`}
                                    title={`${session?.title || "세션 1"}에 배정됨`}
                                  >
                                    ⋮⋮ {testId}
                                  </button>
                                )
                              })}
                            </div>
                          </aside>
                          {/* 세션 드롭존 */}
                          <div className="flex flex-col gap-2">
                            {sessionsDraft.map((session, index) => {
                              const sessionTestIds = selectedTestIds.filter((testId) => testSessionMap[testId] === session.local_id)
                              return (
                                <div
                                  key={session.local_id}
                                  data-session-drop-zone={session.local_id}
                                  className={`rounded-md border p-3 transition-colors ${draggingTestId ? "border-primary/40 bg-primary/5" : ""}`}
                                  onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move" }}
                                  onDrop={(event) => handleSessionDrop(event, session.local_id)}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-semibold text-muted-foreground">세션 {index + 1}</span>
                                    {sessionsDraft.length > 1 && (
                                      <button
                                        type="button"
                                        onClick={() => removeSession(session.local_id)}
                                        className="text-xs text-muted-foreground hover:text-destructive"
                                      >
                                        삭제
                                      </button>
                                    )}
                                  </div>
                                  <div className="mt-2 grid gap-2">
                                    <Input
                                      value={session.title}
                                      onChange={(e) => updateSession(session.local_id, { title: e.target.value })}
                                      placeholder="세션 이름"
                                      maxLength={80}
                                    />
                                    <textarea
                                      value={session.description}
                                      onChange={(e) => updateSession(session.local_id, { description: e.target.value })}
                                      placeholder="세션 시작 전 보여줄 검사 안내 문구"
                                      rows={3}
                                      maxLength={500}
                                      className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                    />
                                  </div>
                                  <div className="mt-2 flex min-h-7 flex-wrap items-center gap-1.5 rounded border border-dashed border-border bg-muted/40 p-1.5">
                                    {sessionTestIds.length === 0 ? (
                                      <span className="px-1 text-[11px] text-muted-foreground">검사 칩을 여기로 드래그</span>
                                    ) : sessionTestIds.map((testId) => (
                                      <span key={testId} className="rounded bg-muted px-2 py-0.5 font-mono text-[11px] font-semibold">{testId}</span>
                                    ))}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Step 4: 척도 선택 */}
                  {createStep === 4 && (
                    <div className="flex flex-col gap-4">
                      <div>
                        <h4 className="text-sm font-semibold leading-tight">척도 선택</h4>
                        <p className="mt-0.5 text-xs text-muted-foreground">실시구간을 펼쳐 척도를 개별 선택하거나 실시구간 체크박스로 전체 선택합니다.</p>
                      </div>
                      <div className="flex flex-col gap-2">
                        {scaleGroups.length === 0 ? (
                          <p className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">먼저 검사 선택에서 검사 항목을 체크해주세요.</p>
                        ) : scaleGroups.map((group) => {
                          const allTestKeys = group.scales.map((s) => s.key)
                          const isAllSelected = allScaleTestIds.has(group.test_id) ||
                            (allTestKeys.length > 0 && allTestKeys.every((k) => selectedScaleKeys.has(k)))
                          const isExpanded = expandedTestIds.has(group.test_id)
                          return (
                            <div key={group.test_id} className="rounded-md border">
                              {/* 검사 헤더 */}
                              <div className="flex items-center justify-between gap-2 px-2.5 py-1.5">
                                <label className="flex cursor-pointer items-center gap-2 text-xs font-medium">
                                  <input
                                    type="checkbox"
                                    className="size-3.5"
                                    checked={isAllSelected}
                                    onChange={(e) => setAllScalesForTest(group.test_id, e.target.checked)}
                                  />
                                  <span>{group.test_id}</span>
                                </label>
                                <button
                                  type="button"
                                  className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                                  onClick={() => setExpandedTestIds((prev) => {
                                    const next = new Set(prev)
                                    if (next.has(group.test_id)) next.delete(group.test_id)
                                    else next.add(group.test_id)
                                    return next
                                  })}
                                >
                                  {isExpanded ? <IconChevronDown className="size-3" /> : <IconChevronRight className="size-3" />}
                                  {isExpanded ? "접기" : "펼치기"}
                                </button>
                              </div>
                              {/* 실시구간 목록 */}
                              {isExpanded && (
                                <div className="flex flex-col gap-1 border-t px-2 py-2">
                                  {group.tree.map((conditionNode) => {
                                    const conditionKeys = group.scales
                                      .filter((s) => s.sub_test_json === conditionNode.sub_test_json)
                                      .map((s) => s.key)
                                    const isCondSelected = conditionKeys.length > 0 &&
                                      conditionKeys.every((k) => selectedScaleKeys.has(k))
                                    const isCondExpanded = expandedScaleNodeKeys.has(conditionNode.key)
                                    return (
                                      <div key={conditionNode.key} className="rounded border bg-muted/10">
                                        {/* 실시구간 헤더: 체크박스 + 펼치기 버튼 */}
                                        <div className="flex items-center gap-2 px-2 py-1.5">
                                          <input
                                            type="checkbox"
                                            className="size-3.5 shrink-0"
                                            checked={isCondSelected}
                                            onChange={(e) => setScaleSelected(group.test_id, conditionKeys, e.target.checked)}
                                          />
                                          <button
                                            type="button"
                                            className="flex min-w-0 flex-1 items-center justify-between gap-2 text-left"
                                            onClick={() => toggleScaleNode(conditionNode.key)}
                                          >
                                            <span className="flex items-center gap-1.5">
                                              {isCondExpanded
                                                ? <IconChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
                                                : <IconChevronRight className="size-3.5 shrink-0 text-muted-foreground" />}
                                              <span className="text-xs font-medium">{conditionNode.label}</span>
                                            </span>
                                            <span className="shrink-0 text-[11px] text-muted-foreground">
                                              {conditionNode.item_count ? `${conditionNode.item_count}문항` : "문항 정보 없음"}
                                            </span>
                                          </button>
                                        </div>
                                        {/* 척도 트리 */}
                                        {isCondExpanded && (
                                          <div className="border-t px-1 py-1">
                                            {renderScaleNodes(group, conditionNode.children)}
                                          </div>
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Step 5: 추가 인적사항 */}
                  {createStep === 5 && (
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-semibold leading-tight">추가 인적사항</h4>
                          <p className="mt-0.5 text-xs text-muted-foreground">검사 URL에서 받을 추가 정보 항목을 정의합니다.</p>
                        </div>
                        <Button type="button" size="sm" variant="outline" onClick={addProfileField}>추가</Button>
                      </div>
                      <div className="flex flex-col gap-3">
                        {profileFields.length === 0 ? (
                          <p className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">추가 인적사항이 없습니다.</p>
                        ) : profileFields.map((field) => (
                          <div key={field.local_id} className="rounded-md border p-3">
                            <div className="grid gap-3 md:grid-cols-2">
                              <Input
                                value={field.label}
                                onChange={(e) => updateProfileField(field.local_id, { label: e.target.value })}
                                placeholder="항목명"
                                maxLength={60}
                              />
                              <select
                                value={field.type}
                                onChange={(e) => updateProfileField(field.local_id, { type: e.target.value as FieldType })}
                                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                              >
                                {fieldTypes.map((type) => (
                                  <option key={type.value} value={type.value}>{type.label}</option>
                                ))}
                              </select>
                              <Input
                                value={field.placeholder}
                                onChange={(e) => updateProfileField(field.local_id, { placeholder: e.target.value })}
                                placeholder="안내 문구"
                                maxLength={120}
                              />
                              <label className="flex items-center gap-2 text-sm">
                                <input
                                  type="checkbox"
                                  checked={field.required}
                                  onChange={(e) => updateProfileField(field.local_id, { required: e.target.checked })}
                                />
                                <span>필수 입력</span>
                              </label>
                            </div>
                            {isOptionType(field.type) && (
                              <div className="mt-3 flex flex-col gap-2">
                                {field.options.map((option, idx) => (
                                  <div key={idx} className="flex gap-2">
                                    <Input
                                      value={option}
                                      onChange={(e) => updateProfileField(field.local_id, {
                                        options: field.options.map((item, itemIdx) => itemIdx === idx ? e.target.value : item),
                                      })}
                                      placeholder="옵션 값"
                                    />
                                    <Button
                                      type="button"
                                      variant="outline"
                                      onClick={() => updateProfileField(field.local_id, {
                                        options: field.options.filter((_, itemIdx) => itemIdx !== idx).length
                                          ? field.options.filter((_, itemIdx) => itemIdx !== idx)
                                          : [""],
                                      })}
                                    >
                                      삭제
                                    </Button>
                                  </div>
                                ))}
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => updateProfileField(field.local_id, { options: [...field.options, ""] })}
                                >
                                  옵션 추가
                                </Button>
                              </div>
                            )}
                            <div className="mt-3 flex justify-end">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setProfileFields((prev) => prev.filter((item) => item.local_id !== field.local_id))}
                              >
                                항목 삭제
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              </div>

              {createMessage && (
                <p className={`border-t px-6 py-3 text-sm ${createMessage.error ? "text-destructive" : "text-green-600"}`}>
                  {createMessage.text}
                </p>
              )}

              {/* 푸터 */}
              <footer className="flex items-center justify-between border-t px-6 py-3">
                <span className="text-xs text-muted-foreground">
                  {createStep === 1 && "검사 이름과 운영 옵션을 먼저 확인해주세요."}
                  {createStep === 2 && "선택한 검사군이 다음 단계의 세션과 척도 트리에 펼쳐집니다."}
                  {createStep === 3 && "검사 칩을 세션 카드로 드래그하여 배정합니다."}
                  {createStep === 4 && "선택한 척도가 없는 실시구간은 자동으로 제외됩니다."}
                  {createStep === 5 && "검사 URL에서 받을 추가 정보 항목을 정의합니다."}
                </span>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="ghost" onClick={() => { setShowCreateModal(false); resetCreateForm() }} disabled={creating}>
                    닫기
                  </Button>
                  {createStep > 1 && (
                    <Button type="button" variant="outline" onClick={() => setCreateStep((s) => s - 1)} disabled={creating}>
                      <IconChevronLeft className="size-3.5" /> 이전
                    </Button>
                  )}
                  {createStep < CREATE_STEPS.length && (
                    <Button type="button" onClick={() => setCreateStep((s) => s + 1)}>
                      다음 <IconChevronRight className="size-3.5" />
                    </Button>
                  )}
                  {createStep === CREATE_STEPS.length && (
                    <Button type="submit" disabled={creating || !catalog.length}>
                      {creating ? "생성 중..." : "생성"}
                    </Button>
                  )}
                </div>
              </footer>
            </form>
          </section>
        </div>
      )}

      {missingVariants.length > 0 && pendingPayload && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4">
          <section className="w-full max-w-2xl rounded-lg border bg-card p-6 shadow-lg">
            <h3 className="text-lg font-semibold">실시구간 제외 확인</h3>
            <p className="mt-2 text-sm text-muted-foreground">선택한 척도가 없는 실시구간이 있습니다. 아래 실시구간을 제외하고 검사를 생성할지 확인해주세요.</p>
            <div className="mt-4 max-h-80 overflow-auto rounded-md border">
              {missingVariants.map((item, idx) => (
                <div key={`${item.test_id}-${idx}`} className="border-b p-3 text-sm last:border-b-0">
                  <strong>{item.label}</strong>
                  <p className="mt-1 text-xs text-muted-foreground">선택한 척도가 없어 이 실시구간은 생성 대상에서 제외됩니다.</p>
                  <p className="mt-1 text-xs text-muted-foreground">가능 척도: {item.available_scale_codes.join(", ") || "없음"}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => { setPendingPayload(null); setMissingVariants([]) }} disabled={creating}>
                돌아가기
              </Button>
              <Button type="button" onClick={() => submitPayload(pendingPayload)} disabled={creating}>
                {creating ? "생성 중..." : "해당 실시구간 제외 후 생성"}
              </Button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
