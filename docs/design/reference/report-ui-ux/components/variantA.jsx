// Variant A — 검사별 탭 (Tab per Test)
//
// 구조:
//   ProfileHeader (전체에 공통)
//   KPIStrip
//   Tab bar: [전체 비교] [K-PSI-4-SF] [PAT-2] [PCT]
//   - "전체 비교" 탭: CrossTestBars + 각 검사 mini-radar 카드
//   - "검사별" 탭: 해당 검사의 헤더 + TProfileChart + 척도 리스트 (drill-down)
//
// 강점: 검사별 정보 경계가 가장 분명. 한 번에 한 검사만 집중.
// 약점: 검사 간 비교를 보려면 별도 탭으로 전환해야 함.

function VariantA({ report }) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | test_id
  const [drillScale, setDrillScale] = useState(null); // { scale, parentName, testId }

  const tests = report.tests;

  return (
    <div className="relative w-full h-full bg-slate-50 text-slate-900 font-sans flex flex-col" style={{ fontFamily: "Pretendard, 'Noto Sans KR', system-ui, sans-serif" }}>
      <ProfileHeader report={report} />

      {/* Tab navigation */}
      <div className="border-b border-slate-200 bg-white px-6">
        <nav className="flex gap-1 -mb-px">
          <TabButton
            label="전체 비교"
            sub={`${tests.length}개 검사`}
            active={activeTab === 'overview'}
            onClick={() => setActiveTab('overview')}
          />
          {tests.map((test) => {
            const concernCount = test.scales.filter((s) => s.tone === 'negative').length;
            return (
              <TabButton
                key={test.test_id}
                label={test.test_id}
                sub={`${test.scales.length}개 척도`}
                badge={concernCount > 0 ? concernCount : null}
                badgeTone={concernCount > 0 ? 'negative' : 'neutral'}
                active={activeTab === test.test_id}
                onClick={() => setActiveTab(test.test_id)}
              />
            );
          })}
        </nav>
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[1180px] mx-auto px-8 py-6">
          {activeTab === 'overview' ? (
            <OverviewTab
              report={report}
              onSelectTest={(tid) => setActiveTab(tid)}
              onSelectScale={(test, scale, parent) => setDrillScale({ scale, testId: test.test_id, parentName: parent })}
            />
          ) : (
            <TestTab
              test={tests.find((t) => t.test_id === activeTab)}
              onSelectScale={(scale, parent) =>
                setDrillScale({ scale, testId: activeTab, parentName: parent })
              }
            />
          )}
        </div>
      </main>

      {drillScale && (
        <DetailDrawer
          scale={drillScale.scale}
          parentName={drillScale.parentName}
          testId={drillScale.testId}
          onClose={() => setDrillScale(null)}
        />
      )}
    </div>
  );
}

function TabButton({ label, sub, active, onClick, badge, badgeTone }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 pt-3 pb-3 -mb-px border-b-2 transition flex items-center gap-2 ${
        active
          ? 'border-[hsl(215,70%,35%)] text-[hsl(215,70%,35%)] font-semibold'
          : 'border-transparent text-slate-500 hover:text-slate-900'
      }`}
    >
      <span className="text-sm">{label}</span>
      {sub && <span className="text-[10px] text-slate-400 font-medium">{sub}</span>}
      {badge != null && (
        <span className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 ${
          badgeTone === 'negative' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
        }`}>{badge}</span>
      )}
    </button>
  );
}

// ─── Overview Tab ────────────────────────────────────────────────────────

function OverviewTab({ report, onSelectTest, onSelectScale }) {
  return (
    <div className="space-y-6">
      {/* 실시한 검사 정보 (좌) + 핵심 발견 (우) */}
      <div className="grid grid-cols-2 gap-4">
        <SectionCard
          title="실시한 검사 정보"
          subtitle="각 검사의 목적, 대상, 척도 정의. 검사를 펼치면 척도별 측정 개념을 확인할 수 있습니다."
        >
          <TestInfoPanel report={report} onSelectTest={onSelectTest} />
        </SectionCard>

        <SectionCard
          title="핵심 발견"
          subtitle="평균(T=50)에서 가장 멀리 떨어진 척도들을 자동 추출."
        >
          <Highlights
            report={report}
            onScaleClick={(test, scale) => onSelectScale(test, scale)}
          />
        </SectionCard>
      </div>

      {/* 검사별 세로 막대 그래프 */}
      <SectionCard
        title="검사별 결과 한눈에"
        subtitle="모든 척도의 T점수를 세로 막대로 비교. 색상은 척도의 방향성 기준 우려 수준입니다. 막대 클릭 시 척도 상세."
        action={(
          <div className="flex items-center gap-3 text-[10px] text-slate-500">
            <Legend color="#dc2626" label="우려" />
            <Legend color="#64748b" label="보통" />
            <Legend color="#059669" label="양호" />
          </div>
        )}
      >
        <TestComparisonChart
          report={report}
          onSelectScale={(test, scale) => onSelectScale(test, scale)}
        />
      </SectionCard>

      {/* 검사 간 비교 — 척도별 행 (접기 가능) */}
      <SectionCard
        title="검사 간 비교"
        subtitle="모든 척도의 T점수와 위치. 척도별로 ↑/↓/⇔ 방향이 다르며, 색상은 척도 자신의 방향성 기준입니다."
        action={(
          <div className="flex items-center gap-3 text-[10px] text-slate-500">
            <Legend color="#86efac" label="양호" />
            <Legend color="#fcd34d" label="경계" />
            <Legend color="#f87171" label="우려" />
          </div>
        )}
      >
        <CrossTestBreakdown
          report={report}
          onSelectScale={(test, scale, parent) => onSelectScale(test, scale, parent)}
          onSelectTest={onSelectTest}
        />
      </SectionCard>
    </div>
  );
}

