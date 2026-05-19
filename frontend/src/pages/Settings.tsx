import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export function Settings() {
  const [consentText, setConsentText] = React.useState("")
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [message, setMessage] = React.useState<{ text: string; error: boolean } | null>(null)

  React.useEffect(() => {
    fetch("/api/admin/settings/consent")
      .then((r) => r.json())
      .then((d) => setConsentText(d.consent_text ?? ""))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch("/api/admin/settings/consent", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consent_text: consentText }),
      })
      if (!res.ok) throw new Error("저장에 실패했습니다.")
      setMessage({ text: "저장되었습니다.", error: false })
    } catch {
      setMessage({ text: "저장에 실패했습니다.", error: true })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6 overflow-auto min-w-[640px]">
      <div>
        <h2 className="text-xl font-semibold">설정</h2>
        <p className="text-sm text-muted-foreground mt-0.5">관리자 환경 설정을 관리합니다</p>
      </div>

      <Card className="py-0 gap-0">
        <div className="flex items-center gap-2 px-4 py-3 border-b">
          <span className="text-sm font-semibold">개인정보 수집·이용 동의서</span>
          <span className="text-xs text-muted-foreground">검사별로 동의 사용 여부를 설정할 수 있습니다</span>
        </div>
        <CardContent className="p-4 flex flex-col gap-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">불러오는 중...</p>
          ) : (
            <>
              <textarea
                value={consentText}
                onChange={(e) => setConsentText(e.target.value)}
                rows={12}
                placeholder={"개인정보 수집·이용 동의서 내용을 입력하세요.\n\n예시:\n1. 수집 항목: 이름, 생년월일, 검사 응답\n2. 수집 목적: 심리검사 결과 분석 및 상담 활용\n3. 보유 기간: 상담 종료 후 3년\n4. 동의를 거부할 권리가 있으나, 거부 시 검사 진행이 불가합니다."}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              />
              {message && (
                <p className={`text-sm ${message.error ? "text-destructive" : "text-green-600"}`}>
                  {message.text}
                </p>
              )}
              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={saving} size="sm">
                  {saving ? "저장 중..." : "저장"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
