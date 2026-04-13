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
  test_ids?: string[]
  created_at: string
  selected_scale_codes?: string[]
  scale_count?: number
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

  React.useEffect(() => {
    if (!id) return
    fetch(`/api/admin/custom-tests/${id}`)
      .then((r) => r.json())
      .then((data) => setTest(data.item ?? data))
      .catch(() => setError("검사 정보를 불러올 수 없습니다."))
      .finally(() => setLoading(false))
  }, [id])

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
            <CardTitle className="text-sm font-medium">검사 링크 생성</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              내담자에게 제공할 검사 접속 링크를 생성합니다.
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
