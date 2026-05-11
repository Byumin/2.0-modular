/**
 * CreateTestModal — 검사 생성 모달 redesign (v3 · polish)
 *
 * Source of truth: Byumin/2.0-modular @ harness-engineering
 *   - frontend/src/pages/TestManagement.tsx (lines 1022-1390)
 *
 * v3 polish (additive on top of v2):
 *   1. Step rail: stepper에 connector line + check fill animation, hover 상태
 *   2. Step content: subtle slide-in 트랜지션 (key 변경 시 fade+translate)
 *   3. Footer: progress bar (5단계 / 현재 단계) + 미니 카운터 (검사 N · 세션 N · 척도 N · 항목 N)
 *   4. Step 2 (검사 카드): 선택 시 ring + check 배지, hover translateY
 *   5. Step 3 (드래그): drop zone idle/hot/active 3-state — hot은 dashed primary,
 *      drag 중인 zone에 직접 hover하면 solid primary + 살짝 scale up
 *   6. Step 3 칩: drag handle 아이콘, 배정된 칩은 같은 색으로 그룹핑
 *   7. Step 4 (척도 트리): tri-state checkbox (전체/일부/없음) + 검사별 진행 바
 *   8. Empty state: 일관된 dashed border + IconAlert
 *
 * 변경 없음: 단계 순서, 상태 shape, 드래그 핸들러 시그니처, 컬러 토큰
 */

const STEPS = [
  { id: 1, key: "basic",    title: "기본 정보",    hint: "이름과 운영 옵션" },
  { id: 2, key: "tests",    title: "검사 선택",    hint: "포함할 검사군" },
  { id: 3, key: "sessions", title: "세션 구성",    hint: "검사를 세션에 배정" },
  { id: 4, key: "scales",   title: "척도 선택",    hint: "사용할 척도 트리" },
  { id: 5, key: "profile",  title: "추가 인적사항", hint: "URL에서 받을 항목" },
];

