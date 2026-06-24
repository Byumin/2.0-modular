import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export function Settings() {
  const [consentText, setConsentText] = React.useState("")
  const [securityNoticeText, setSecurityNoticeText] = React.useState("")
  const [loading, setLoading] = React.useState(true)
  const [savingConsent, setSavingConsent] = React.useState(false)
  const [savingSecurityNotice, setSavingSecurityNotice] = React.useState(false)
  const [consentMessage, setConsentMessage] = React.useState<{ text: string; error: boolean } | null>(null)
  const [securityNoticeMessage, setSecurityNoticeMessage] = React.useState<{ text: string; error: boolean } | null>(null)

  React.useEffect(() => {
    let mounted = true
    Promise.all([
      fetch("/api/admin/settings/consent").then((r) => r.json()),
      fetch("/api/admin/settings/security-notice").then((r) => r.json()),
    ])
      .then(([consent, securityNotice]) => {
        if (!mounted) return
        setConsentText(consent.consent_text ?? "")
        setSecurityNoticeText(securityNotice.security_notice_text ?? "")
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [])

  const handleSaveConsent = async () => {
    setSavingConsent(true)
    setConsentMessage(null)
    try {
      const res = await fetch("/api/admin/settings/consent", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consent_text: consentText }),
      })
      if (!res.ok) throw new Error("저장에 실패했습니다.")
      setConsentMessage({ text: "저장되었습니다.", error: false })
    } catch {
      setConsentMessage({ text: "저장에 실패했습니다.", error: true })
    } finally {
      setSavingConsent(false)
    }
  }

  const handleSaveSecurityNotice = async () => {
    setSavingSecurityNotice(true)
    setSecurityNoticeMessage(null)
    try {
      const res = await fetch("/api/admin/settings/security-notice", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ security_notice_text: securityNoticeText }),
      })
      if (!res.ok) throw new Error("저장에 실패했습니다.")
      setSecurityNoticeMessage({ text: "저장되었습니다.", error: false })
    } catch {
      setSecurityNoticeMessage({ text: "저장에 실패했습니다.", error: true })
    } finally {
      setSavingSecurityNotice(false)
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
              {consentMessage && (
                <p className={`text-sm ${consentMessage.error ? "text-destructive" : "text-green-600"}`}>
                  {consentMessage.text}
                </p>
              )}
              <div className="flex justify-end">
                <Button onClick={handleSaveConsent} disabled={savingConsent} size="sm">
                  {savingConsent ? "저장 중..." : "저장"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="py-0 gap-0">
        <div className="flex items-center gap-2 px-4 py-3 border-b">
          <span className="text-sm font-semibold">개인정보 보안관리 안내</span>
          <span className="text-xs text-muted-foreground">검사별로 보안관리 확인 여부를 설정할 수 있습니다</span>
        </div>
        <CardContent className="p-4 flex flex-col gap-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">불러오는 중...</p>
          ) : (
            <>
              <textarea
                value={securityNoticeText}
                onChange={(e) => setSecurityNoticeText(e.target.value)}
                rows={10}
                placeholder={"개인정보 보안관리 안내 문구를 입력하세요.\n\n예시:\n- 검사 링크와 본인 확인 정보는 타인에게 공유하지 않습니다.\n- 공용 PC에서는 검사 완료 후 브라우저를 종료합니다.\n- 입력한 개인정보와 검사 응답은 안전한 환경에서 관리됩니다."}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              />
              {securityNoticeMessage && (
                <p className={`text-sm ${securityNoticeMessage.error ? "text-destructive" : "text-green-600"}`}>
                  {securityNoticeMessage.text}
                </p>
              )}
              <div className="flex justify-end">
                <Button onClick={handleSaveSecurityNotice} disabled={savingSecurityNotice} size="sm">
                  {savingSecurityNotice ? "저장 중..." : "저장"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
