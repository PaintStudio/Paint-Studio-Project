import { Effect, registerEffect, mapStatus } from '../../effectSystem';

// 사이클 개시 시 HP 회복
// params: [healAmount]
class StatusCycleHeal extends Effect {
  static ID = 212;
  onCycleStart({ owner, unit }) {
    if (owner.id !== unit.id) return;
    const healAmt = this.params[0] || 0;
    if (healAmt <= 0) return;
    return { selfHeal: healAmt, log: `  [사이클 회복] ${unit.name}: HP ${healAmt} 회복` };
  }
}

registerEffect(StatusCycleHeal);
mapStatus('cycle_heal', 212);
