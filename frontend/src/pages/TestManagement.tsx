import * as React from "react"
import { useNavigate } from "react-router-dom"
import { IconLink, IconPlus, IconSearch, IconTrash } from "@tabler/icons-react"
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
}

interface CatalogSubTest {
  sub_test_json: string
  display_name?: string
  item_count?: number
  age_label?: string
  scales?: CatalogScale[]
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

interface ScaleGroupItem {
  key: string
  test_id: string
  code: string
  label: string
}

interface ScaleGroup {
  test_id: string
  scales: ScaleGroupItem[]
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

function scaleKey(testId: string, code: string) {
  return `${testId}::${code}`
}

function describeSubTest(subTest: CatalogSubTest) {
  const parts = [
    subTest.display_name || "실시구간",
    subTest.age_label || "연령/학령 정보 없음",
    Number.isFinite(subTest.item_count) ? `${subTest.item_count}문항` : "",
  ].filter(Boolean)
  return parts.join(" | ")
}

function collectScaleGroups(catalog: CatalogTest[], testIds: string[]): ScaleGroup[] {
  return testIds
    .map((testId) => {
      const test = catalog.find((item) => item.test_id === testId)
      if (!test?.sub_tests?.length) return null

      const grouped = new Map<string, { code: string; name: string; ageLabels: Set<string> }>()
      test.sub_tests.forEach((subTest) => {
        const ageLabel = subTest.age_label || "연령/학령 정보 없음"
        ;(subTest.scales ?? []).forEach((scale) => {
          const code = String(scale.code || "").trim()
          if (!code) return
          const current = grouped.get(code) ?? { code, name: scale.name || code, ageLabels: new Set<string>() }
          current.name = current.name || scale.name || code
          current.ageLabels.add(ageLabel)
          grouped.set(code, current)
        })
      })

      const scales = [...grouped.values()]
        .sort((a, b) => a.code.localeCompare(b.code))
        .map((item) => ({
          key: scaleKey(testId, item.code),
          test_id: testId,
          code: item.code,
          label: `${item.name} (${item.code}) - ${[...item.ageLabels].join(", ")}`,
        }))

      return { test_id: testId, scales }
    })
    .filter((item): item is ScaleGroup => Boolean(item))
}

function normalizeClientIntakeMode(value: string) {
  return value === "auto_create" ? "auto_create" : "pre_registered_only"
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
  const [allScaleTestIds, setAllScaleTestIds] = React.useState<Set<string>>(new Set())
  const [selectedScaleKeys, setSelectedScaleKeys] = React.useState<Set<string>>(new Set())
  const [profileFields, setProfileFields] = React.useState<ProfileField[]>([])
  const [pendingPayload, setPendingPayload] = React.useState<CreatePayload | null>(null)
  const [missingVariants, setMissingVariants] = React.useState<MissingVariant[]>([])

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
      const selectedCodes = new Set(
        (scaleGroups.find((group) => group.test_id === testId)?.scales ?? [])
          .filter((scale) => selectedScaleKeys.has(scale.key))
          .map((scale) => scale.code)
      )

      ;(test?.sub_tests ?? []).forEach((subTest) => {
        const availableCodes = new Set((subTest.scales ?? []).map((scale) => String(scale.code || "").trim()).filter(Boolean))
        const hasSelectedScale = [...selectedCodes].some((code) => availableCodes.has(code))
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
      profileFieldCount: profileFields.length,
    }
  }, [catalog, profileFields.length, scaleGroups, selectedScaleKeys, selectedTestIds])

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
    setAllScaleTestIds(new Set())
    setSelectedScaleKeys(new Set())
    setProfileFields([])
    setPendingPayload(null)
    setMissingVariants([])
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
      await navigator.clipboard.writeText(fullUrl)
      alert("URL이 클립보드에 복사되었습니다.")
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
    setExpandedTestIds((prev) => {
      const next = new Set(prev)
      if (checked) next.delete(testId)
      else next.add(testId)
      return next
    })
    setSelectedScaleKeys((prev) => {
      const next = new Set(prev)
      keys.forEach((key) => next.add(key))
      return next
    })
  }

