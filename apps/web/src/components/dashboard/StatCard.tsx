import { useMemo } from 'react';
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from 'lucide-react';

type StatVariant = 'spark' | 'meter' | 'cta' | 'trend';

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  /** "spark" (default) shows a sparkline; "meter" shows a progress bar; "cta"
   * shows a primary button under the value; "trend" shows just the trend pill. */
  variant?: StatVariant;
  trend?: number;
  spark?: number[];
  /** For "meter": denominator label (e.g. "10,000") */
  total?: string;
  /** For "meter": percent 0-100 */
  percent?: number;
  /** For "cta": button label */
  cta?: string;
  /** For "cta": optional click handler */
  onCtaClick?: () => void;
  /** For "cta" and others: small caption beneath value */
  sub?: string;
}

/**
 * Compact dashboard KPI card. Sharp 10px corners, mono numbers.
 * Variants:
 *  - spark : sparkline + trend pill (default)
 *  - meter : progress bar with consumed / total
 *  - trend : icon + value + small subtitle (no spark)
 *  - cta   : primary call-to-action button under value
 */
export default function StatCard({
  label,
  value,
  trend,
  icon: Icon,
  variant = 'spark',
  spark,
  total,
  percent,
  cta,
  onCtaClick,
  sub,
}: StatCardProps) {
  const hasTrend = typeof trend === 'number';
  const isUp = (trend ?? 0) >= 0;

  const sparkPath = useMemo(() => {
    if (!spark || spark.length < 2) return null;
    const W = 240;
    const H = 36;
    const max = Math.max(...spark);
    const min = Math.min(...spark);
    const span = Math.max(1, max - min);
    const points = spark.map((v, i) => {
      const x = (i / (spark.length - 1)) * W;
      const y = H - ((v - min) / span) * (H - 4) - 2;
      return [x, y] as const;
    });

    let d = `M ${points[0][0]} ${points[0][1]}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cx = (p0[0] + p1[0]) / 2;
      d += ` Q ${cx} ${p0[1]} ${cx} ${(p0[1] + p1[1]) / 2}`;
      d += ` T ${p1[0]} ${p1[1]}`;
    }
    return { d, W, H, last: points[points.length - 1] };
  }, [spark]);

  return (
    <div className="vfy-stat" role="group" aria-label={`${label}: ${value}`}>
      <div className="vfy-stat-head">
        <span className="vfy-stat-label">
          <Icon size={12} strokeWidth={2.4} />
          {label}
        </span>
        {hasTrend && (
          <span className={`vfy-stat-trend ${isUp ? 'up' : 'down'}`}>
            {isUp ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
            {isUp ? '+' : ''}
            {trend}%
          </span>
        )}
      </div>

      <p className="vfy-stat-value">{value}</p>

      {sub && variant !== 'cta' && (
        <p className="vfy-stat-sub">{sub}</p>
      )}

      {/* spark variant — sparkline */}
      {variant === 'spark' && sparkPath && (
        <div className="vfy-stat-spark">
          <svg
            width="100%"
            height="36"
            viewBox={`0 0 ${sparkPath.W} ${sparkPath.H}`}
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id={`spark-grad-${label}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%"   stopColor={isUp ? 'var(--d-accent)' : 'var(--d-danger)'} stopOpacity="0.35" />
                <stop offset="100%" stopColor={isUp ? 'var(--d-accent)' : 'var(--d-danger)'} stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d={`${sparkPath.d} L ${sparkPath.W} ${sparkPath.H} L 0 ${sparkPath.H} Z`}
              fill={`url(#spark-grad-${label})`}
            />
            <path
              d={sparkPath.d}
              fill="none"
              stroke={isUp ? 'var(--d-accent)' : 'var(--d-danger)'}
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle
              cx={sparkPath.last[0]}
              cy={sparkPath.last[1]}
              r="2.5"
              fill={isUp ? 'var(--d-accent)' : 'var(--d-danger)'}
            />
          </svg>
        </div>
      )}

      {/* meter variant — progress bar */}
      {variant === 'meter' && typeof percent === 'number' && (
        <div className="vfy-stat-meter">
          <div className="vfy-stat-meter-track">
            <div
              className="vfy-stat-meter-fill"
              style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
            />
          </div>
          <div className="vfy-stat-meter-row">
            <span className="vfy-stat-meter-percent">{percent}%</span>
            {total && <span className="vfy-stat-meter-total">of {total}</span>}
          </div>
        </div>
      )}

      {/* cta variant — primary button + caption */}
      {variant === 'cta' && cta && (
        <div className="vfy-stat-cta-row">
          <button type="button" className="vfy-stat-cta-btn" onClick={onCtaClick}>
            {cta}
          </button>
          {sub && <span className="vfy-stat-cta-sub">{sub}</span>}
        </div>
      )}
    </div>
  );
}
