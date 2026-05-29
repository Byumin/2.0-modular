// Shared components for all three result-page variants.
// All components consume the unified mock data shape from data/mockResults.js.

const { useMemo, useState, useEffect, useRef, useLayoutEffect } = React;

// ──────────────────────────────────────────────────────────────────────────
// Direction & tone helpers
// ──────────────────────────────────────────────────────────────────────────

// Reduce direction to "where on the T-axis is good?" — drives bar coloring.
const dirMode = (direction) => {
  if (direction === 'higher_worse' || direction === 'lower_better') return 'low_is_good';
  if (direction === 'higher_better' || direction === 'lower_worse') return 'high_is_good';
  return 'middle_is_good';
};

const dirLabel = (direction) => {
  switch (direction) {
    case 'higher_worse':   return '↑ 높을수록 우려';
    case 'higher_better':  return '↑ 높을수록 양호';
    case 'lower_worse':    return '↓ 낮을수록 우려';
    case 'lower_better':   return '↓ 낮을수록 양호';
    case 'optimal_middle': return '⇔ 중간이 이상적';
    default: return '';
  }
};

const dirIcon = (direction) => {
  switch (direction) {
    case 'higher_worse':   return '↑';
    case 'higher_better':  return '↑';
    case 'lower_worse':    return '↓';
    case 'lower_better':   return '↓';
    case 'optimal_middle': return '⇔';
    default: return '·';
  }
};

// Tone → color tokens (Tailwind classes for the design system).
const toneClass = (tone) => {
  if (tone === 'negative') return {
    badge: 'bg-red-50 text-red-700 ring-1 ring-red-200',
    chip:  'bg-red-100 text-red-700',
    dot:   'bg-red-500',
    text:  'text-red-700',
    accent:'#dc2626',
    soft:  '#fee2e2',
  };
  if (tone === 'positive') return {
    badge: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    chip:  'bg-emerald-100 text-emerald-700',
    dot:   'bg-emerald-500',
    text:  'text-emerald-700',
    accent:'#059669',
    soft:  '#d1fae5',
  };
  return {
    badge: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
    chip:  'bg-slate-100 text-slate-600',
    dot:   'bg-slate-400',
    text:  'text-slate-600',
    accent:'#64748b',
    soft:  '#f1f5f9',
  };
};

// ──────────────────────────────────────────────────────────────────────────
// CategoryBadge
// ──────────────────────────────────────────────────────────────────────────

function CategoryBadge({ category, tone, size = 'sm' }) {
  if (!category) return null;
  const t = toneClass(tone);
  const sz = size === 'lg'
    ? 'text-xs font-bold px-3 py-1'
    : size === 'md'
    ? 'text-[11px] font-semibold px-2.5 py-0.5'
    : 'text-[10px] font-semibold px-2 py-0.5';
  return <span className={`inline-flex items-center gap-1 rounded-full ${sz} ${t.badge}`}>{category}</span>;
}

// ──────────────────────────────────────────────────────────────────────────
// DirectionTag
// ──────────────────────────────────────────────────────────────────────────

