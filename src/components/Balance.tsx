import { Wallet } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useAnimatedNumber } from '../hooks/useAnimatedNumber';
import { useT } from '../i18n';
import { useStore } from '../store/inventoryStore';
import { formatMoney } from '../utils/format';
import { cx } from '../utils/ui';

export function Balance() {
  const t = useT();
  const { state, balanceHold } = useStore();
  // Winnings still being animated are hidden so the header never spoils a result.
  const balance = Math.max(0, state.balance - balanceHold);
  const shown = useAnimatedNumber(balance);
  const previous = useRef(balance);
  const [trend, setTrend] = useState<'up' | 'down' | null>(null);

  useEffect(() => {
    if (balance === previous.current) return;
    setTrend(balance > previous.current ? 'up' : 'down');
    previous.current = balance;
    const timer = window.setTimeout(() => setTrend(null), 900);
    return () => window.clearTimeout(timer);
  }, [balance]);

  return (
    <div className="glass flex items-center gap-2 rounded-xl py-1.5 pl-1.5 pr-3 sm:gap-2.5 sm:pl-2 sm:pr-3.5">
      <div className="hidden size-8 place-items-center sm:grid rounded-lg bg-gradient-to-br from-emerald-400/25 to-emerald-600/10 text-emerald-300">
        <Wallet size={16} />
      </div>
      <div className="leading-tight">
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{t('common.balance')}</div>
        <div
          className={cx(
            'font-display text-lg font-bold tabular-nums transition-colors duration-300',
            trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-rose-400' : 'text-white',
          )}
        >
          {formatMoney(shown)}
        </div>
      </div>
    </div>
  );
}
