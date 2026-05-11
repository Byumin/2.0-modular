/**
 * CreateTestModal — 검사 생성 모달 redesign (v2)
 *
 * Source of truth: Byumin/2.0-modular @ harness-engineering
 *   - frontend/src/pages/TestManagement.tsx (lines 1022-1390)
 *   - 현재 production 라벨: 1.검사 선택 / 2.세션 구성 / 3.척도 선택 + 기본 정보 + 추가 인적사항
 *   - 6 섹션 dense 2-column grid → 단계별 wizard 로 분해
 *
 * v2 changes (per user feedback m0017):
 *   - 단계 구성: 기본 → 검사 선택 → 세션 → 척도 → 추가 인적사항 (5 steps)
 *   - 좌측 rail에서 "구성 요약" 제거 (단계 표시기만 유지)
 *   - 드래그 앤 드롭 유지 — step 3 (세션) 화면이 좌(검사 칩)/우(세션 drop zones) split.
 *     production handlers 그대로: handleTestDragStart / handleSessionDrop / draggingTestId
 *
 * Visual rules from DESIGN.md preserved:
 *   - max-w-5xl rounded-lg modal, bg-black/40 overlay
 *   - Tailwind theme tokens (admin palette — primary blue, NOT teal)
 *   - SectionHeader: text-sm font-semibold + text-xs muted hint
 *   - Existing Button variants only
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

  // ----- Form state — mirrors production state shape -----
  const [name, setName] = React.useState("");
  const [intake, setIntake] = React.useState("pre_registered_only");
  const [consent, setConsent] = React.useState(true);
  const [selectedTests, setSelectedTests] = React.useState(["STS", "MMPI-2"]);

  // sessionsDraft + testSessionMap (production naming)
  const [sessionsDraft, setSessionsDraft] = React.useState([
    { local_id: "session_1", title: "세션 1", description: "표준화된 검사 안내를 확인한 뒤 응답을 시작합니다." },
    { local_id: "session_2", title: "세션 2", description: "" },
  ]);
  const [testSessionMap, setTestSessionMap] = React.useState({ STS: "session_1", "MMPI-2": "session_2" });
  const [draggingTestId, setDraggingTestId] = React.useState(null);

  // scale selection (mocked counts for the demo)
  const [selectedScales, setSelectedScales] = React.useState({ STS: 3, "MMPI-2": 8 });

  // profile fields
  const [profileFields, setProfileFields] = React.useState([
    { id: "p1", label: "학교명", type: "short_text", required: true },
  ]);

  if (!open) return null;

  // ----- Drag handlers (verbatim from production) -----
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6" role="dialog" aria-modal="true">
      <section className="flex max-h-full w-full max-w-5xl flex-col rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] shadow-lg overflow-hidden">

        {/* Header */}
        <header className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold leading-tight">검사 생성</h3>
            <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">
              {STEPS[step - 1].title} · 단계 {step}/{STEPS.length}
            </p>
          </div>
          <button onClick={onClose} aria-label="닫기" className="flex size-8 items-center justify-center rounded-md text-[var(--color-muted-foreground)] hover:bg-[var(--color-accent)] hover:text-[var(--color-foreground)]">
            <IconX size={16} />
          </button>
        </header>

        {/* Body */}
        <div className="grid min-h-0 flex-1 grid-cols-[220px_1fr] overflow-hidden">

          {/* Left rail — steps only (no summary, per user request) */}
          <aside className="flex flex-col gap-2 border-r border-[var(--color-border)] bg-[hsl(210_40%_98%)] p-4 overflow-auto">
            <p className="px-1 pb-1 text-[11px] font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]">단계</p>
            <ol className="flex flex-col gap-1">
              {STEPS.map((s) => {
                const done = s.id < step;
                const active = s.id === step;
                return (
                  <li key={s.key}>
                    <button
                      onClick={() => setStep(s.id)}
                      className={cn(
                        "group flex w-full items-start gap-3 rounded-md px-2.5 py-2 text-left transition-colors",
                        active && "bg-white shadow-[0_1px_0_0_rgb(0_0_0/0.04)] border border-[var(--color-border)]",
                        !active && "hover:bg-white/70"
                      )}
                    >
                      <span className={cn(
                        "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                        done && "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]",
                        active && "bg-[var(--color-foreground)] text-white",
                        !done && !active && "bg-white border border-[var(--color-border)] text-[var(--color-muted-foreground)]"
                      )}>
                        {done ? <IconCheck size={12} /> : s.id}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium leading-tight">{s.title}</span>
                        <span className="mt-0.5 block text-[11px] text-[var(--color-muted-foreground)]">{s.hint}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </aside>

          {/* Step content */}
          <div className="min-h-0 overflow-auto p-6">
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
            {step === 4 && <StepScales selectedTests={selectedTests} selectedScales={selectedScales} setSelectedScales={setSelectedScales} />}
            {step === 5 && <StepProfile profileFields={profileFields} setProfileFields={setProfileFields} />}
          </div>
        </div>

        {/* Footer */}
        <footer className="flex items-center justify-between border-t border-[var(--color-border)] px-6 py-3">
          <span className="text-xs text-[var(--color-muted-foreground)]">
            {step === 1 && "검사 이름과 운영 옵션을 먼저 확인해주세요."}
            {step === 2 && "선택한 검사군이 다음 단계의 세션과 척도 트리에 펼쳐집니다."}
            {step === 3 && "검사 칩을 세션 카드로 드래그하여 배정합니다."}
            {step === 4 && "선택한 척도가 없는 실시구간은 자동으로 제외됩니다."}
            {step === 5 && "검사 URL에서 받을 추가 정보 항목을 정의합니다."}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose}>닫기</Button>
            {step > 1 && <Button variant="outline" onClick={goPrev}><IconChevronLeft size={14} /> 이전</Button>}
            {!isLast && <Button onClick={goNext}>다음 <IconChevronRight size={14} /></Button>}
            {isLast && <Button onClick={onClose}>생성</Button>}
          </div>
        </footer>
      </section>
    </div>
  );
}

