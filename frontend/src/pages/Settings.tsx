import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function Settings() {
  return (
    <div className="flex flex-col gap-6 p-6 overflow-auto">
      <div>
        <h2 className="text-xl font-semibold">설정</h2>
        <p className="text-sm text-muted-foreground mt-0.5">관리자 환경 설정 항목을 정리하는 화면입니다</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">현재 상태</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          설정 항목은 아직 별도 API가 없어 읽기 전용 안내 화면으로 유지합니다.
        </CardContent>
      </Card>
    </div>
  )
}
