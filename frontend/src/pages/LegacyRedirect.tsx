import { Navigate, useSearchParams } from "react-router-dom"

interface Props {
  type: "client-detail" | "client-result" | "test-detail"
}

export function LegacyRedirect({ type }: Props) {
  const [searchParams] = useSearchParams()
  const id = searchParams.get("id")

  if (!id) {
    return <Navigate to={type === "test-detail" ? "/admin/create" : "/admin/clients"} replace />
  }

  if (type === "client-detail") {
    return <Navigate to={`/admin/clients/${encodeURIComponent(id)}`} replace />
  }
  if (type === "client-result") {
    return <Navigate to={`/admin/clients/${encodeURIComponent(id)}/result`} replace />
  }
  return <Navigate to={`/admin/create/${encodeURIComponent(id)}`} replace />
}