function CreateTestModal({ open, onClose }) {
  const [step, setStep] = React.useState(1);

  const [name, setName] = React.useState("");
  const [intake, setIntake] = React.useState("pre_registered_only");
  const [consent, setConsent] = React.useState(true);
  const [selectedTests, setSelectedTests] = React.useState(["STS", "MMPI-2"]);

  const [sessionsDraft, setSessionsDraft] = React.useState([
    { local_id: "session_1", title: "1차 세션", description: "표준화된 검사 안내를 확인한 뒤 응답을 시작합니다." },
    { local_id: "session_2", title: "2차 세션", description: "" },
  ]);
  const [testSessionMap, setTestSessionMap] = React.useState({ STS: "session_1", "MMPI-2": "session_2" });
  const [draggingTestId, setDraggingTestId] = React.useState(null);

  // scale selection — store as Set of "TEST::CODE" keys for tri-state math
  const [selectedScaleKeys, setSelectedScaleKeys] = React.useState(() => {
    const s = new Set();
    ["EXT", "INT", "PEER"].forEach((c) => s.add(`STS::${c}`));
    ["L", "F", "K", "Hs", "D", "Hy"].forEach((c) => s.add(`MMPI-2::${c}`));
    return s;
  });

  const [profileFields, setProfileFields] = React.useState([
    { id: "p1", label: "학교명", type: "short_text", required: true },
  ]);

  if (!open) return null;

  const handleTestDragStart = (event, testId) => {
    setDraggingTestId(testId);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", testId);
  };
  const handleSessionDrop = (event, sessionId) => {
    event.preventDefault();
    const testId = event.dataTransfer.getData("text/plain") || draggingTestId;
    if (!testId || !selectedTests.includes(testId)) return;
    setTestSessionMap((prev) => ({ ...prev, [testId]: sessionId }));
    setDraggingTestId(null);
  };

  const goNext = () => setStep((s) => Math.min(STEPS.length, s + 1));
  const goPrev = () => setStep((s) => Math.max(1, s - 1));
  const isLast = step === STEPS.length;

  // Mini counters for the footer
  const counters = {
    tests: selectedTests.length,
    sessions: sessionsDraft.length,
    scales: selectedScaleKeys.size,
    profile: profileFields.length,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true">
      <style>{`
        @keyframes step-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
        .step-anim { animation: step-in .22s cubic-bezier(.2,.7,.2,1); }
        @keyframes pulse-soft { 0%,100% { transform: scale(1); } 50% { transform: scale(1.04); } }
      `}</style>
      <section className="flex max-h-full w-full max-w-5xl flex-col rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-2xl overflow-hidden">

        {/* Header */}
        <header className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold leading-tight">검사 생성</h3>
            <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">
              {STEPS[step - 1].title} · 단계 {step}/{STEPS.length}
            </p>
          </div>
          <button onClick={onClose} aria-label="닫기" className="flex size-8 items-center justify-center rounded-md text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-accent)] hover:text-[var(--color-foreground)]">
            <IconX size={16} />
          </button>
        </header>

        {/* Body */}
        <div className="grid min-h-0 flex-1 grid-cols-[240px_1fr] overflow-hidden">

          {/* Left rail — stepper with connector line */}
          <aside className="flex flex-col border-r border-[var(--color-border)] bg-[hsl(210_40%_98%)] p-5 overflow-auto">
            <p className="px-1 pb-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">단계</p>
            <ol className="relative flex flex-col gap-1">
              {/* connector line */}
              <span aria-hidden className="absolute left-[18px] top-3 bottom-3 w-px bg-[var(--color-border)]" />
              {STEPS.map((s) => {
                const done = s.id < step;
                const active = s.id === step;
                return (
                  <li key={s.key} className="relative">
                    <button
                      onClick={() => setStep(s.id)}
                      className={cn(
                        "group flex w-full items-start gap-3 rounded-md px-2 py-2 text-left transition-all duration-150",
                        active && "bg-white border border-[var(--color-border)] shadow-[0_1px_2px_0_rgb(0_0_0/0.04)]",
                        !active && "hover:bg-white/70"
                      )}
                    >
                      <span className={cn(
                        "relative z-10 mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold transition-all duration-200",
                        done && "bg-[var(--color-primary)] text-[var(--color-primary-foreground)] shadow-[0_0_0_3px_hsl(210_40%_98%)]",
                        active && "bg-[var(--color-foreground)] text-white shadow-[0_0_0_3px_hsl(210_40%_98%),0_0_0_4px_hsl(215_70%_35%/0.2)]",
                        !done && !active && "bg-white border border-[var(--color-border)] text-[var(--color-muted-foreground)] shadow-[0_0_0_3px_hsl(210_40%_98%)] group-hover:border-[var(--color-foreground)]/30"
                      )}>
                        {done ? <IconCheck size={13} /> : s.id}
                      </span>
                      <span className="min-w-0 pt-0.5">
                        <span className={cn("block text-sm leading-tight", active ? "font-semibold" : "font-medium")}>{s.title}</span>
                        <span className="mt-0.5 block text-[11px] text-[var(--color-muted-foreground)]">{s.hint}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </aside>

          {/* Step content with fade transition (keyed by step) */}
          <div key={step} className="step-anim min-h-0 overflow-auto p-6">
            {step === 1 && <StepBasic name={name} setName={setName} intake={intake} setIntake={setIntake} consent={consent} setConsent={setConsent} />}
            {step === 2 && <StepTests selected={selectedTests} setSelected={setSelectedTests} testSessionMap={testSessionMap} setTestSessionMap={setTestSessionMap} sessionsDraft={sessionsDraft} />}
            {step === 3 && (
              <StepSessions
                selectedTests={selectedTests}
                sessionsDraft={sessionsDraft}
                setSessionsDraft={setSessionsDraft}
                testSessionMap={testSessionMap}
                setTestSessionMap={setTestSessionMap}
                draggingTestId={draggingTestId}
                setDraggingTestId={setDraggingTestId}
                onTestDragStart={handleTestDragStart}
                onSessionDrop={handleSessionDrop}
              />
            )}
            {step === 4 && <StepScales selectedTests={selectedTests} selectedScaleKeys={selectedScaleKeys} setSelectedScaleKeys={setSelectedScaleKeys} />}
            {step === 5 && <StepProfile profileFields={profileFields} setProfileFields={setProfileFields} />}
          </div>
        </div>

        {/* Footer — progress bar + counters + buttons */}
        <footer className="border-t border-[var(--color-border)]">
          {/* progress bar */}
          <div className="h-1 w-full bg-[var(--color-muted)]">
            <div
              className="h-full bg-[var(--color-primary)] transition-all duration-300 ease-out"
              style={{ width: `${(step / STEPS.length) * 100}%` }}
            />
          </div>
          <div className="flex items-center justify-between gap-4 px-6 py-3">
            <div className="flex min-w-0 items-center gap-3 text-[11px] text-[var(--color-muted-foreground)]">
              <Counter label="검사" value={counters.tests} />
              <span className="text-[var(--color-border)]">·</span>
              <Counter label="세션" value={counters.sessions} />
              <span className="text-[var(--color-border)]">·</span>
              <Counter label="척도" value={counters.scales} />
              <span className="text-[var(--color-border)]">·</span>
              <Counter label="인적사항" value={counters.profile} />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={onClose}>닫기</Button>
              {step > 1 && <Button variant="outline" onClick={goPrev}><IconChevronLeft size={14} /> 이전</Button>}
              {!isLast && <Button onClick={goNext}>다음 <IconChevronRight size={14} /></Button>}
              {isLast && <Button onClick={onClose}>생성</Button>}
            </div>
          </div>
        </footer>
      </section>
    </div>
  );
}

function Counter({ label, value }) {
  return (
    <span className="flex items-center gap-1">
      <span className="text-[var(--color-muted-foreground)]">{label}</span>
      <span className={cn(
        "inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums",
        value > 0 ? "bg-[var(--color-foreground)] text-white" : "bg-[var(--color-muted)] text-[var(--color-muted-foreground)]"
      )}>
        {value}
      </span>
    </span>
  );
}

/* ===== Step 1 ===== */
function StepBasic({ name, setName, intake, setIntake, consent, setConsent }) {
  return (
    <div className="flex max-w-xl flex-col gap-5">
      <SectionHeader title="기본 정보" hint="검사 이름과 운영 방식을 정합니다." />
      <Field label="검사 이름" hint="목록에서 식별할 이름. 최대 120자.">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="예: STS 파일럿-초등용" maxLength={120} />
      </Field>
      <Field label="내담자 등록 방식" hint="자동 생성 허용은 검사 링크에서 등록과 배정을 진행합니다.">
        <Select value={intake} onChange={(e) => setIntake(e.target.value)}>
          <option value="pre_registered_only">사전 등록 필수</option>
          <option value="auto_create">검사 진행 시 자동 생성 허용</option>
        </Select>
      </Field>
      <Field label="개인정보동의" hint="동의서 내용은 설정 메뉴에서 관리합니다.">
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <Checkbox checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          수검 전 개인정보 수집·이용 동의 받기
        </label>
      </Field>
    </div>
  );
}

/* ===== Step 2 ===== */
const CATALOG = [
  { id: "STS",     name: "정서·사회성 검사",   items: "초등 4-6, 중학생", count: 32  },
  { id: "MMPI-2",  name: "다면적 인성검사",    items: "성인 표준",        count: 567 },
  { id: "K-WISC",  name: "아동 지능검사",      items: "4-6학년",          count: 180 },
  { id: "CES-D",   name: "우울척도",           items: "단축형",           count: 20  },
  { id: "STAI",    name: "상태특성 불안검사",  items: "청소년",           count: 40  },
];
function StepTests({ selected, setSelected, testSessionMap, setTestSessionMap, sessionsDraft }) {
  const toggle = (id) => {
    setSelected((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      setTestSessionMap((prevMap) => {
        const m = { ...prevMap };
        if (next.includes(id)) m[id] = m[id] || sessionsDraft[0]?.local_id || "session_1";
        else delete m[id];
        return m;
      });
      return next;
    });
  };
  return (
    <div className="flex flex-col gap-4">
      <SectionHeader title="검사 선택" hint="생성할 커스텀 검사에 포함할 검사군을 고릅니다. 여러 개 선택 가능." />
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
        {CATALOG.map((t) => {
          const on = selected.includes(t.id);
          return (
            <button
              key={t.id}
              onClick={() => toggle(t.id)}
              className={cn(
                "group relative flex items-start gap-3 rounded-lg border p-3 text-left transition-all duration-150",
                on
                  ? "border-[var(--color-primary)] bg-[hsl(215_70%_35%/0.04)] shadow-[0_0_0_3px_hsl(215_70%_35%/0.12)]"
                  : "border-[var(--color-border)] bg-white hover:border-[var(--color-foreground)]/20 hover:bg-[var(--color-accent)] hover:-translate-y-px"
              )}
            >
              {on && (
                <span className="absolute right-2.5 top-2.5 flex size-5 items-center justify-center rounded-full bg-[var(--color-primary)] text-white shadow-sm">
                  <IconCheck size={12} />
                </span>
              )}
              <span className={cn(
                "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border transition-colors",
                on ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white" : "border-[var(--color-input)] bg-white"
              )}>
                {on && <IconCheck size={12} />}
              </span>
              <span className="flex min-w-0 flex-col gap-0.5 pr-6">
                <span className="flex items-center gap-2">
                  <span className="rounded bg-[var(--color-muted)] px-1.5 py-0.5 font-mono text-[11px] font-semibold tracking-wide">{t.id}</span>
                  <span className="text-sm font-medium">{t.name}</span>
                </span>
                <span className="text-xs text-[var(--color-muted-foreground)]">실시구간: {t.items} · 총 {t.count}문항</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ===== Step 3 — 세션 구성 (드래그 앤 드롭) =====
 * Each session has a stable color hue, used for both the chip and the drop zone accent
 */
const SESSION_PALETTE = [
  { ring: "hsl(215 70% 35%)",  bg: "hsl(215 70% 35% / 0.06)" },   // primary blue
  { ring: "hsl(160 55% 36%)",  bg: "hsl(160 55% 36% / 0.06)" },   // teal-green
  { ring: "hsl(280 50% 45%)",  bg: "hsl(280 50% 45% / 0.06)" },   // purple
  { ring: "hsl(35 91% 43%)",   bg: "hsl(35 91% 43% / 0.06)" },    // amber
  { ring: "hsl(340 70% 45%)",  bg: "hsl(340 70% 45% / 0.06)" },   // rose
];
function StepSessions({ selectedTests, sessionsDraft, setSessionsDraft, testSessionMap, setTestSessionMap, draggingTestId, setDraggingTestId, onTestDragStart, onSessionDrop }) {
  const [hotZone, setHotZone] = React.useState(null);

  const addSession = () => {
    setSessionsDraft((prev) => [
      ...prev,
      {
        local_id: `session_${Date.now()}_${prev.length + 1}`,
        title: `${prev.length + 1}차 세션`,
        description: "이 세션의 검사 안내를 확인한 뒤 응답을 시작합니다.",
      },
    ]);
  };
  const updateSession = (id, patch) =>
    setSessionsDraft((prev) => prev.map((s) => (s.local_id === id ? { ...s, ...patch } : s)));
  const removeSession = (id) => {
    if (sessionsDraft.length <= 1) return;
    const fallback = sessionsDraft.find((s) => s.local_id !== id)?.local_id || "session_1";
    setSessionsDraft((prev) => prev.filter((s) => s.local_id !== id));
    setTestSessionMap((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((tid) => { if (next[tid] === id) next[tid] = fallback; });
      return next;
    });
  };
  const sessionColor = (idx) => SESSION_PALETTE[idx % SESSION_PALETTE.length];

  if (selectedTests.length === 0) {
    return <Empty title="세션 구성" hint="이전 단계에서 검사를 먼저 선택해주세요." body="선택된 검사가 없습니다." />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <SectionHeader title="세션 구성" hint="검사 칩을 세션 카드로 드래그해 배정합니다." />
        <Button variant="outline" size="sm" onClick={addSession}><IconPlus size={12} /> 세션</Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        {/* Draggable test chips — colored by their assigned session */}
        <aside className="flex flex-col gap-2 self-start rounded-md border border-[var(--color-border)] bg-[hsl(210_40%_98%)] p-3">
          <div className="flex items-baseline justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">선택한 검사</p>
            <span className="text-[11px] text-[var(--color-muted-foreground)]">{selectedTests.length}개</span>
          </div>
          <p className="text-[11px] leading-relaxed text-[var(--color-muted-foreground)]">아래 칩을 우측 세션 카드로 드래그해서 배정하세요.</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {selectedTests.map((testId) => {
              const sIdx = sessionsDraft.findIndex((s) => s.local_id === testSessionMap[testId]);
              const c = sessionColor(sIdx);
              const beingDragged = draggingTestId === testId;
              return (
                <button
                  key={testId}
                  type="button"
                  draggable
                  onDragStart={(e) => onTestDragStart(e, testId)}
                  onDragEnd={() => setDraggingTestId(null)}
                  title={`${sessionsDraft[sIdx]?.title || "미배정"}에 배정됨`}
                  style={{ borderColor: c.ring, background: c.bg }}
                  className={cn(
                    "group flex cursor-grab items-center gap-1.5 rounded-md border px-2 py-1.5 font-mono text-[11px] font-semibold shadow-sm transition-transform duration-150 active:cursor-grabbing active:scale-95",
                    beingDragged && "opacity-30"
                  )}
                >
                  <IconGrip size={11} className="text-[var(--color-muted-foreground)] group-hover:text-[var(--color-foreground)]" />
                  {testId}
                </button>
              );
            })}
          </div>
        </aside>

        {/* Session drop zones */}
        <div className="flex flex-col gap-3">
          {sessionsDraft.map((session, index) => {
            const sessionTestIds = selectedTests.filter((t) => testSessionMap[t] === session.local_id);
            const c = sessionColor(index);
            const isDragHot = !!draggingTestId;
            const isHover = hotZone === session.local_id && isDragHot;
            return (
              <div
                key={session.local_id}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  if (hotZone !== session.local_id) setHotZone(session.local_id);
                }}
                onDragLeave={() => setHotZone((z) => (z === session.local_id ? null : z))}
                onDrop={(e) => { onSessionDrop(e, session.local_id); setHotZone(null); }}
                style={isHover ? { borderColor: c.ring, background: c.bg, transform: "scale(1.005)" } : undefined}
                className={cn(
                  "rounded-lg border bg-white p-3 transition-all duration-150",
                  !isHover && isDragHot && "border-dashed",
                  !isHover && "border-[var(--color-border)]"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full" style={{ background: c.ring }} aria-hidden />
                    <span className="text-xs font-semibold text-[var(--color-muted-foreground)]">세션 {index + 1}</span>
                  </div>
                  {sessionsDraft.length > 1 && (
                    <button onClick={() => removeSession(session.local_id)} className="text-xs text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--color-destructive)]">삭제</button>
                  )}
                </div>
                <div className="mt-2 grid gap-2">
                  <Input value={session.title} onChange={(e) => updateSession(session.local_id, { title: e.target.value })} placeholder="세션 이름" maxLength={80} />
                  <Textarea rows={2} value={session.description} onChange={(e) => updateSession(session.local_id, { description: e.target.value })} placeholder="세션 시작 전 보여줄 검사 안내 문구" maxLength={500} />
                </div>
                <div
                  className={cn(
                    "mt-2 flex min-h-9 flex-wrap items-center gap-1.5 rounded border-2 border-dashed p-1.5 transition-colors",
                    isHover ? "border-transparent" : "border-[var(--color-border)] bg-[hsl(210_40%_96.1%/0.4)]"
                  )}
                  style={isHover ? { borderColor: c.ring } : undefined}
                >
                  {sessionTestIds.length === 0 && (
                    <span className="px-1 text-[11px] text-[var(--color-muted-foreground)]">
                      {isHover ? "여기에 놓아주세요" : "검사 칩을 여기로 드래그"}
                    </span>
                  )}
                  {sessionTestIds.map((tid) => (
                    <span
                      key={tid}
                      style={{ borderColor: c.ring, background: c.bg }}
                      className="rounded border px-2 py-0.5 font-mono text-[11px] font-semibold"
                    >
                      {tid}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ===== Step 4 — 척도 선택 (tri-state) ===== */
const SCALE_TREE = {
  STS: [
    { cond: "초등 4-6학년", count: 32, scales: [
      { code: "EXT",  name: "외현화 척도", items: 12 },
      { code: "INT",  name: "내재화 척도", items: 10 },
      { code: "PEER", name: "또래 관계",   items: 10 },
    ]},
    { cond: "중학생", count: 40, scales: [
      { code: "SCH", name: "학교 적응", items: 15 },
      { code: "FAM", name: "가족 관계", items: 12 },
      { code: "SLF", name: "자아 개념", items: 13 },
    ]},
  ],
  "MMPI-2": [
    { cond: "성인 표준", count: 567, scales: [
      { code: "L",  name: "L (부인)",        items: 15 },
      { code: "F",  name: "F (비전형)",       items: 60 },
      { code: "K",  name: "K (방어성)",       items: 30 },
      { code: "Hs", name: "Hs (건강염려증)",  items: 32 },
      { code: "D",  name: "D (우울)",         items: 57 },
      { code: "Hy", name: "Hy (히스테리)",    items: 60 },
    ]},
  ],
  "K-WISC":  [{ cond: "4-6학년", count: 180, scales: [{ code: "VC", name: "언어이해", items: 30 },{ code: "PR", name: "지각추론", items: 35 }] }],
  "CES-D":   [{ cond: "단축형",  count: 20,  scales: [{ code: "CESD", name: "전체 척도", items: 20 }] }],
  "STAI":    [{ cond: "청소년",  count: 40,  scales: [{ code: "S", name: "상태 불안", items: 20 },{ code: "T", name: "특성 불안", items: 20 }] }],
};

function StepScales({ selectedTests, selectedScaleKeys, setSelectedScaleKeys }) {
  const [expanded, setExpanded] = React.useState(() => new Set(selectedTests));
  const toggleExpand = (id) => setExpanded((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const allScalesOf = (testId) => (SCALE_TREE[testId] || []).flatMap((c) => c.scales.map((s) => `${testId}::${s.code}`));
  const countOf = (testId) => allScalesOf(testId).filter((k) => selectedScaleKeys.has(k)).length;
  const totalOf = (testId) => allScalesOf(testId).length;

  const toggleScale = (key) => {
    setSelectedScaleKeys((prev) => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  };
  const setAllForTest = (testId, on) => {
    setSelectedScaleKeys((prev) => {
      const n = new Set(prev);
      allScalesOf(testId).forEach((k) => (on ? n.add(k) : n.delete(k)));
      return n;
    });
  };

  if (selectedTests.length === 0) {
    return <Empty title="척도 선택" hint="이전 단계에서 검사를 먼저 선택해주세요." body="선택된 검사가 없습니다." />;
  }

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader title="척도 선택" hint="검사 선택 후 펼쳐지는 트리에서 사용할 척도를 고릅니다." />
      <div className="flex flex-col gap-2">
        {selectedTests.map((testId) => {
          const tree = SCALE_TREE[testId] || [];
          const isOpen = expanded.has(testId);
          const sel = countOf(testId);
          const tot = totalOf(testId);
          const triState = sel === 0 ? "off" : sel === tot ? "on" : "indeterminate";
          const pct = tot ? (sel / tot) * 100 : 0;
          return (
            <div key={testId} className="overflow-hidden rounded-lg border border-[var(--color-border)] bg-white">
              <div className="flex items-center gap-2 px-3 py-2.5">
                <TriCheckbox
                  state={triState}
                  onChange={() => setAllForTest(testId, triState !== "on")}
                  aria-label={`${testId} 전체 선택`}
                />
                <button onClick={() => toggleExpand(testId)} className="flex flex-1 items-center justify-between gap-2 text-left">
                  <span className="flex items-center gap-2">
                    <span className="text-[var(--color-muted-foreground)]">{isOpen ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}</span>
                    <span className="rounded bg-[var(--color-muted)] px-1.5 py-0.5 font-mono text-[11px] font-semibold">{testId}</span>
                    <span className="text-xs text-[var(--color-muted-foreground)]">실시구간 {tree.length}개 · 척도 {tot}개</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="hidden h-1 w-20 rounded-full bg-[var(--color-muted)] sm:block">
                      <span className="block h-full rounded-full bg-[var(--color-primary)] transition-all duration-300" style={{ width: `${pct}%` }} />
                    </span>
                    <span className="tabular-nums text-xs font-medium">{sel}<span className="text-[var(--color-muted-foreground)]">/{tot}</span></span>
                  </span>
                </button>
              </div>
              {isOpen && (
                <div className="flex flex-col gap-2 border-t border-[var(--color-border)] bg-[hsl(210_40%_96.1%/0.4)] p-2">
                  {tree.map((cn_) => (
                    <div key={cn_.cond} className="rounded border border-[var(--color-border)] bg-white">
                      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-2.5 py-1.5">
                        <span className="text-xs font-medium">{cn_.cond}</span>
                        <span className="text-[11px] text-[var(--color-muted-foreground)]">{cn_.count}문항</span>
                      </div>
                      <div className="flex flex-col">
                        {cn_.scales.map((sc) => {
                          const k = `${testId}::${sc.code}`;
                          const on = selectedScaleKeys.has(k);
                          return (
                            <label key={sc.code} className={cn(
                              "flex cursor-pointer items-center gap-2 px-2.5 py-1.5 text-sm transition-colors",
                              on ? "bg-[hsl(215_70%_35%/0.04)]" : "hover:bg-[var(--color-accent)]"
                            )}>
                              <Checkbox checked={on} onChange={() => toggleScale(k)} />
                              <span className="font-mono text-[11px] text-[var(--color-muted-foreground)]">{sc.code}</span>
                              <span>{sc.name}</span>
                              <span className="ml-auto text-[11px] text-[var(--color-muted-foreground)]">{sc.items}문항</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ===== Step 5 ===== */
function StepProfile({ profileFields, setProfileFields }) {
  const addField = () =>
    setProfileFields((prev) => [...prev, { id: `p${Date.now()}`, label: "", type: "short_text", required: false }]);
  const updateField = (id, p) =>
    setProfileFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...p } : f)));
  const removeField = (id) =>
    setProfileFields((prev) => prev.filter((f) => f.id !== id));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <SectionHeader title="추가 인적사항" hint="검사 URL에서 받을 추가 정보 항목을 정의합니다." />
        <Button variant="outline" size="sm" onClick={addField}><IconPlus size={12} /> 항목 추가</Button>
      </div>

      <div className="flex flex-col gap-2">
        {profileFields.length === 0 && (
          <div className="rounded-lg border-2 border-dashed border-[var(--color-border)] bg-[hsl(210_40%_98%)] p-8 text-center">
            <p className="text-sm font-medium text-[var(--color-foreground)]">추가 인적사항이 없습니다</p>
            <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">필요하면 위 ＋ 버튼으로 항목을 추가하세요.</p>
          </div>
        )}
        {profileFields.map((f) => (
          <div key={f.id} className="rounded-lg border border-[var(--color-border)] bg-white p-3 transition-shadow hover:shadow-[0_1px_2px_0_rgb(0_0_0/0.04)]">
            <div className="grid gap-2 md:grid-cols-2">
              <Input value={f.label} onChange={(e) => updateField(f.id, { label: e.target.value })} placeholder="항목명 (예: 학교명)" maxLength={60} />
              <Select value={f.type} onChange={(e) => updateField(f.id, { type: e.target.value })}>
                <option value="short_text">짧은 텍스트</option>
                <option value="long_text">긴 텍스트</option>
                <option value="number">숫자</option>
                <option value="date">날짜</option>
                <option value="select">단일 선택</option>
                <option value="multi_select">다중 선택</option>
                <option value="phone">전화번호</option>
                <option value="email">이메일</option>
              </Select>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox checked={f.required} onChange={(e) => updateField(f.id, { required: e.target.checked })} />
                필수 입력
              </label>
              <button onClick={() => removeField(f.id)} className="text-xs text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--color-destructive)]">항목 삭제</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ===== Bits ===== */
function SectionHeader({ title, hint }) {
  return (
    <div>
      <h4 className="text-base font-semibold leading-tight">{title}</h4>
      {hint && <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">{hint}</p>}
    </div>
  );
}
function Field({ label, hint, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium">{label}</label>
      {children}
      {hint && <p className="text-xs text-[var(--color-muted-foreground)]">{hint}</p>}
    </div>
  );
}
function Empty({ title, hint, body }) {
  return (
    <div className="flex flex-col gap-4">
      <SectionHeader title={title} hint={hint} />
      <div className="rounded-lg border-2 border-dashed border-[var(--color-border)] bg-[hsl(210_40%_98%)] p-10 text-center">
        <p className="text-sm font-medium text-[var(--color-foreground)]">{body}</p>
        <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">왼쪽 단계 표시기에서 이전 단계로 이동할 수 있습니다.</p>
      </div>
    </div>
  );
}
function TriCheckbox({ state, onChange }) {
  // state: 'on' | 'off' | 'indeterminate'
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (ref.current) ref.current.indeterminate = state === "indeterminate";
  }, [state]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={state === "on"}
      onChange={onChange}
      className="size-4 cursor-pointer accent-[var(--color-primary)]"
    />
  );
}

/* Icon used for the drag handle (mini SVG — keeps the file self-contained) */
function IconGrip({ size = 12, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <circle cx="9" cy="6"  r="1" />
      <circle cx="15" cy="6"  r="1" />
      <circle cx="9" cy="12" r="1" />
      <circle cx="15" cy="12" r="1" />
      <circle cx="9" cy="18" r="1" />
      <circle cx="15" cy="18" r="1" />
    </svg>
  );
}

Object.assign(window, { CreateTestModal });