  const setScaleSelected = (testId: string, key: string, checked: boolean) => {
    setAllScaleTestIds((prev) => {
      const next = new Set(prev)
      next.delete(testId)
      return next
    })
    setSelectedScaleKeys((prev) => {
      const next = new Set(prev)
      if (checked) next.add(key)
      else next.delete(key)
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

    const selectedByTest = new Map<string, Set<string>>()
    scaleGroups.forEach((group) => {
      group.scales.forEach((scale) => {
        if (!selectedScaleKeys.has(scale.key)) return
        const codes = selectedByTest.get(group.test_id) ?? new Set<string>()
        codes.add(scale.code)
        selectedByTest.set(group.test_id, codes)
      })
    })

    const missing: MissingVariant[] = []
    const test_configs = selectedTestIds
      .map((testId) => {
        const test = catalog.find((item) => item.test_id === testId)
        const selectedCodes = [...(selectedByTest.get(testId) ?? new Set<string>())]
        const excluded_sub_test_jsons: string[] = []

        ;(test?.sub_tests ?? []).forEach((subTest) => {
          const availableCodes = [...new Set((subTest.scales ?? []).map((scale) => String(scale.code || "").trim()).filter(Boolean))]
          const matchedCodes = selectedCodes.filter((code) => availableCodes.includes(code))
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
          <section className="flex max-h-full w-full max-w-5xl flex-col rounded-lg border bg-card shadow-lg">
            <div className="border-b px-6 py-4">
              <h3 className="text-lg font-semibold">검사 생성</h3>
              <p className="mt-1 text-sm text-muted-foreground">검사군, 척도, 추가 인적사항을 선택해 커스텀 검사를 생성합니다.</p>
            </div>
            <form onSubmit={handleCreate} className="flex min-h-0 flex-1 flex-col">
              <div className="grid min-h-0 gap-4 overflow-auto p-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
                <section className="flex flex-col gap-4">
                  <div className="rounded-lg border p-4">
                    <h4 className="text-sm font-semibold">기본 정보</h4>
                    <div className="mt-4 flex flex-col gap-3">
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
                        <label className="flex items-center gap-2 cursor-pointer">
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
                  </div>

                  <div className="rounded-lg border p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-semibold">1. 검사 선택</h4>
                        <p className="text-xs text-muted-foreground">생성할 검사군을 고릅니다.</p>
                      </div>
                    </div>
                    <div className="mt-4 flex max-h-56 flex-col gap-2 overflow-auto">
                      {catalog.length === 0 ? (
                        <p className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">{catalogMessage || "생성 가능한 기반 검사가 없습니다."}</p>
                      ) : catalog.map((test) => (
                        <label key={test.test_id} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                          <input
                            type="checkbox"
                            checked={selectedTestIds.includes(test.test_id)}
                            onChange={(e) => setTestSelected(test.test_id, e.target.checked)}
                          />
                          <span>{test.test_id}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-lg border p-4">
                    <h4 className="text-sm font-semibold">구성 요약</h4>
                    <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                      <div className="rounded-md bg-muted/40 p-3">
                        <p className="text-xs text-muted-foreground">검사군</p>
                        <strong>{createSummary.selectedTestCount}개</strong>
                      </div>
                      <div className="rounded-md bg-muted/40 p-3">
                        <p className="text-xs text-muted-foreground">선택 척도</p>
                        <strong>{createSummary.selectedScaleCount}개</strong>
                      </div>
                      <div className="rounded-md bg-muted/40 p-3">
                        <p className="text-xs text-muted-foreground">포함 실시구간</p>
                        <strong>{createSummary.includedVariantCount}개</strong>
                      </div>
                      <div className="rounded-md bg-muted/40 p-3">
                        <p className="text-xs text-muted-foreground">제외 예정</p>
                        <strong className={createSummary.excludedVariantCount ? "text-yellow-700" : ""}>
                          {createSummary.excludedVariantCount}개
                        </strong>
                      </div>
                      <div className="rounded-md bg-muted/40 p-3">
                        <p className="text-xs text-muted-foreground">예상 문항</p>
                        <strong>{createSummary.estimatedItemCount || "-"}개</strong>
                      </div>
                      <div className="rounded-md bg-muted/40 p-3">
                        <p className="text-xs text-muted-foreground">추가 인적사항</p>
                        <strong>{createSummary.profileFieldCount}개</strong>
                      </div>
                    </div>
                    {selectedTestIds.length > 0 && (
                      <p className="mt-3 text-xs text-muted-foreground">
                        {selectedTestIds.join(", ")}
                      </p>
                    )}
                  </div>
                </section>

                <section className="flex flex-col gap-4">
                  <div className="rounded-lg border p-4">
                    <h4 className="text-sm font-semibold">2. 척도 선택</h4>
                    <p className="text-xs text-muted-foreground">검사 선택 후 펼쳐지는 트리에서 사용할 척도를 고릅니다.</p>
                    <div className="mt-4 flex max-h-80 flex-col gap-3 overflow-auto">
                      {scaleGroups.length === 0 ? (
                        <p className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">먼저 검사 선택에서 검사 항목을 체크해주세요.</p>
                      ) : scaleGroups.map((group) => {
                        const isAllSelected = allScaleTestIds.has(group.test_id)
                        const isExpanded = expandedTestIds.has(group.test_id)
                        return (
                          <div key={group.test_id} className="rounded-md border">
                            <div className="flex items-center justify-between gap-3 px-3 py-2">
                              <label className="flex items-center gap-2 text-sm font-medium">
                                <input
                                  type="checkbox"
                                  checked={isAllSelected}
                                  onChange={(e) => setAllScalesForTest(group.test_id, e.target.checked)}
                                />
                                <span>{group.test_id} 전체 척도 선택</span>
                              </label>
                              <button
                                type="button"
                                className="text-xs text-muted-foreground hover:text-foreground"
                                onClick={() => setExpandedTestIds((prev) => {
                                  const next = new Set(prev)
                                  if (next.has(group.test_id)) next.delete(group.test_id)
                                  else next.add(group.test_id)
                                  return next
                                })}
                              >
                                {isExpanded ? "접기" : "펼치기"}
                              </button>
                            </div>
                            {isExpanded && (
                              <div className="flex flex-col gap-1 border-t p-3">
                                {group.scales.map((scale) => (
                                  <label key={scale.key} className="flex items-start gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50">
                                    <input
                                      type="checkbox"
                                      className="mt-0.5"
                                      checked={selectedScaleKeys.has(scale.key)}
                                      disabled={isAllSelected}
                                      onChange={(e) => setScaleSelected(group.test_id, scale.key, e.target.checked)}
                                    />
                                    <span>{scale.label}</span>
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div className="rounded-lg border p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-semibold">3. 추가 인적사항</h4>
                        <p className="text-xs text-muted-foreground">검사 URL에서 받을 추가 정보 항목을 정의합니다.</p>
                      </div>
                      <Button type="button" size="sm" variant="outline" onClick={addProfileField}>추가</Button>
                    </div>
                    <div className="mt-4 flex max-h-80 flex-col gap-3 overflow-auto">
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
                </section>
              </div>

              {createMessage && (
                <p className={`border-t px-6 py-3 text-sm ${createMessage.error ? "text-destructive" : "text-green-600"}`}>
                  {createMessage.text}
                </p>
              )}
              <div className="flex justify-end gap-2 border-t px-6 py-4">
                <Button type="button" variant="outline" onClick={() => { setShowCreateModal(false); resetCreateForm() }} disabled={creating}>
                  닫기
                </Button>
                <Button type="submit" disabled={creating || !catalog.length}>
                  {creating ? "생성 중..." : "생성"}
                </Button>
              </div>
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
