import { useId, useMemo, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import { useT } from '../i18n';
import type { NetWorthPoint } from '../types/types';
import { formatCompactMoney, formatDateTime, formatMoney } from '../utils/format';

const W = 640;
const H = 220;
const PAD = { top: 12, right: 12, bottom: 24, left: 56 };
/** Validated against the dark surface (dataviz lightness band + contrast). */
const LINE = '#bf8a00';

function niceTicks(min: number, max: number, count = 4): number[] {
  const span = max - min || 1;
  const step = Math.pow(10, Math.floor(Math.log10(span / count)));
  const nice = [1, 2, 5, 10].map((m) => m * step).find((s) => span / s <= count) ?? step * 10;
  const start = Math.floor(min / nice) * nice;
  const ticks: number[] = [];
  for (let v = start; v <= max + nice / 2; v += nice) ticks.push(v);
  return ticks;
}

interface NetWorthChartProps {
  points: NetWorthPoint[];
  /** Accessible chart name; defaults to the net worth label. */
  label?: string;
  /** Table column header for the values; defaults to "Net worth". */
  valueHeader?: string;
}

/** Single-series value over time (net worth, skin price) with a crosshair tooltip and a table fallback. */
export function NetWorthChart({ points, label, valueHeader }: NetWorthChartProps) {
  const t = useT();
  const fillId = `fill${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);

  const geometry = useMemo(() => {
    const values = points.map((p) => p.v);
    const ticks = niceTicks(Math.min(...values), Math.max(...values));
    const yMin = ticks[0];
    const yMax = ticks[ticks.length - 1] === yMin ? yMin + 1 : ticks[ticks.length - 1];
    const x = (i: number) => PAD.left + (points.length === 1 ? 0.5 : i / (points.length - 1)) * (W - PAD.left - PAD.right);
    const y = (v: number) => PAD.top + (1 - (v - yMin) / (yMax - yMin)) * (H - PAD.top - PAD.bottom);
    const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
    const area = `${line} L${x(points.length - 1).toFixed(1)},${H - PAD.bottom} L${x(0).toFixed(1)},${H - PAD.bottom} Z`;
    return { ticks, x, y, line, area };
  }, [points]);

  if (points.length < 2) {
    return <p className="py-10 text-center text-sm text-slate-500">{t('profile.chartEmpty')}</p>;
  }

  const onMove = (event: PointerEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = ((event.clientX - rect.left) / rect.width) * W;
    const ratio = (px - PAD.left) / (W - PAD.left - PAD.right);
    setHover(Math.max(0, Math.min(points.length - 1, Math.round(ratio * (points.length - 1)))));
  };

  const hovered = hover !== null ? points[hover] : null;
  const last = points[points.length - 1];

  return (
    <div>
      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full touch-none"
          role="img"
          aria-label={label ?? t('profile.chartLabel', { value: formatMoney(last.v) })}
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={LINE} stopOpacity="0.28" />
              <stop offset="1" stopColor={LINE} stopOpacity="0" />
            </linearGradient>
          </defs>
          {geometry.ticks.map((v) => (
            <g key={v}>
              <line x1={PAD.left} x2={W - PAD.right} y1={geometry.y(v)} y2={geometry.y(v)} stroke="rgba(255,255,255,0.06)" />
              <text x={PAD.left - 8} y={geometry.y(v) + 4} textAnchor="end" fontSize="11" fill="#94a3b8">
                {formatCompactMoney(v)}
              </text>
            </g>
          ))}
          <path d={geometry.area} fill={`url(#${fillId})`} />
          <path d={geometry.line} fill="none" stroke={LINE} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          {hovered && hover !== null && (
            <g>
              <line x1={geometry.x(hover)} x2={geometry.x(hover)} y1={PAD.top} y2={H - PAD.bottom} stroke="rgba(255,255,255,0.25)" strokeDasharray="3 3" />
              <circle cx={geometry.x(hover)} cy={geometry.y(hovered.v)} r="5" fill={LINE} stroke="#16171a" strokeWidth="2" />
            </g>
          )}
        </svg>
        {hovered && hover !== null && (
          <div
            className="pointer-events-none absolute top-2 z-10 -translate-x-1/2 rounded-lg border border-line bg-[#1d1e22] px-2.5 py-1.5 text-xs shadow-xl"
            style={{ left: `${(geometry.x(hover) / W) * 100}%` }}
          >
            <div className="font-semibold tabular-nums text-white">{formatMoney(hovered.v)}</div>
            <div className="text-slate-400">{formatDateTime(hovered.t)}</div>
          </div>
        )}
      </div>
      <button type="button" className="mt-2 text-xs text-slate-500 underline hover:text-white" onClick={() => setShowTable((v) => !v)}>
        {showTable ? t('profile.hideTable') : t('profile.showTable')}
      </button>
      {showTable && (
        <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-line">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-[#1d1e22] text-slate-400">
              <tr>
                <th className="px-3 py-1.5 font-semibold">{t('profile.time')}</th>
                <th className="px-3 py-1.5 text-right font-semibold">{valueHeader ?? t('profile.netWorth')}</th>
              </tr>
            </thead>
            <tbody>
              {[...points].reverse().map((p) => (
                <tr key={p.t} className="border-t border-line">
                  <td className="px-3 py-1 text-slate-400">{formatDateTime(p.t)}</td>
                  <td className="px-3 py-1 text-right tabular-nums text-white">{formatMoney(p.v)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
