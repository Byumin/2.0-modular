import * as React from "react"

interface ClientSummary {
  id: number
  name: string
  gender: string
  birth_day: string | null
  memo: string
}

interface ReviewItem {
  id: number
  admin_custom_test_id: number
  submission_id: number | null
  input_profile: Record<string, unknown>
  candidates: ClientSummary[]
  responder_choice: "existing" | "new"
  chosen_client: ClientSummary | null
  provisional_client: ClientSummary | null
  review_status: string
  reviewed_at: string | null
  created_at: string
}

interface ReviewsData {
  pending_count: number
  items: ReviewItem[]
}

function genderLabel(g: string) {
  return g === "male" ? "남" : g === "female" ? "여" : g
}

function clientLabel(c: ClientSummary | null) {
  if (!c) return "—"
  return `${c.name} (${genderLabel(c.gender)}${c.birth_day ? " · " + c.birth_day : ""})`
}

export function IdentityReviews() {
  const [data, setData] = React.useState<ReviewsData | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState("")
  const [processing, setProcessing] = React.useState<number | null>(null)
  const [actionError, setActionError] = React.useState<Record<number, string>>({})

  async function loadReviews() {
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/admin/identity-reviews")
      if (!res.ok) throw new Error("데이터를 불러올 수 없습니다.")
      setData(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다.")
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => { loadReviews() }, [])

  async function post(url: string, body?: unknown) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      const msg = typeof d?.detail === "string" ? d.detail : d?.detail?.message || "처리에 실패했습니다."
      throw new Error(msg)
    }
    return res.json()
  }

  async function handleMerge(review: ReviewItem, targetClientId: number) {
    if (processing) return
    setProcessing(review.id)
    setActionError((prev) => ({ ...prev, [review.id]: "" }))
    try {
      await post(`/api/admin/identity-reviews/${review.id}/merge`, { target_client_id: targetClientId })
      await loadReviews()
    } catch (e) {
      setActionError((prev) => ({ ...prev, [review.id]: e instanceof Error ? e.message : "오류" }))
    } finally {
      setProcessing(null)
    }
  }

  async function handleConfirmNew(review: ReviewItem) {
    if (processing) return
    setProcessing(review.id)
    setActionError((prev) => ({ ...prev, [review.id]: "" }))
    try {
      await post(`/api/admin/identity-reviews/${review.id}/confirm-new`)
      await loadReviews()
    } catch (e) {
      setActionError((prev) => ({ ...prev, [review.id]: e instanceof Error ? e.message : "오류" }))
    } finally {
      setProcessing(null)
    }
  }

  async function handleReject(review: ReviewItem) {
    if (processing) return
    setProcessing(review.id)
    setActionError((prev) => ({ ...prev, [review.id]: "" }))
    try {
      await post(`/api/admin/identity-reviews/${review.id}/reject`)
      await loadReviews()
    } catch (e) {
      setActionError((prev) => ({ ...prev, [review.id]: e instanceof Error ? e.message : "오류" }))
    } finally {
      setProcessing(null)
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6 overflow-auto">
      <div>
        <h2 className="text-xl font-semibold text-foreground">내담자 동일인 검토</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          인적사항 모호 매칭으로 수검한 사례를 검토하고 처리합니다.
        </p>
      </div>

      {loading && (
        <div className="rounded-xl border bg-white p-6 text-center text-sm text-muted-foreground shadow-sm">
          불러오는 중...
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {!loading && data && data.items.length === 0 && (
        <div className="rounded-xl border bg-white p-6 text-center text-sm text-muted-foreground shadow-sm">
          검토 대기 중인 항목이 없습니다.
        </div>
      )}

      {!loading && data && data.items.length > 0 && (
        <div className="flex flex-col gap-4">
          {data.items.map((review) => {
            const inputName = String(review.input_profile?.name || "")
            const inputGender = String(review.input_profile?.gender || "")
            const inputBirthDay = String(review.input_profile?.birth_day || "")
            const isProcessing = processing === review.id
            const err = actionError[review.id]

            return (
              <article key={review.id} className="rounded-xl border bg-white p-5 shadow-sm flex flex-col gap-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p className="text-xs text-muted-foreground">제출 #{review.submission_id ?? "—"} · {new Date(review.created_at).toLocaleString("ko-KR")}</p>
                    <p className="mt-1 font-semibold">
                      {inputName}
                      {inputGender ? ` (${genderLabel(inputGender)})` : ""}
                      {inputBirthDay ? ` · ${inputBirthDay}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      수검자 선택: <span className="font-medium">{review.responder_choice === "existing" ? "기존 내담자" : "신규 등록"}</span>
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {review.chosen_client && (
                    <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-3 text-sm">
                      <p className="text-xs font-semibold text-blue-700 mb-0.5">수검자가 선택한 기존 내담자</p>
                      <p>{clientLabel(review.chosen_client)}</p>
                    </div>
                  )}
                  {review.provisional_client && (
                    <div className="rounded-lg border border-amber-100 bg-amber-50/60 p-3 text-sm">
                      <p className="text-xs font-semibold text-amber-700 mb-0.5">임시 생성된 내담자</p>
                      <p>{clientLabel(review.provisional_client)}</p>
                    </div>
                  )}
                  {review.candidates.length > 0 && (
                    <div className="rounded-lg border p-3 text-sm sm:col-span-2">
                      <p className="text-xs font-semibold text-muted-foreground mb-1">기존 후보 내담자</p>
                      <ul className="flex flex-col gap-0.5">
                        {review.candidates.map((c) => (
                          <li key={c.id}>{clientLabel(c)}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {err && <p className="text-sm text-destructive">{err}</p>}

                <div className="flex flex-wrap items-center gap-2 pt-1 border-t">
                  <span className="text-xs text-muted-foreground mr-auto">관리자 처리</span>

                  {/* 기존 내담자로 병합 - 후보 또는 chosen_client 기준 */}
                  {(review.chosen_client || review.candidates.length > 0) && (
                    <>
                      {review.chosen_client && (
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleMerge(review, review.chosen_client!.id)}
                          className="h-9 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                        >
                          {isProcessing ? "처리 중..." : `'${review.chosen_client.name}'으로 병합`}
                        </button>
                      )}
                      {!review.chosen_client && review.candidates.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleMerge(review, c.id)}
                          className="h-9 rounded-lg border border-primary px-3 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 disabled:opacity-50"
                        >
                          {isProcessing ? "처리 중..." : `'${c.name}'으로 병합`}
                        </button>
                      ))}
                    </>
                  )}

                  {review.provisional_client && (
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleConfirmNew(review)}
                      className="h-9 rounded-lg bg-green-600 px-3 text-xs font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-50"
                    >
                      {isProcessing ? "처리 중..." : "신규 내담자로 확정"}
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => handleReject(review)}
                    className="h-9 rounded-lg border border-input bg-background px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent disabled:opacity-50"
                  >
                    {isProcessing ? "처리 중..." : "무시"}
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