// ─── TestComparisonChart — 검사별 세로 막대 그래프 ───────────────────────

function TestComparisonChart({ report, onSelectScale }) {
  const containerRef = useRef(null);
  const [width, setWidth] = useState(1100);
  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(720, e.contentRect.width)));
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const tests = report.tests;
  const totalScales = tests.reduce((a, t) => a + t.scales.length, 0);
  const gapW = 32; // gap between test groups
  const totalGapW = (tests.length - 1) * gapW;

  const padding = { l: 38, r: 20, t: 36, b: 64 };
  const innerW = Math.max(600, width - padding.l - padding.r);
  const innerH = 240;
  const barAreaW = innerW - totalGapW;
  const barSlot = barAreaW / totalScales;
  const barGap = Math.min(14, barSlot * 0.4);
  const barW = barSlot - barGap;

  const yFor = (t) => padding.t + innerH - ((t - T_MIN) / (T_MAX - T_MIN)) * innerH;
  const baseY = padding.t + innerH;
  const yTicks = [20, 30, 40, 50, 60, 70, 80];
  const totalHeight = baseY + padding.b;

  let runningScaleIdx = 0;

  return (
    <div ref={containerRef} className="w-full">
      <svg width={width} height={totalHeight} className="block">
        {/* y grid */}
        {yTicks.map((t) => (
          <g key={t}>
            <line
              x1={padding.l} y1={yFor(t)}
              x2={padding.l + innerW} y2={yFor(t)}
              stroke={t === 50 ? '#94a3b8' : '#e2e8f0'}
              strokeWidth={t === 50 ? 1 : 0.8}
              strokeDasharray={t === 50 ? '4 4' : ''}
            />
            <text
              x={padding.l - 6} y={yFor(t) + 3}
              textAnchor="end" fontSize="10" fill="#94a3b8" fontWeight="500"
            >{t}</text>
          </g>
        ))}
        {/* M=50 label */}
        <text x={padding.l + innerW + 4} y={yFor(50) + 3} fontSize="9" fill="#64748b" fontWeight="600">M=50</text>

        {/* Test groups */}
        {tests.map((test, ti) => {
          const groupStart = padding.l + (runningScaleIdx * barSlot) + (ti * gapW);
          const groupWidth = test.scales.length * barSlot;
          const groupEnd = groupStart + groupWidth;
          const localStart = runningScaleIdx;
          runningScaleIdx += test.scales.length;

          return (
            <g key={test.test_id}>
              {/* Group header band */}
              <rect
                x={groupStart} y={6}
                width={groupWidth} height={22}
                fill="#f1f5f9" rx="4"
              />
              <text
                x={groupStart + groupWidth / 2} y={21}
                textAnchor="middle" fontSize="11" fontWeight="700" fill="#0f172a"
              >{test.test_id}</text>

              {/* Divider after the group */}
              {ti < tests.length - 1 && (
                <line
                  x1={groupEnd + gapW / 2} y1={6}
                  x2={groupEnd + gapW / 2} y2={baseY + 48}
                  stroke="#cbd5e1" strokeDasharray="3 4" strokeWidth="1"
                />
              )}

              {/* Bars */}
              {test.scales.map((s, si) => {
                const x = groupStart + si * barSlot + barGap / 2;
                const t = s.t_score ?? 50;
                const y = yFor(t);
                const h = baseY - y;
                const tc = toneClass(s.tone);
                const truncName = s.name.length > 6 ? s.name.slice(0, 5) + '…' : s.name;
                return (
                  <g
                    key={s.code}
                    className="cursor-pointer"
                    onClick={() => onSelectScale(test, s)}
                  >
                    {/* faint background */}
                    <rect x={x} y={padding.t} width={barW} height={innerH} fill="transparent" />
                    {/* bar */}
                    <rect
                      x={x} y={Math.min(y, yFor(50))}
                      width={barW} height={Math.abs(yFor(50) - y)}
                      fill={tc.accent} fillOpacity="0.92"
                      rx="2"
                    />
                    {/* If T < 50, bar goes from 50 down; If T > 50, bar from T up to 50 (we render as above) */}
                    {/* T-score label above/below bar */}
                    <text
                      x={x + barW / 2}
                      y={t >= 50 ? y - 4 : y + 12}
                      textAnchor="middle" fontSize="10" fontWeight="700"
                      fill={tc.accent}
                    >{t.toFixed(0)}</text>
                    {/* Scale code */}
                    <text
                      x={x + barW / 2} y={baseY + 14}
                      textAnchor="middle" fontSize="9" fill="#94a3b8" fontFamily="monospace"
                    >{s.code}</text>
                    {/* Scale name (truncated) */}
                    <text
                      x={x + barW / 2} y={baseY + 28}
                      textAnchor="middle" fontSize="10" fill="#334155" fontWeight="500"
                    >{truncName}</text>
                    {/* Tooltip via title */}
                    <title>{`${test.test_id} · ${s.name}\nT = ${t}, 백분위 ${s.percentile ?? '—'}%\n${s.category ?? ''} · ${dirLabel(s.direction)}`}</title>
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── TestInfoPanel — 실시 검사 정보 (목적·대상·척도 정의) ───────────────

function TestInfoPanel({ report, onSelectTest }) {
  const [openTest, setOpenTest] = useState(report.tests[0]?.test_id ?? null);
  return (
    <div className="space-y-2">
      {report.tests.map((test) => {
        const isOpen = openTest === test.test_id;
        return (
          <div key={test.test_id} className="rounded-lg border border-slate-200 overflow-hidden">
            {/* Card header */}
            <button
              onClick={() => setOpenTest(isOpen ? null : test.test_id)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 bg-slate-50/60 hover:bg-slate-100 transition text-left"
            >
              <span className={`text-slate-400 text-xs transition-transform ${isOpen ? 'rotate-90' : ''}`}>▶</span>
              <span className="text-[10px] font-mono bg-white border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded shrink-0">
                {test.test_id}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-bold text-slate-900 truncate">{test.full_name}</div>
                <div className="text-[10px] text-slate-500 truncate">{test.description}</div>
              </div>
            </button>

            {isOpen && (
              <div className="px-4 py-3.5 bg-white space-y-3">
                {/* Purpose */}
                {test.purpose && (
                  <div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">검사 목적</div>
                    <p className="text-[12px] leading-relaxed text-slate-700">{test.purpose}</p>
                  </div>
                )}

                {/* Meta grid */}
                {test.meta && (
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 rounded-md bg-slate-50 px-3 py-2.5">
                    {test.meta.target && (
                      <MetaRow label="대상" value={test.meta.target} />
                    )}
                    {test.meta.format && (
                      <MetaRow label="형식" value={test.meta.format} />
                    )}
                    {test.meta.time && (
                      <MetaRow label="소요" value={test.meta.time} />
                    )}
                    {test.meta.norm && (
                      <MetaRow label="규준" value={test.meta.norm} />
                    )}
                  </div>
                )}

                {/* Scale definitions */}
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    척도 정의 ({test.scales.length}개)
                  </div>
                  <ul className="space-y-1.5">
                    {test.scales.map((s) => (
                      <li key={s.code} className="text-[12px] leading-snug">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-[9px] font-mono text-slate-400 shrink-0 mt-0.5">{s.code}</span>
                          <span className="font-semibold text-slate-800">{s.name}</span>
                        </div>
                        {s.definition && (
                          <p className="text-[11px] text-slate-600 ml-[34px]">{s.definition}</p>
                        )}
                        {s.facets?.length > 0 && (
                          <ul className="ml-[34px] mt-1 space-y-0.5">
                            {s.facets.map((f) => (
                              <li key={f.code} className="text-[11px]">
                                <span className="text-slate-300">└</span>{' '}
                                <span className="font-semibold text-slate-700">{f.name}</span>
                                {f.definition && (
                                  <span className="text-slate-500"> · {f.definition}</span>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={() => onSelectTest(test.test_id)}
                  className="text-[11px] font-medium text-[hsl(215,70%,35%)] hover:underline"
                >
                  {test.test_id} 결과 자세히 보기 →
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function MetaRow({ label, value }) {
  return (
    <div className="flex items-baseline gap-2 min-w-0">
      <span className="text-[10px] font-semibold text-slate-500 shrink-0">{label}</span>
      <span className="text-[11px] text-slate-700 truncate">{value}</span>
    </div>
  );
}

// ─── DomainSummary — 검사 영역별 평균 T + 자동 요약 ─────────────────────

function DomainSummary({ report, onSelectTest }) {
  // Compute per-test mean T and assign a tone band.
  const rows = report.tests.map((test) => {
    const meanT = test.scales.reduce((a, s) => a + (s.t_score ?? 0), 0) / test.scales.length;
    // For aggregate band we look at distance from 50.
    let band, bandTone;
    if (meanT >= 60) { band = '높음'; bandTone = 'negative'; }
    else if (meanT >= 55) { band = '경계 (높음)'; bandTone = 'negative'; }
    else if (meanT <= 40) { band = '낮음'; bandTone = 'negative'; }
    else if (meanT <= 45) { band = '경계 (낮음)'; bandTone = 'negative'; }
    else { band = '평균 범위'; bandTone = 'neutral'; }
    const concerns = test.scales.filter((s) => s.tone === 'negative').length;
    return { test, meanT, band, bandTone, concerns };
  });

  // Auto comment derived from data.
  const totalConcerns = rows.reduce((a, r) => a + r.concerns, 0);
  const mostElevated = [...rows].sort((a, b) => Math.abs(b.meanT - 50) - Math.abs(a.meanT - 50))[0];
  const commentLines = [];
  if (mostElevated) {
    if (mostElevated.meanT >= 55) {
      commentLines.push(`${mostElevated.test.test_id} 영역의 평균이 ${mostElevated.meanT.toFixed(1)}로 가장 높게 보고되었습니다.`);
    } else if (mostElevated.meanT <= 45) {
      commentLines.push(`${mostElevated.test.test_id} 영역의 평균이 ${mostElevated.meanT.toFixed(1)}로 가장 낮게 보고되었습니다.`);
    }
  }
  if (totalConcerns > 0) {
    commentLines.push(`전체 ${rows.reduce((a, r) => a + r.test.scales.length, 0)}개 척도 중 ${totalConcerns}개에서 우려 수준이 관찰되어, 척도별 해석 검토가 권장됩니다.`);
  } else {
    commentLines.push('전반적으로 우려 수준의 척도는 관찰되지 않았습니다.');
  }

  return (
    <div className="space-y-3">
      {/* Per-test bars */}
      <div className="space-y-2.5">
        {rows.map(({ test, meanT, band, bandTone, concerns }) => {
          const pct = ((meanT - T_MIN) / (T_MAX - T_MIN)) * 100;
          const tc = toneClass(bandTone);
          return (
            <button
              key={test.test_id}
              onClick={() => onSelectTest(test.test_id)}
              className="w-full text-left rounded-lg hover:bg-slate-50 px-2 py-1.5 transition group"
            >
              <div className="flex items-baseline justify-between mb-1">
                <span className="flex items-baseline gap-1.5 min-w-0">
                  <span className="text-[12px] font-bold text-slate-900">{test.test_id}</span>
                  <span className="text-[10px] text-slate-400 truncate">{test.full_name}</span>
                </span>
                <span className="flex items-center gap-1.5 shrink-0">
                  <span className={`text-[10px] font-semibold rounded-full px-1.5 py-0.5 ${tc.badge}`}>
                    {band}
                  </span>
                  <span className={`text-[13px] font-bold tabular-nums leading-none ${tc.text}`}>
                    {meanT.toFixed(1)}
                  </span>
                </span>
              </div>
              <div className="relative h-2 rounded-full bg-slate-100 overflow-hidden">
                {/* zone tints */}
                <div className="absolute inset-y-0 left-0 w-1/3 bg-blue-50" />
                <div className="absolute inset-y-0 left-1/3 w-1/3 bg-slate-50" />
                <div className="absolute inset-y-0 right-0 w-1/3 bg-red-50" />
                {/* M=50 tick */}
                <div className="absolute inset-y-0 left-1/2 w-px bg-slate-300" />
                {/* mean marker */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 border-white shadow ring-1 ring-slate-900/10"
                  style={{ left: `${pct}%`, transform: 'translate(-50%, -50%)', background: tc.accent }}
                />
              </div>
              <div className="flex items-center justify-between mt-1 text-[9px] text-slate-400">
                <span>20</span>
                <span className="text-slate-500 font-medium">
                  {test.scales.length}개 척도 · 주의 {concerns}
                </span>
                <span>80</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Auto comment */}
      <div className="rounded-lg bg-slate-50 border-l-2 border-[hsl(215,70%,35%)] px-3 py-2.5">
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
          자동 요약
        </div>
        <p className="text-[12px] leading-relaxed text-slate-700">
          {commentLines.join(' ')}
        </p>
      </div>
    </div>
  );
}

// ─── CrossTestBreakdown — 척도별 라벨 + zone bar, 위계 표시 (접기/펴기) ──

function CrossTestBreakdown({ report, onSelectScale, onSelectTest }) {
  const [collapsed, setCollapsed] = useState({});
  const toggle = (tid) => setCollapsed((c) => ({ ...c, [tid]: !c[tid] }));

  return (
    <div className="space-y-4">
      {report.tests.map((test, ti) => {
        const concerns = test.scales.filter((s) => s.tone === 'negative').length;
        const meanT = (test.scales.reduce((a, s) => a + (s.t_score ?? 0), 0) / test.scales.length).toFixed(1);
        const isCollapsed = !!collapsed[test.test_id];
        return (
          <div key={test.test_id} className="rounded-lg border border-slate-200 overflow-hidden">
            {/* Test group header — chevron area toggles; nav button is separate */}
            <div className="flex items-stretch bg-slate-50/80 hover:bg-slate-100 transition">
              <button
                onClick={() => toggle(test.test_id)}
                className="flex-1 flex items-center gap-3 px-3 py-2.5 text-left"
              >
                <span className={`text-slate-400 text-xs transition-transform ${isCollapsed ? '' : 'rotate-90'}`}>▶</span>
                <div className="w-7 h-7 rounded-md bg-[hsl(215,70%,35%)] text-white flex items-center justify-center text-[11px] font-bold tabular-nums shrink-0">
                  {String(ti + 1).padStart(2, '0')}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[13px] font-bold text-slate-900">{test.test_id}</span>
                    <span className="text-[11px] text-slate-500 truncate">{test.full_name}</span>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {test.scales.length}개 척도 · 평균 T {meanT}
                    {concerns > 0 && <span className="ml-1.5 text-red-600 font-semibold">· 주의 {concerns}</span>}
                  </div>
                </div>
              </button>
              <button
                onClick={() => onSelectTest(test.test_id)}
                className="px-3 text-[11px] font-medium text-[hsl(215,70%,35%)] hover:bg-blue-50 transition shrink-0 border-l border-slate-200"
              >
                {test.test_id} 탭으로 →
              </button>
            </div>

            {/* Scale rows */}
            {!isCollapsed && (
              <div className="divide-y divide-slate-100">
                {test.scales.map((s) => (
                  <React.Fragment key={s.code}>
                    <BreakdownRow
                      scale={s}
                      onClick={() => onSelectScale(test, s)}
                      isParent={(s.facets?.length ?? 0) > 0}
                    />
                    {s.facets?.map((f) => (
                      <BreakdownRow
                        key={f.code}
                        scale={f}
                        level={1}
                        onClick={() => onSelectScale(test, f, s.name)}
                      />
                    ))}
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function BreakdownRow({ scale, onClick, level = 0, isParent = false }) {
  const tc = toneClass(scale.tone);
  return (
    <button
      onClick={onClick}
      className={`w-full grid grid-cols-[260px_1fr_88px_88px] gap-4 items-center px-2 py-2 text-left hover:bg-slate-50 transition group ${
        isParent ? 'bg-slate-50/40' : ''
      }`}
    >
      {/* Scale name + direction */}
      <div className="min-w-0 flex items-center gap-2" style={{ paddingLeft: level * 18 }}>
        {level > 0 && (
          <span className="text-slate-300 text-xs leading-none">└</span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className={`truncate ${
              level > 0 ? 'text-[12px] text-slate-700' : isParent ? 'text-[13px] font-semibold text-slate-900' : 'text-[13px] font-medium text-slate-800'
            }`}>{scale.name}</span>
            <span className="text-[9px] font-mono text-slate-400 shrink-0">{scale.code}</span>
          </div>
          <div className="mt-0.5">
            <DirectionTag direction={scale.direction} />
          </div>
        </div>
      </div>

      {/* Zone bar */}
      <div className="min-w-0 pt-3">
        <ZoneBar
          tScore={scale.t_score}
          direction={scale.direction}
          height={level > 0 ? 'sm' : 'md'}
          showTicks={false}
          showLabels={false}
        />
      </div>

      {/* T-score */}
      <div className="text-right">
        <div className={`text-base font-bold tabular-nums leading-none ${tc.text}`}>
          {scale.t_score?.toFixed?.(0) ?? '—'}
        </div>
        <div className="text-[9px] text-slate-400 mt-0.5">
          {scale.percentile != null ? `${scale.percentile.toFixed(0)}%ile` : '—'}
        </div>
      </div>

      {/* Category badge */}
      <div className="text-right">
        <CategoryBadge category={scale.category} tone={scale.tone} />
      </div>
    </button>
  );
}

function Legend({ color, label }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="w-2.5 h-2.5 rounded" style={{ background: color }} />
      {label}
    </span>
  );
}

function SectionCard({ title, subtitle, action, children }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900">{title}</h2>
          {subtitle && <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

// ─── Test Tab ────────────────────────────────────────────────────────────

function TestTab({ test, onSelectScale }) {
  if (!test) return null;
  const concerns = test.scales.filter((s) => s.tone === 'negative');
  const meanT = (test.scales.reduce((a, s) => a + (s.t_score ?? 0), 0) / test.scales.length).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Test header */}
      <div className="rounded-xl border border-slate-200 bg-white px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{test.test_id}</span>
              <span className="text-[11px] text-slate-500">{test.scales.length}개 척도 · 응답률 {Math.round(test.response_rate * 100)}%</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900">{test.full_name}</h1>
            <p className="text-[12px] text-slate-500 mt-1">{test.description}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 shrink-0">
            <Metric label="주의 척도" value={concerns.length} tone={concerns.length > 0 ? 'negative' : 'neutral'} />
            <Metric label="평균 T" value={meanT} />
          </div>
        </div>
      </div>

      {/* 1) 검사 정보 — 목적 + 척도 정의 */}
      <SectionCard
        title="검사 정보"
        subtitle="이 검사의 목적과 각 척도가 측정하는 개념을 정리합니다."
      >
        <TestInfoBlock test={test} />
      </SectionCard>

      {/* 2) 결과 차트 — parent = bar, facets = line, 계층 구분선 */}
      <SectionCard
        title="결과 차트"
        subtitle="주요 척도는 막대로, 하위척도는 꺾은선으로 표시합니다. 계층이 나뉘는 곳에 구분선이 있습니다."
      >
        <TestHierarchyChart test={test} onSelectScale={onSelectScale} />
      </SectionCard>

      {/* 3) 척도별 해석 문구 */}
      <SectionCard
        title="척도별 해석"
        subtitle="각 척도의 점수와 그 의미. 척도/하위척도의 위계가 들여쓰기로 구분됩니다."
      >
        <TestInterpretationList test={test} onSelectScale={onSelectScale} />
      </SectionCard>
    </div>
  );
}

// ─── TestInfoBlock — 목적 + 메타 + 척도 정의 (요약 always-on) ────────────

function TestInfoBlock({ test }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-6">
      <div className="space-y-4">
        {test.purpose && (
          <div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              검사 목적
            </div>
            <p className="text-[13px] leading-relaxed text-slate-700">{test.purpose}</p>
          </div>
        )}
        {test.meta && (
          <div className="rounded-lg bg-slate-50 px-4 py-3 grid grid-cols-2 gap-x-3 gap-y-2">
            {test.meta.target && <MetaRow label="대상" value={test.meta.target} />}
            {test.meta.format && <MetaRow label="형식" value={test.meta.format} />}
            {test.meta.time && <MetaRow label="소요" value={test.meta.time} />}
            {test.meta.norm && <MetaRow label="규준" value={test.meta.norm} />}
          </div>
        )}
      </div>

      <div>
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
          척도 정의 ({test.scales.length}개)
        </div>
        <ul className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
          {test.scales.map((s) => (
            <li key={s.code} className="text-[12px] leading-snug">
              <div className="flex items-baseline gap-1.5">
                <span className="text-[9px] font-mono text-slate-400 shrink-0">{s.code}</span>
                <span className="font-semibold text-slate-800">{s.name}</span>
              </div>
              {s.definition && (
                <p className="text-[11px] text-slate-600 ml-[34px] mt-0.5">{s.definition}</p>
              )}
              {s.facets?.length > 0 && (
                <ul className="ml-[34px] mt-1 space-y-0.5">
                  {s.facets.map((f) => (
                    <li key={f.code} className="text-[11px]">
                      <span className="text-slate-300">└</span>{' '}
                      <span className="font-semibold text-slate-700">{f.name}</span>
                      {f.definition && (
                        <span className="text-slate-500"> · {f.definition}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ─── TestHierarchyChart — 통합 차트: parent(막대) + facets(꺾은선) ─────
//   하나의 SVG, 단일 Y축. 부모 척도 패널 → 점선 구분선 → 하위척도 패널.
//   하위척도 line은 양쪽에 inner padding을 두어 끝 점이 패널 경계에 붙지 않게 함.

function TestHierarchyChart({ test, onSelectScale }) {
  const containerRef = useRef(null);
  const [width, setWidth] = useState(960);
  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(640, e.contentRect.width)));
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const parents = test.scales;
  const facetGroups = parents
    .filter((p) => (p.facets?.length ?? 0) > 0)
    .map((p) => ({ parent: p, facets: p.facets }));

  const padding = { l: 50, r: 20, t: 44, b: 60 };
  const innerH = 240;
  const panelGap = 18;
  const minSlotW = 78;

  const parentSlots = parents.length;
  const facetSlotsTotal = facetGroups.reduce((a, g) => a + g.facets.length, 0);
  const totalSlots = parentSlots + facetSlotsTotal;
  const totalGap = facetGroups.length * panelGap;

  // Expand SVG width if not enough room for min slot width
  const availInner = Math.max(0, width - padding.l - padding.r - totalGap);
  const slotW = Math.max(minSlotW, availInner / Math.max(1, totalSlots));
  const innerW = totalSlots * slotW + totalGap;
  const svgW = innerW + padding.l + padding.r;

  const yFor = (t) => padding.t + innerH - ((t - T_MIN) / (T_MAX - T_MIN)) * innerH;
  const baseY = padding.t + innerH;
  const totalH = baseY + padding.b;
  const truncName = (n, max = 7) => (n.length > max ? n.slice(0, max - 1) + '…' : n);

  // Compute panel positions
  let cursor = padding.l;
  const parentPanel = { start: cursor, width: parentSlots * slotW };
  cursor += parentPanel.width;
  const fpLayouts = facetGroups.map((g) => {
    cursor += panelGap;
    const w = g.facets.length * slotW;
    const layout = { ...g, start: cursor, width: w };
    cursor += w;
    return layout;
  });

  return (
    <div ref={containerRef} className="w-full overflow-x-auto">
      <svg width={svgW} height={totalH} className="block">
        {/* Background zone bands (across all panels) */}
        <rect x={padding.l} y={padding.t} width={innerW} height={yFor(60) - padding.t} fill="#fee2e2" opacity="0.18" />
        <rect x={padding.l} y={yFor(60)} width={innerW} height={yFor(40) - yFor(60)} fill="#f1f5f9" opacity="0.4" />
        <rect x={padding.l} y={yFor(40)} width={innerW} height={padding.t + innerH - yFor(40)} fill="#dbeafe" opacity="0.18" />

        {/* Y-axis grid (single, shared) */}
        {[20, 30, 40, 50, 60, 70, 80].map((t) => (
          <g key={t}>
            <line
              x1={padding.l} y1={yFor(t)}
              x2={padding.l + innerW} y2={yFor(t)}
              stroke={t === 50 ? '#94a3b8' : '#e2e8f0'}
              strokeWidth={t === 50 ? 1 : 0.7}
              strokeDasharray={t === 50 ? '4 4' : ''}
            />
            <text
              x={padding.l - 6} y={yFor(t) + 3}
              textAnchor="end" fontSize="10" fill="#94a3b8" fontWeight="500"
            >{t}</text>
          </g>
        ))}

        {/* Parent panel label */}
        <g>
          <rect
            x={parentPanel.start} y={padding.t - 28}
            width={parentPanel.width} height={20}
            fill="#f1f5f9" rx="4"
          />
          <text
            x={parentPanel.start + parentPanel.width / 2} y={padding.t - 14}
            textAnchor="middle" fontSize="10" fontWeight="700" fill="#475569"
          >주요 척도 · 막대</text>
        </g>

        {/* Parent bars */}
        {parents.map((p, i) => {
          const x = parentPanel.start + i * slotW;
          const barInset = slotW * 0.3;
          const barW = slotW - barInset * 2;
          const t = p.t_score ?? 50;
          const y = yFor(t);
          const tc = toneClass(p.tone);
          return (
            <g
              key={p.code}
              className="cursor-pointer"
              onClick={() => onSelectScale(p)}
            >
              <rect
                x={x + barInset} y={Math.min(y, yFor(50))}
                width={barW} height={Math.abs(yFor(50) - y)}
                fill={tc.accent} fillOpacity="0.92" rx="3"
              />
              <text
                x={x + slotW / 2}
                y={t >= 50 ? y - 5 : y + 13}
                textAnchor="middle" fontSize="11" fontWeight="700" fill={tc.accent}
              >{t.toFixed(0)}</text>
              <text
                x={x + slotW / 2} y={baseY + 14}
                textAnchor="middle" fontSize="9" fill="#94a3b8" fontFamily="monospace"
              >{p.code}</text>
              <text
                x={x + slotW / 2} y={baseY + 28}
                textAnchor="middle" fontSize="11" fill="#334155" fontWeight="500"
              >{truncName(p.name)}</text>
              <title>{`${p.name}\nT=${t}, 백분위 ${p.percentile ?? '—'}%\n${p.category ?? ''} · ${dirLabel(p.direction)}`}</title>
            </g>
          );
        })}

        {/* Facet panels */}
        {fpLayouts.map((fp) => {
          const dividerX = fp.start - panelGap / 2;
          const linePad = Math.max(28, fp.width * 0.18); // 양쪽 여백
          const usableW = Math.max(0, fp.width - 2 * linePad);
          const xForFacet = (i) => {
            if (fp.facets.length === 1) return fp.start + fp.width / 2;
            return fp.start + linePad + (i / (fp.facets.length - 1)) * usableW;
          };
          const pts = fp.facets.map((f, i) => [xForFacet(i), yFor(f.t_score ?? 50), f]);
          const pathD = pts.length >= 2
            ? 'M ' + pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' L ')
            : null;
          const parentY = fp.parent.t_score != null ? yFor(fp.parent.t_score) : null;

          return (
            <g key={fp.parent.code}>
              {/* Vertical divider */}
              <line
                x1={dividerX} y1={padding.t - 32}
                x2={dividerX} y2={baseY + 36}
                stroke="#cbd5e1" strokeDasharray="3 4" strokeWidth="1"
              />

              {/* Panel label */}
              <rect
                x={fp.start} y={padding.t - 28}
                width={fp.width} height={20}
                fill="#fef3c7" rx="4" opacity="0.6"
              />
              <text
                x={fp.start + fp.width / 2} y={padding.t - 14}
                textAnchor="middle" fontSize="10" fontWeight="700" fill="#854d0e"
              >{fp.parent.name} 하위척도 · 꺾은선</text>

              {/* Parent reference line within panel */}
              {parentY != null && (
                <g>
                  <line
                    x1={fp.start + 6} y1={parentY}
                    x2={fp.start + fp.width - 6} y2={parentY}
                    stroke="#1e40af" strokeWidth="1.3" strokeDasharray="5 3" opacity="0.5"
                  />
                  <text
                    x={fp.start + fp.width - 8} y={parentY - 4}
                    textAnchor="end" fontSize="9" fontWeight="700" fill="#1e40af"
                  >부모 T={fp.parent.t_score?.toFixed(0)}</text>
                </g>
              )}

              {/* Connecting line */}
              {pathD && (
                <path d={pathD} fill="none" stroke="#0f172a" strokeWidth="2" strokeLinejoin="round" />
              )}

              {/* Points */}
              {pts.map(([x, y, f], i) => {
                const tc = toneClass(f.tone);
                return (
                  <g
                    key={f.code}
                    className="cursor-pointer"
                    onClick={() => onSelectScale(f, fp.parent.name)}
                  >
                    <circle cx={x} cy={y} r="7" fill="#fff" stroke={tc.accent} strokeWidth="2.5" />
                    <circle cx={x} cy={y} r="3.5" fill={tc.accent} />
                    <text
                      x={x} y={y - 12}
                      textAnchor="middle" fontSize="11" fontWeight="700" fill={tc.accent}
                    >{f.t_score?.toFixed(0) ?? '—'}</text>
                    <text
                      x={x} y={baseY + 14}
                      textAnchor="middle" fontSize="9" fill="#94a3b8" fontFamily="monospace"
                    >{f.code}</text>
                    <text
                      x={x} y={baseY + 28}
                      textAnchor="middle" fontSize="11" fill="#334155" fontWeight="500"
                    >{truncName(f.name)}</text>
                    <title>{`${f.name}\nT=${f.t_score}, 백분위 ${f.percentile ?? '—'}%\n${f.category ?? ''} · ${dirLabel(f.direction)}`}</title>
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── TestInterpretationList — 척도별 해석 문구 ─────────────────────────

function TestInterpretationList({ test, onSelectScale }) {
  return (
    <div className="space-y-3">
      {test.scales.map((s) => {
        const tc = toneClass(s.tone);
        return (
          <div key={s.code} className="rounded-lg border border-slate-200 overflow-hidden">
            {/* Scale header */}
            <button
              onClick={() => onSelectScale(s)}
              className="w-full text-left px-4 py-3 bg-slate-50/60 hover:bg-slate-100 transition flex items-center gap-3"
            >
              <span className="text-[10px] font-mono bg-white border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded shrink-0">
                {s.code}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[14px] font-bold text-slate-900">{s.name}</span>
                  <DirectionTag direction={s.direction} />
                </div>
              </div>
              <span className={`text-base font-bold tabular-nums leading-none shrink-0 ${tc.text}`}>
                T={s.t_score?.toFixed?.(0) ?? '—'}
              </span>
              <CategoryBadge category={s.category} tone={s.tone} size="md" />
            </button>

            {/* Interpretation */}
            {s.interpretation && (
              <div className={`px-4 py-3 border-l-4 ${
                s.tone === 'negative' ? 'border-red-300 bg-red-50/30' :
                s.tone === 'positive' ? 'border-emerald-300 bg-emerald-50/30' :
                'border-slate-300 bg-slate-50/30'
              }`}>
                <p className="text-[13px] leading-relaxed text-slate-700">{s.interpretation}</p>
              </div>
            )}

            {/* Facets */}
            {s.facets?.map((f) => {
              const fc = toneClass(f.tone);
              return (
                <div key={f.code} className="border-t border-slate-100 pl-8">
                  <button
                    onClick={() => onSelectScale(f, s.name)}
                    className="w-full text-left px-3 py-2.5 hover:bg-slate-50 transition flex items-center gap-3"
                  >
                    <span className="text-slate-300 text-xs">└</span>
                    <span className="text-[9px] font-mono text-slate-400 shrink-0">{f.code}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[12px] font-semibold text-slate-800">{f.name}</span>
                        <DirectionTag direction={f.direction} />
                      </div>
                    </div>
                    <span className={`text-[13px] font-bold tabular-nums leading-none shrink-0 ${fc.text}`}>
                      T={f.t_score?.toFixed?.(0) ?? '—'}
                    </span>
                    <CategoryBadge category={f.category} tone={f.tone} />
                  </button>
                  {f.interpretation && (
                    <div className="px-3 pb-3 pt-0 pl-12">
                      <p className="text-[12px] leading-relaxed text-slate-600">{f.interpretation}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

Object.assign(window, { VariantA });
