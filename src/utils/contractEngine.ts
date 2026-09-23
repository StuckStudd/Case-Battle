import { SKINS } from '../data/skinData';
import type { Rarity, Skin } from '../types/types';
import { buildDropTable } from './dropTable';
import type { DropTable } from './dropTable';

/** Which rarity a contract turns inputs into, and how many inputs it takes. */
export const CONTRACT_STEPS: Partial<Record<Rarity, { next: Rarity; inputs: number }>> = {
  consumer: { next: 'industrial', inputs: 10 },
  industrial: { next: 'milspec', inputs: 10 },
  milspec: { next: 'restricted', inputs: 10 },
  restricted: { next: 'classified', inputs: 10 },
  classified: { next: 'covert', inputs: 10 },
  covert: { next: 'rare', inputs: 5 },
};

/** Expected output value as a share of the inputs. */
export const CONTRACT_RETURN = 0.95;

export type ContractCheck =
  | { ok: true; table: DropTable<Skin>; inputValue: number; next: Rarity }
  | { ok: false; reason: 'contractEmpty' | 'contractMixed' | 'contractNotAllowed' | 'contractCount' | 'contractNoOutcomes' };

export function checkContract(inputs: readonly Skin[]): ContractCheck {
  if (inputs.length === 0) return { ok: false, reason: 'contractEmpty' };
  const rarity = inputs[0].rarity;
  if (inputs.some((s) => s.rarity !== rarity)) return { ok: false, reason: 'contractMixed' };
  const step = CONTRACT_STEPS[rarity];
  if (!step) return { ok: false, reason: 'contractNotAllowed' };
  if (inputs.length !== step.inputs) return { ok: false, reason: 'contractCount' };

  const inputValue = inputs.reduce((sum, s) => sum + s.price, 0);
  const target = inputValue * CONTRACT_RETURN;
  // Keep outcomes within a sensible band around the stake so results feel like a trade-up.
  let pool = SKINS.filter((s) => s.rarity === step.next && s.price >= target * 0.2 && s.price <= target * 8);
  if (pool.length < 3) pool = SKINS.filter((s) => s.rarity === step.next);
  if (pool.length === 0) return { ok: false, reason: 'contractNoOutcomes' };
  return { ok: true, table: buildDropTable(pool, target), inputValue, next: step.next };
}