/* ===== Step 1: 기본 정보 ===== */
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

/* ===== Step 2: 검사 선택 ===== */
const CATALOG = [
  { id: "STS",     name: "정서·사회성 검사",   items: "초등 4-6, 중학생", count: 32 },
  { id: "MMPI-2",  name: "다면적 인성검사",     items: "성인 표준",        count: 567 },
  { id: "K-WISC",  name: "아동 지능검사",       items: "4-6학년",          count: 180 },
  { id: "CES-D",   name: "우울척도",           items: "단축형",           count: 20 },
  { id: "STAI",    name: "상태특성 불안검사",  items: "청소년",           count: 40 },
];
function StepTests({ selected, setSelected, testSessionMap, setTestSessionMap, sessionsDraft }) {
  const toggle = (id) => {
    setSelected((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      // mirror production: when adding, default to first session; when removing, drop mapping
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
                "flex items-start gap-3 rounded-lg border p-3 text-left transition-colors",
                on ? "border-[var(--color-primary)] bg-[hsl(215_70%_35%/0.04)]" : "border-[var(--color-border)] bg-white hover:bg-[var(--color-accent)]"
              )}
            >
              <span className={cn(
                "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border",
                on ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white" : "border-[var(--color-input)] bg-white"
              )}>
                {on && <IconCheck size={12} />}
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="flex items-center gap-2">
                  <span className="font-mono text-xs font-semibold">{t.id}</span>
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

/* ===== Step 3: 세션 구성 (드래그 앤 드롭 유지) =====
 * Layout: left = "선택한 검사" 칩 list (draggable), right = session cards (drop zones)
 */
function StepSessions({ selectedTests, sessionsDraft, setSessionsDraft, testSessionMap, setTestSessionMap, draggingTestId, setDraggingTestId, onTestDragStart, onSessionDrop }) {
  const addSession = () => {
    setSessionsDraft((prev) => [
      ...prev,
      {
        local_id: `session_${Date.now()}_${prev.length + 1}`,
        title: `세션 ${prev.length + 1}`,
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

  if (selectedTests.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <SectionHeader title="세션 구성" hint="이전 단계에서 검사를 먼저 선택해주세요." />
        <div className="rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-muted)] p-6 text-center text-sm text-[var(--color-muted-foreground)]">
          선택된 검사가 없습니다.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <SectionHeader title="세션 구성" hint="검사 칩을 세션 카드로 드래그해 배정합니다." />
        <Button variant="outline" size="sm" onClick={addSession}><IconPlus size={12} /> 세션</Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        {/* Draggable test chips */}
        <aside className="flex flex-col gap-2 self-start rounded-md border border-[var(--color-border)] bg-[hsl(210_40%_98%)] p-3">
          <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]">선택한 검사</p>
          <p className="text-[11px] text-[var(--color-muted-foreground)]">아래 칩을 드래그</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {selectedTests.map((testId) => {
              const session = sessionsDraft.find((s) => s.local_id === testSessionMap[testId]);
              return (
                <button
                  key={testId}
                  type="button"
                  draggable
                  onDragStart={(e) => onTestDragStart(e, testId)}
                  onDragEnd={() => setDraggingTestId(null)}
                  title={`${session?.title || "세션 1"}에 배정됨`}
                  className={cn(
                    "cursor-grab rounded-md border bg-white px-2.5 py-1.5 font-mono text-[11px] font-semibold shadow-sm transition-colors hover:border-[var(--color-primary)]/40 active:cursor-grabbing",
                    draggingTestId === testId && "opacity-50"
                  )}
                >
                  ⋮⋮ {testId}
                </button>
              );
            })}
          </div>
        </aside>

        {/* Session drop zones */}
        <div className="flex flex-col gap-2">
          {sessionsDraft.map((session, index) => {
            const sessionTestIds = selectedTests.filter((t) => testSessionMap[t] === session.local_id);
            const dragHot = !!draggingTestId;
            return (
              <div
                key={session.local_id}
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
                onDrop={(e) => onSessionDrop(e, session.local_id)}
                className={cn(
                  "rounded-md border bg-white p-3 transition-colors",
                  dragHot ? "border-[var(--color-primary)]/40 bg-[hsl(215_70%_35%/0.04)]" : "border-[var(--color-border)]"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-[var(--color-muted-foreground)]">세션 {index + 1}</span>
                  {sessionsDraft.length > 1 && (
                    <button onClick={() => removeSession(session.local_id)} className="text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-destructive)]">삭제</button>
                  )}
                </div>
                <div className="mt-2 grid gap-2">
                  <Input value={session.title} onChange={(e) => updateSession(session.local_id, { title: e.target.value })} placeholder="세션 이름" maxLength={80} />
                  <Textarea rows={2} value={session.description} onChange={(e) => updateSession(session.local_id, { description: e.target.value })} placeholder="세션 시작 전 보여줄 검사 안내 문구" maxLength={500} />
                </div>
                <div className="mt-2 flex min-h-7 flex-wrap items-center gap-1.5 rounded border border-dashed border-[var(--color-border)] bg-[hsl(210_40%_96.1%/0.4)] p-1.5">
                  {sessionTestIds.length === 0 && (
                    <span className="px-1 text-[11px] text-[var(--color-muted-foreground)]">검사 칩을 여기로 드래그</span>
                  )}
                  {sessionTestIds.map((tid) => (
                    <span key={tid} className="rounded bg-[var(--color-muted)] px-2 py-0.5 font-mono text-[11px] font-semibold">{tid}</span>
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

/* ===== Step 4: 척도 선택 ===== */
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
function StepScales({ selectedTests, selectedScales }) {
  const [expanded, setExpanded] = React.useState(() => new Set(selectedTests));
  const toggle = (id) => setExpanded((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  if (selectedTests.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <SectionHeader title="척도 선택" hint="이전 단계에서 검사를 먼저 선택해주세요." />
        <div className="rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-muted)] p-6 text-center text-sm text-[var(--color-muted-foreground)]">
          선택된 검사가 없습니다.
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <SectionHeader title="척도 선택" hint="검사 선택 후 펼쳐지는 트리에서 사용할 척도를 고릅니다." />
      <div className="flex flex-col gap-2">
        {selectedTests.map((testId) => {
          const tree = SCALE_TREE[testId] || [];
          const open = expanded.has(testId);
          return (
            <div key={testId} className="rounded-md border border-[var(--color-border)] bg-white">
              <button onClick={() => toggle(testId)} className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left">
                <span className="flex items-center gap-2">
                  <span>{open ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}</span>
                  <span className="font-mono text-xs font-semibold">{testId}</span>
                  <span className="text-xs text-[var(--color-muted-foreground)]">· {tree.reduce((a, b) => a + b.scales.length, 0)}개 척도 · 실시구간 {tree.length}개</span>
                </span>
                <span className="text-xs text-[var(--color-muted-foreground)]">선택 {selectedScales[testId] || 0}</span>
              </button>
              {open && (
                <div className="flex flex-col gap-2 border-t border-[var(--color-border)] bg-[hsl(210_40%_96.1%/0.4)] p-2">
                  {tree.map((cn_) => (
                    <div key={cn_.cond} className="rounded border border-[var(--color-border)] bg-white">
                      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-2.5 py-1.5">
                        <span className="text-xs font-medium">{cn_.cond}</span>
                        <span className="text-[11px] text-[var(--color-muted-foreground)]">{cn_.count}문항</span>
                      </div>
                      <div className="flex flex-col">
                        {cn_.scales.map((sc) => (
                          <label key={sc.code} className="flex cursor-pointer items-center gap-2 px-2.5 py-1.5 text-sm hover:bg-[var(--color-accent)]">
                            <Checkbox defaultChecked={Math.random() > 0.4} />
                            <span className="font-mono text-[11px] text-[var(--color-muted-foreground)]">{sc.code}</span>
                            <span>{sc.name}</span>
                            <span className="ml-auto text-[11px] text-[var(--color-muted-foreground)]">{sc.items}문항</span>
                          </label>
                        ))}
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

/* ===== Step 5: 추가 인적사항 ===== */
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
          <p className="rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-muted)] p-6 text-center text-xs text-[var(--color-muted-foreground)]">
            추가 인적사항이 없습니다.
          </p>
        )}
        {profileFields.map((f) => (
          <div key={f.id} className="rounded-md border border-[var(--color-border)] bg-white p-3">
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
              <button onClick={() => removeField(f.id)} className="text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-destructive)]">항목 삭제</button>
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
      <h4 className="text-sm font-semibold leading-tight">{title}</h4>
      {hint && <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">{hint}</p>}
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

Object.assign(window, { CreateTestModal });
