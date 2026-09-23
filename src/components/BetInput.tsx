import { useT } from '../i18n';
import { formatMoney, roundMoney } from '../utils/format';

interface BetInputProps {
  value: string;
  onChange: (value: string) => void;
  max: number;
  disabled?: boolean;
}

/** Bet amount field with ½, x2 and max shortcuts. */
export function BetInput({ value, onChange, max, disabled }: BetInputProps) {
  const t = useT();
  const amount = Number(value.replace(',', '.')) || 0;
  const set = (n: number) => onChange(String(roundMoney(Math.min(max, Math.max(0, n)))));

  return (
    <div>
      <div className="mb-1.5 flex justify-between text-xs text-slate-400">
        <span>{t('games.bet')}</span>
        <span className="tabular-nums">{t('games.max', { amount: formatMoney(max) })}</span>
      </div>
      <div className="flex gap-1.5">
        <input
          inputMode="decimal"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="input h-11 flex-1 font-semibold tabular-nums"
          aria-label={t('games.bet')}
        />
        <button type="button" className="btn btn-ghost h-11 px-3 text-xs" disabled={disabled} onClick={() => set(amount / 2)}>
          ½
        </button>
        <button type="button" className="btn btn-ghost h-11 px-3 text-xs" disabled={disabled} onClick={() => set(amount * 2)}>
          x2
        </button>
        <button type="button" className="btn btn-ghost h-11 px-3 text-xs" disabled={disabled} onClick={() => set(max)}>
          {t('games.maxShort')}
        </button>
      </div>
    </div>
  );
}