function DirectionTag({ direction }) {
  if (!direction) return null;
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 px-1.5 py-0.5 rounded bg-slate-50 border border-slate-200"
      title={dirLabel(direction)}
    >
      {dirLabel(direction)}
    </span>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// ZoneBar — direction-aware horizontal T-score bar
//
// The bar is divided into 6 ten-point segments (20–80). Coloring follows
// the scale's "good direction":
//   low_is_good     →  green | green | yellow | yellow | red | red
//   high_is_good    →  red | red | yellow | yellow | green | green
//   middle_is_good  →  red | yellow | green | green | yellow | red
// ──────────────────────────────────────────────────────────────────────────

const T_MIN = 20;
const T_MAX = 80;

const ZONE_COLORS = {
  low_is_good: ['#86efac', '#bbf7d0', '#fde68a', '#fcd34d', '#fca5a5', '#f87171'],
  high_is_good: ['#f87171', '#fca5a5', '#fcd34d', '#fde68a', '#bbf7d0', '#86efac'],
  middle_is_good: ['#f87171', '#fcd34d', '#86efac', '#86efac', '#fcd34d', '#f87171'],
};

const ZONE_BG = {
  low_is_good: ['#dcfce7', '#dcfce7', '#fef3c7', '#fef3c7', '#fee2e2', '#fee2e2'],
  high_is_good: ['#fee2e2', '#fee2e2', '#fef3c7', '#fef3c7', '#dcfce7', '#dcfce7'],
  middle_is_good: ['#fee2e2', '#fef3c7', '#dcfce7', '#dcfce7', '#fef3c7', '#fee2e2'],
};

function tPos(t) {
  return Math.min(100, Math.max(0, ((t - T_MIN) / (T_MAX - T_MIN)) * 100));
}

function ZoneBar({ tScore, direction, height = 'md', showTicks = true, showLabels = true }) {
  if (tScore === null || tScore === undefined) {
    return (
      <div className="h-3 rounded bg-slate-100 flex items-center pl-2">
        <span className="text-[10px] text-slate-400">점수 없음</span>
      </div>
    );
  }
  const mode = dirMode(direction);
  const colors = ZONE_BG[mode];
  const pos = tPos(tScore);
  const h = height === 'sm' ? 'h-2.5' : height === 'lg' ? 'h-6' : 'h-4';
  const markerSize = height === 'sm' ? 'w-2.5 h-2.5' : height === 'lg' ? 'w-5 h-5' : 'w-3.5 h-3.5';

  return (
    <div className="w-full">
      <div className="relative">
        <div className={`relative flex ${h} rounded overflow-visible`}>
          {colors.map((c, i) => (
            <div
              key={i}
              className="h-full first:rounded-l last:rounded-r"
              style={{ width: '16.6667%', background: c }}
            />
          ))}
          {/* M=50 reference line */}
          <div className="absolute top-0 bottom-0 left-1/2 w-px bg-slate-400/40" />
          {/* marker */}
          <div
            className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 ${markerSize} rounded-full border-2 border-white shadow-md ring-1 ring-slate-900/10 bg-slate-900`}
            style={{ left: `${pos}%` }}
          />
        </div>
        {/* T-score floating label above marker */}
        {height !== 'sm' && (
          <div
            className="absolute -top-5 -translate-x-1/2 text-[11px] font-bold text-slate-900 leading-none"
            style={{ left: `${pos}%` }}
          >
            {tScore.toFixed(0)}
          </div>
        )}
      </div>
      {showTicks && (
        <div className="flex justify-between text-[9px] text-slate-400 mt-1 px-0.5">
          <span>20</span><span>30</span><span>40</span><span>50</span><span>60</span><span>70</span><span>80</span>
        </div>
      )}
      {showLabels && height !== 'sm' && (
        <div className="grid grid-cols-3 mt-1 text-[9px] font-medium">
          <span className="text-left" style={{ color: mode === 'low_is_good' ? '#059669' : mode === 'high_is_good' ? '#dc2626' : '#dc2626' }}>
            낮음
          </span>
          <span className="text-center" style={{ color: mode === 'middle_is_good' ? '#059669' : '#a16207' }}>
            평균
          </span>
          <span className="text-right" style={{ color: mode === 'high_is_good' ? '#059669' : mode === 'low_is_good' ? '#dc2626' : '#dc2626' }}>
            높음
          </span>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// BellCurve — normal distribution with marker (and shaded "concern" region)
// ──────────────────────────────────────────────────────────────────────────

function BellCurve({ tScore, direction, width = 320, height = 120 }) {
  const M = 50, SD = 10;
  const mode = dirMode(direction);

  // sample the curve
  const points = [];
  const padding = { l: 6, r: 6, t: 8, b: 22 };
  const innerW = width - padding.l - padding.r;
  const innerH = height - padding.t - padding.b;
  const yMax = 1 / (SD * Math.sqrt(2 * Math.PI));

  for (let i = 0; i <= 120; i++) {
    const t = T_MIN + (i / 120) * (T_MAX - T_MIN);
    const y = (1 / (SD * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * ((t - M) / SD) ** 2);
    const x = padding.l + ((t - T_MIN) / (T_MAX - T_MIN)) * innerW;
    const py = padding.t + innerH - (y / yMax) * innerH;
    points.push([x, py]);
  }

  const pathD = 'M ' + points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' L ');
  const areaD = pathD + ` L ${padding.l + innerW},${padding.t + innerH} L ${padding.l},${padding.t + innerH} Z`;

  // Concern shading
  let concernD = null;
  if (mode === 'high_is_good') {
    // bad = T < 40
    const cutoff = 40;
    const cx = padding.l + ((cutoff - T_MIN) / (T_MAX - T_MIN)) * innerW;
    const cps = points.filter(([x]) => x <= cx);
    if (cps.length) concernD = 'M ' + cps.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' L ') + ` L ${cx},${padding.t + innerH} L ${padding.l},${padding.t + innerH} Z`;
  } else if (mode === 'low_is_good') {
    const cutoff = 60;
    const cx = padding.l + ((cutoff - T_MIN) / (T_MAX - T_MIN)) * innerW;
    const cps = points.filter(([x]) => x >= cx);
    if (cps.length) concernD = 'M ' + `${cx},${padding.t + innerH} L ` + cps.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' L ') + ` L ${padding.l + innerW},${padding.t + innerH} Z`;
  } else {
    // middle_is_good — both extremes
    const lc = 40, rc = 60;
    const lcx = padding.l + ((lc - T_MIN) / (T_MAX - T_MIN)) * innerW;
    const rcx = padding.l + ((rc - T_MIN) / (T_MAX - T_MIN)) * innerW;
    const lps = points.filter(([x]) => x <= lcx);
    const rps = points.filter(([x]) => x >= rcx);
    const lpath = lps.length ? 'M ' + lps.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' L ') + ` L ${lcx},${padding.t + innerH} L ${padding.l},${padding.t + innerH} Z` : '';
    const rpath = rps.length ? `M ${rcx},${padding.t + innerH} L ` + rps.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' L ') + ` L ${padding.l + innerW},${padding.t + innerH} Z` : '';
    concernD = lpath + ' ' + rpath;
  }

  // Marker
  const validT = tScore !== null && tScore !== undefined;
  const markerX = validT ? padding.l + ((tScore - T_MIN) / (T_MAX - T_MIN)) * innerW : null;
  const markerY = validT ? padding.t + innerH - ((1 / (SD * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * ((tScore - M) / SD) ** 2)) / yMax * innerH : null;

  // Percentile
  const percentile = validT ? Math.round(50 * (1 + erf((tScore - M) / (SD * Math.sqrt(2))))) : null;

  return (
    <div className="relative">
      <svg width={width} height={height} className="block">
        {/* axes */}
        {[20, 30, 40, 50, 60, 70, 80].map((t) => {
          const x = padding.l + ((t - T_MIN) / (T_MAX - T_MIN)) * innerW;
          return (
            <g key={t}>
              <line x1={x} y1={padding.t + innerH} x2={x} y2={padding.t + innerH + 3} stroke="#cbd5e1" />
              <text x={x} y={padding.t + innerH + 14} textAnchor="middle" fontSize="9" fill="#94a3b8">{t}</text>
            </g>
          );
        })}
        {/* full curve area (faint) */}
        <path d={areaD} fill="#e2e8f0" fillOpacity="0.4" />
        {/* concern region */}
        {concernD && <path d={concernD} fill="#fecaca" fillOpacity="0.7" />}
        {/* curve line */}
        <path d={pathD} fill="none" stroke="#475569" strokeWidth="1.5" />
        {/* mean line */}
        <line
          x1={padding.l + innerW / 2}
          y1={padding.t}
          x2={padding.l + innerW / 2}
          y2={padding.t + innerH}
          stroke="#94a3b8" strokeDasharray="3 3" strokeWidth="1"
        />
        {/* marker */}
        {validT && (
          <g>
            <line x1={markerX} y1={padding.t} x2={markerX} y2={padding.t + innerH} stroke="#0f172a" strokeWidth="1.5" />
            <circle cx={markerX} cy={markerY} r="6" fill="#0f172a" stroke="#fff" strokeWidth="2" />
            <text
              x={markerX} y={markerY - 12}
              textAnchor="middle" fontSize="11" fontWeight="700" fill="#0f172a"
            >T={tScore}</text>
          </g>
        )}
      </svg>
      {validT && (
        <div className="text-[10px] text-slate-500 mt-1 text-center">
          전체 모집단의 상위 <span className="font-semibold text-slate-700">{100 - percentile}%</span> (백분위 {percentile})
        </div>
      )}
    </div>
  );
}

// erf approximation (Abramowitz/Stegun)
function erf(x) {
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x);
  const a1=0.254829592, a2=-0.284496736, a3=1.421413741, a4=-1.453152027, a5=1.061405429, p=0.3275911;
  const t = 1 / (1 + p * x);
  const y = 1 - (((((a5*t + a4)*t) + a3)*t + a2)*t + a1)*t * Math.exp(-x*x);
  return sign * y;
}

// ──────────────────────────────────────────────────────────────────────────
// MiniSparkProfile — small line for use inside test cards
// ──────────────────────────────────────────────────────────────────────────

function MiniSparkProfile({ scales, width = 240, height = 64, color = '#1e40af' }) {
  if (!scales || scales.length === 0) return null;
  const padding = { l: 4, r: 4, t: 8, b: 12 };
  const innerW = width - padding.l - padding.r;
  const innerH = height - padding.t - padding.b;
  const points = scales.map((s, i) => {
    const x = padding.l + (scales.length > 1 ? (i / (scales.length - 1)) * innerW : innerW / 2);
    const t = s.t_score ?? 50;
    const y = padding.t + innerH - ((t - T_MIN) / (T_MAX - T_MIN)) * innerH;
    return [x, y, s];
  });
  const pathD = 'M ' + points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' L ');
  const mid = padding.t + innerH - ((50 - T_MIN) / (T_MAX - T_MIN)) * innerH;
  return (
    <svg width={width} height={height} className="block">
      {/* zone bands */}
      <rect x={padding.l} y={padding.t} width={innerW} height={innerH * 0.333} fill="#fee2e2" opacity="0.4" />
      <rect x={padding.l} y={padding.t + innerH * 0.667} width={innerW} height={innerH * 0.333} fill="#dcfce7" opacity="0.4" />
      <line x1={padding.l} y1={mid} x2={padding.l + innerW} y2={mid} stroke="#94a3b8" strokeDasharray="2 3" strokeWidth="0.5" />
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      {points.map(([x, y, s], i) => (
        <circle key={i} cx={x} cy={y} r="2.5" fill={toneClass(s.tone).accent} stroke="#fff" strokeWidth="1" />
      ))}
    </svg>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// TProfileChart — large line chart for a single test's scales
// ──────────────────────────────────────────────────────────────────────────

function TProfileChart({ scales, height = 280, onScaleClick }) {
  const containerRef = useRef(null);
  const [width, setWidth] = useState(720);
  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(480, e.contentRect.width)));
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const padding = { l: 48, r: 24, t: 28, b: 56 };
  const innerW = Math.max(360, width - padding.l - padding.r);
  const innerH = height - padding.t - padding.b;

  // Y ticks
  const yTicks = [20, 30, 40, 50, 60, 70, 80];
  const yFor = (t) => padding.t + innerH - ((t - T_MIN) / (T_MAX - T_MIN)) * innerH;
  const xFor = (i) => padding.l + (scales.length > 1 ? (i / (scales.length - 1)) * innerW : innerW / 2);

  const pts = scales.map((s, i) => [xFor(i), yFor(s.t_score ?? 50), s]);
  const pathD = 'M ' + pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' L ');

  // band heights
  const lowTop = yFor(40);
  const highBottom = yFor(60);

  return (
    <div ref={containerRef} className="w-full overflow-x-auto">
      <svg width={width} height={height} className="block">
        {/* zone bands */}
        <rect x={padding.l} y={padding.t} width={innerW} height={yFor(60) - padding.t} fill="#fee2e2" opacity="0.35" />
        <rect x={padding.l} y={yFor(60)} width={innerW} height={yFor(40) - yFor(60)} fill="#f1f5f9" opacity="0.5" />
        <rect x={padding.l} y={yFor(40)} width={innerW} height={padding.t + innerH - yFor(40)} fill="#dbeafe" opacity="0.35" />
        {/* M=50 reference */}
        <line x1={padding.l} y1={yFor(50)} x2={padding.l + innerW} y2={yFor(50)} stroke="#94a3b8" strokeDasharray="4 4" strokeWidth="1" />
        {/* y ticks */}
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={padding.l - 4} y1={yFor(t)} x2={padding.l} y2={yFor(t)} stroke="#cbd5e1" />
            <text x={padding.l - 8} y={yFor(t) + 3} textAnchor="end" fontSize="10" fill="#94a3b8">{t}</text>
          </g>
        ))}
        {/* x labels */}
        {scales.map((s, i) => (
          <g key={i} transform={`translate(${xFor(i)},${padding.t + innerH + 16})`}>
            <text textAnchor="middle" fontSize="11" fill="#334155" fontWeight="500">
              {s.name.length > 8 ? s.name.slice(0, 7) + '…' : s.name}
            </text>
            <text textAnchor="middle" fontSize="9" fill="#94a3b8" y="13">{s.code}</text>
          </g>
        ))}
        {/* zone band labels on the right edge */}
        <text x={padding.l + innerW - 4} y={padding.t + 12} fontSize="9" fill="#dc2626" textAnchor="end" fontWeight="600">높음</text>
        <text x={padding.l + innerW - 4} y={(yFor(40) + yFor(60)) / 2 + 3} fontSize="9" fill="#64748b" textAnchor="end" fontWeight="600">평균</text>
        <text x={padding.l + innerW - 4} y={padding.t + innerH - 4} fontSize="9" fill="#1e40af" textAnchor="end" fontWeight="600">낮음</text>
        {/* line + points */}
        <path d={pathD} fill="none" stroke="#1e40af" strokeWidth="2.2" strokeLinejoin="round" />
        {pts.map(([x, y, s], i) => {
          const t = toneClass(s.tone);
          return (
            <g
              key={i}
              className="cursor-pointer"
              onClick={() => onScaleClick && onScaleClick(s, i)}
            >
              <circle cx={x} cy={y} r="8" fill="#fff" stroke={t.accent} strokeWidth="2.5" />
              <circle cx={x} cy={y} r="4" fill={t.accent} />
              <text x={x} y={y - 14} textAnchor="middle" fontSize="11" fontWeight="700" fill={t.accent}>
                {s.t_score?.toFixed?.(0) ?? '—'}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// CrossTestRadar — radar comparison across multiple tests
// Each test contributes one polygon. Axes = union of dimension names
// (we render per-test radars side-by-side for legibility instead of overlaying).
// ──────────────────────────────────────────────────────────────────────────

function TestRadar({ test, size = 240, onScaleClick }) {
  const cx = size / 2, cy = size / 2;
  const r = size / 2 - 28;
  const scales = test.scales;
  const n = scales.length;
  if (n < 3) return null;

  const axisAngle = (i) => -Math.PI / 2 + (i / n) * Math.PI * 2;
  const ringTs = [30, 40, 50, 60, 70];
  const ringR = (t) => r * ((t - T_MIN) / (T_MAX - T_MIN));

  const polyPts = scales.map((s, i) => {
    const t = s.t_score ?? 50;
    const rr = ringR(t);
    const a = axisAngle(i);
    return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr];
  });

  const polyD = 'M ' + polyPts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' L ') + ' Z';

  return (
    <svg width={size} height={size} className="block">
      {/* concentric rings */}
      {ringTs.map((t) => (
        <circle
          key={t}
          cx={cx} cy={cy} r={ringR(t)}
          fill={t === 50 ? '#f1f5f9' : 'none'}
          stroke={t === 50 ? '#94a3b8' : '#e2e8f0'}
          strokeDasharray={t === 50 ? '3 3' : 'none'}
          strokeWidth={t === 50 ? 1 : 0.8}
        />
      ))}
      {/* axes */}
      {scales.map((s, i) => {
        const a = axisAngle(i);
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r;
        const lx = cx + Math.cos(a) * (r + 14);
        const ly = cy + Math.sin(a) * (r + 14);
        const anchor = Math.cos(a) > 0.3 ? 'start' : Math.cos(a) < -0.3 ? 'end' : 'middle';
        return (
          <g key={i}>
            <line x1={cx} y1={cy} x2={x} y2={y} stroke="#e2e8f0" strokeWidth="0.8" />
            <text x={lx} y={ly + 3} fontSize="10" fill="#475569" textAnchor={anchor} fontWeight="500">
              {s.name.length > 7 ? s.name.slice(0, 6) + '…' : s.name}
            </text>
          </g>
        );
      })}
      {/* polygon */}
      <path d={polyD} fill="#1e40af" fillOpacity="0.12" stroke="#1e40af" strokeWidth="1.8" strokeLinejoin="round" />
      {polyPts.map(([x, y], i) => {
        const s = scales[i];
        const tc = toneClass(s.tone);
        return (
          <g
            key={i}
            className="cursor-pointer"
            onClick={() => onScaleClick && onScaleClick(s, i)}
          >
            <circle cx={x} cy={y} r="4.5" fill={tc.accent} stroke="#fff" strokeWidth="1.5" />
          </g>
        );
      })}
      {/* center label */}
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize="10" fill="#94a3b8" fontWeight="600">M=50</text>
    </svg>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// CrossTestBars — grouped horizontal bar showing each test's representative score
// with each scale of the test as a stacked tile, color-coded by tone.
// ──────────────────────────────────────────────────────────────────────────

function CrossTestBars({ tests, onScaleClick }) {
  return (
    <div className="space-y-3">
      {tests.map((test) => {
        const scales = test.scales;
        return (
          <div key={test.test_id} className="grid grid-cols-[110px_1fr] gap-3 items-center">
            <div>
              <div className="text-[11px] font-bold text-slate-700">{test.test_id}</div>
              <div className="text-[10px] text-slate-500">{scales.length}개 척도</div>
            </div>
            <div className="flex h-7 rounded overflow-hidden bg-slate-50 ring-1 ring-slate-200">
              {scales.map((s, i) => {
                const tc = toneClass(s.tone);
                const widthPct = 100 / scales.length;
                return (
                  <button
                    key={i}
                    title={`${s.name}: T=${s.t_score}, ${s.category}`}
                    className="h-full text-[10px] font-bold text-white hover:brightness-110 transition-all flex items-center justify-center border-r border-white/50 last:border-r-0"
                    style={{ width: `${widthPct}%`, background: tc.accent }}
                    onClick={() => onScaleClick && onScaleClick(test, s)}
                  >
                    <span className="truncate px-1">{s.t_score?.toFixed?.(0)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// KPIStrip — top-of-page summary strip
// ──────────────────────────────────────────────────────────────────────────

function KPIStrip({ report, items }) {
  const allScales = report.tests.flatMap((t) => t.scales);
  const concernCount = allScales.filter((s) => s.tone === 'negative').length;
  const idealCount = allScales.filter((s) => s.tone === 'positive').length;
  const defaultItems = [
    { label: '실시 검사', value: report.tests.length, sub: `${allScales.length}개 척도` },
    { label: '주의 필요', value: concernCount, sub: '척도', tone: concernCount > 0 ? 'negative' : 'neutral' },
    { label: '양호 영역', value: idealCount, sub: '척도', tone: idealCount > 0 ? 'positive' : 'neutral' },
    { label: '응답률', value: '100%', sub: `${allScales.length}/${allScales.length}` },
  ];
  const list = items || defaultItems;
  return (
    <div className="grid grid-cols-4 gap-3">
      {list.map((it, i) => {
        const t = toneClass(it.tone || 'neutral');
        return (
          <div key={i} className="rounded-lg border border-slate-200 bg-white px-4 py-3">
            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{it.label}</div>
            <div className={`text-2xl font-bold leading-tight mt-1 ${it.tone ? t.text : 'text-slate-900'}`}>{it.value}</div>
            {it.sub && <div className="text-[10px] text-slate-500 mt-0.5">{it.sub}</div>}
          </div>
        );
      })}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// ProfileHeader — top header with subject info
// ──────────────────────────────────────────────────────────────────────────

function ProfileHeader({ report, variant = 'compact' }) {
  return (
    <header className="flex items-center justify-between px-6 py-3.5 border-b border-slate-200 bg-white">
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-9 w-9 rounded-lg bg-[hsl(215,70%,35%)] text-white flex items-center justify-center font-bold text-sm shrink-0">
          {report.profile.initial}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-bold text-slate-900 truncate">{report.link_name}</div>
          <div className="text-[11px] text-slate-500">
            {report.submitted_at} · {report.profile.name} · {report.profile.gender} · {report.profile.age_text}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button className="text-[11px] font-medium text-slate-600 hover:bg-slate-100 px-3 py-1.5 rounded-md transition">
          PDF 내려받기
        </button>
        <button className="text-[11px] font-medium text-white bg-[hsl(215,70%,35%)] hover:bg-[hsl(215,70%,30%)] px-3 py-1.5 rounded-md transition">
          ⎙ 인쇄
        </button>
      </div>
    </header>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// ScaleRow — compact list row inside a test card
// ──────────────────────────────────────────────────────────────────────────

function ScaleRow({ scale, onClick, level = 0 }) {
  const t = toneClass(scale.tone);
  return (
    <button
      onClick={onClick}
      className="w-full grid grid-cols-[1fr_120px_140px_28px] gap-3 items-center px-3 py-2.5 hover:bg-slate-50 transition text-left border-b border-slate-100 last:border-b-0"
    >
      <div className="min-w-0" style={{ paddingLeft: level * 16 }}>
        <div className="flex items-center gap-1.5">
          {level > 0 && <span className="text-slate-300 text-xs">↳</span>}
          <span className="text-[13px] font-semibold text-slate-800 truncate">{scale.name}</span>
          <span className="text-[10px] font-mono text-slate-400">{scale.code}</span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <DirectionTag direction={scale.direction} />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-sm font-bold tabular-nums ${t.text}`}>{scale.t_score?.toFixed?.(0) ?? '—'}</span>
        <span className="text-[10px] text-slate-400 tabular-nums">/ {scale.percentile?.toFixed?.(0) ?? '—'}%</span>
      </div>
      <div className="min-w-0">
        <ZoneBar tScore={scale.t_score} direction={scale.direction} height="sm" showTicks={false} showLabels={false} />
      </div>
      <CategoryBadge category={scale.category} tone={scale.tone} />
    </button>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// DetailDrawer — slide-in panel for a single scale's detail
// ──────────────────────────────────────────────────────────────────────────

function DetailDrawer({ scale, parentName, testId, onClose }) {
  if (!scale) return null;
  const t = toneClass(scale.tone);
  return (
    <div className="absolute inset-0 z-30 flex">
      <div className="flex-1 bg-slate-900/30 backdrop-blur-sm" onClick={onClose} />
      <aside className="w-[480px] bg-white shadow-2xl h-full overflow-y-auto animate-in slide-in-from-right duration-200">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-3.5 flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-[10px] font-mono text-slate-400">{testId} · {scale.code}</div>
            <div className="text-base font-bold text-slate-900 truncate">{scale.name}</div>
            {parentName && <div className="text-[11px] text-slate-500">{parentName} 하위척도</div>}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-md hover:bg-slate-100 text-slate-500 flex items-center justify-center"
          >✕</button>
        </div>

        <div className="p-5 space-y-5">
          {/* metrics */}
          <div className="grid grid-cols-3 gap-2">
            <Metric label="원점수" value={scale.raw_score} />
            <Metric label="T점수" value={scale.t_score?.toFixed?.(1)} tone={scale.tone} />
            <Metric label="백분위" value={scale.percentile != null ? `${scale.percentile}%` : null} />
          </div>

          {/* zone bar */}
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-700">T점수 위치</h4>
              <DirectionTag direction={scale.direction} />
            </div>
            <div className="pt-5">
              <ZoneBar tScore={scale.t_score} direction={scale.direction} height="lg" />
            </div>
          </div>

          {/* bell curve */}
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h4 className="text-xs font-bold text-slate-700 mb-3">전체 분포에서의 위치</h4>
            <div className="flex justify-center">
              <BellCurve tScore={scale.t_score} direction={scale.direction} width={400} height={140} />
            </div>
          </div>

          {/* interpretation */}
          {scale.interpretation && (
            <div className={`rounded-lg border-l-4 px-4 py-3 ${
              scale.tone === 'negative' ? 'bg-red-50/50 border-red-300' :
              scale.tone === 'positive' ? 'bg-emerald-50/50 border-emerald-300' :
              'bg-slate-50 border-slate-300'
            }`}>
              <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">해석</h4>
              <p className="text-[13px] leading-relaxed text-slate-700">{scale.interpretation}</p>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Highlights — auto-extracted top concerns + positives across all tests
// ──────────────────────────────────────────────────────────────────────────

function Highlights({ report, onScaleClick, concernLimit = 3, positiveLimit = 2 }) {
  const allWithTest = report.tests.flatMap((t) => t.scales.map((s) => ({ ...s, _test: t })));
  const concerns = allWithTest
    .filter((s) => s.tone === 'negative')
    .sort((a, b) => Math.abs((b.t_score ?? 50) - 50) - Math.abs((a.t_score ?? 50) - 50))
    .slice(0, concernLimit);
  const positives = allWithTest.filter((s) => s.tone === 'positive').slice(0, positiveLimit);

  return (
    <div className="space-y-2.5">
      {concerns.length > 0 && (
        <div>
          <div className="flex items-center gap-1 text-[10px] font-bold text-red-700 mb-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            가장 주의가 필요한 영역
          </div>
          <div className="space-y-1">
            {concerns.map((s) => (
              <button
                key={`${s._test.test_id}-${s.code}`}
                onClick={() => onScaleClick && onScaleClick(s._test, s)}
                className="w-full text-left px-2.5 py-1.5 rounded-md bg-red-50 hover:bg-red-100 transition flex items-center justify-between gap-2"
              >
                <span className="min-w-0 flex items-baseline gap-1.5">
                  <span className="text-[10px] font-mono text-red-600/70">{s._test.test_id}</span>
                  <span className="text-[12px] font-semibold text-red-800 truncate">{s.name}</span>
                </span>
                <span className="text-[11px] font-bold text-red-700 tabular-nums shrink-0">T={s.t_score?.toFixed?.(0)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {positives.length > 0 && (
        <div>
          <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 mb-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            양호한 영역
          </div>
          <div className="space-y-1">
            {positives.map((s) => (
              <button
                key={`${s._test.test_id}-${s.code}`}
                onClick={() => onScaleClick && onScaleClick(s._test, s)}
                className="w-full text-left px-2.5 py-1.5 rounded-md bg-emerald-50 hover:bg-emerald-100 transition flex items-center justify-between gap-2"
              >
                <span className="min-w-0 flex items-baseline gap-1.5">
                  <span className="text-[10px] font-mono text-emerald-600/70">{s._test.test_id}</span>
                  <span className="text-[12px] font-semibold text-emerald-800 truncate">{s.name}</span>
                </span>
                <span className="text-[11px] font-bold text-emerald-700 tabular-nums shrink-0">T={s.t_score?.toFixed?.(0)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, tone }) {
  const t = toneClass(tone || 'neutral');
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2">
      <div className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">{label}</div>
      <div className={`text-lg font-bold leading-tight mt-0.5 ${tone ? t.text : 'text-slate-900'}`}>
        {value ?? '—'}
      </div>
    </div>
  );
}

Object.assign(window, {
  toneClass, dirMode, dirLabel, dirIcon,
  CategoryBadge, DirectionTag, ZoneBar, BellCurve, MiniSparkProfile,
  TProfileChart, TestRadar, CrossTestBars,
  KPIStrip, ProfileHeader, ScaleRow, DetailDrawer, Metric, Highlights,
});
