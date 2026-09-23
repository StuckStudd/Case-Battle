import { cx } from '../utils/ui';

/** Double chevron mark used by the logo and empty upgrade slots. */
export function ChevronMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="chevron-top" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--accent-light)' }} />
          <stop offset="1" style={{ stopColor: 'var(--accent)' }} />
        </linearGradient>
      </defs>
      <path d="M24 4 L44 22 L44 30 L24 12 L4 30 L4 22 Z" fill="url(#chevron-top)" />
      <path d="M24 20 L44 38 L44 46 L24 28 L4 46 L4 38 Z" style={{ fill: 'var(--accent-dark)' }} />
    </svg>
  );
}

export function Logo({ onClick, large }: { onClick?: () => void; large?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Upgrader"
      className="group flex items-center gap-2.5"
      tabIndex={onClick ? 0 : -1}
    >
      <ChevronMark
        className={cx(
          'drop-shadow-[0_0_12px_rgb(var(--accent-rgb)/0.45)] transition-transform group-hover:-translate-y-0.5',
          large ? 'size-14' : 'size-8',
        )}
      />
      <span className={cx('font-display font-bold tracking-wide text-white', large ? 'text-5xl' : 'text-2xl')}>
        UPGRADER
      </span>
    </button>
  );
}
