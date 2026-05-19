/* TestManagementPage — list view that hosts the 검사 생성 modal trigger */

function TestManagementPage({ onCreate }) {
  const [tab, setTab] = React.useState("custom-tests");
  const [search, setSearch] = React.useState("");

  const tests = [
    { id: 1, name: "STS 파일럿-초등용", base: "STS", scales: 12, assigned: 34, done: 28, status: "운영중", progress: "진행", date: "2026-04-22" },
    { id: 2, name: "MMPI-2 성인용 표준",  base: "MMPI-2", scales: 24, assigned: 120, done: 95, status: "운영중", progress: "진행", date: "2026-04-15" },
    { id: 3, name: "K-WISC 4-6학년 통합",  base: "K-WISC", scales: 18, assigned: 0, done: 0, status: "초안", progress: "준비",  date: "2026-04-30" },
    { id: 4, name: "CES-D 단축형",         base: "CES-D",   scales: 4,  assigned: 56, done: 56, status: "종료", progress: "완료",  date: "2026-03-12" },
    { id: 5, name: "STAI 청소년용",        base: "STAI",   scales: 6,  assigned: 22, done: 14, status: "운영중", progress: "진행", date: "2026-04-28" },
  ];
  const filtered = tests.filter(t => !search || t.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex flex-col gap-6 overflow-auto p-6">
      <PageHeader
        title="검사 관리"
        subtitle="맞춤형 검사를 생성하고 관리합니다"
        action={
          tab === "custom-tests" ? (
            <Button size="sm" onClick={onCreate}>
              <IconPlus size={14} /> 검사 생성
            </Button>
          ) : null
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex overflow-hidden rounded-md border border-[var(--color-border)] text-xs">
          {[{v:"custom-tests", l:"커스텀 검사"}, {v:"status", l:"실시 현황"}].map((t, i) => (
            <button key={t.v}
              onClick={() => { setTab(t.v); setSearch(""); }}
              className={cn(
                "px-3 py-1.5",
                i > 0 && "border-l border-[var(--color-border)]",
                tab === t.v
                  ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                  : "bg-white text-[var(--color-muted-foreground)] hover:bg-[var(--color-accent)]"
              )}>
              {t.l}
            </button>
          ))}
        </div>
        <div className="relative w-full max-w-sm">
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]"><IconSearch size={16} /></span>
          <Input className="pl-8" placeholder="검사명으로 검색" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <Card className="gap-0 py-0">
        <CardContent className="p-0">
          <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_152px] h-10 items-center content-center gap-2 border-b-2 border-[var(--color-border)] bg-[var(--color-muted)] px-4 text-xs font-medium">
            <span className="text-center">검사명</span>
            <span className="text-center">기반 검사</span>
            <span className="text-center">척도 수</span>
            <span className="text-center">배정 / 실시</span>
            <span className="text-center">진행 상태</span>
            <span></span>
          </div>
          <div className="divide-y divide-[var(--color-border)]">
            {filtered.map(t => (
              <div key={t.id} className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr_1fr_152px] items-center gap-2 px-4 py-3 hover:bg-[hsl(210_40%_96.1%/0.4)]">
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-sm font-medium">{t.name}</span>
                  <span className="text-xs text-[var(--color-muted-foreground)]">{t.date} 생성</span>
                </div>
                <span className="text-center text-sm text-[var(--color-muted-foreground)]">{t.base}</span>
                <span className="text-center text-sm">척도 {t.scales}개</span>
                <span className={cn("text-center text-sm", t.assigned === 0 && "text-[hsl(35_91%_43%)]")}>{t.assigned} / {t.done}</span>
                <span className="flex items-center justify-center gap-1">
                  <Badge variant={t.status === "운영중" ? "success" : t.status === "종료" ? "secondary" : "outline"}>{t.status}</Badge>
                  <Badge variant="secondary">{t.progress}</Badge>
                </span>
                <span className="flex items-center justify-center gap-1">
                  <Button variant="outline" size="sm" className="h-7 text-xs"><IconLink size={12} /> URL</Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs">상세</Button>
                  <Button variant="ghost" size="icon" className="size-7 text-[var(--color-muted-foreground)] hover:text-[var(--color-destructive)]"><IconTrash size={12} /></Button>
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

Object.assign(window, { TestManagementPage });
