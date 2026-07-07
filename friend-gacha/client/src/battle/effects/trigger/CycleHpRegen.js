import { Effect, registerEffect, mapType } from '../../effectSystem';

class CycleHpRegen extends Effect {
  static ID = 114;
  onCycleEnd({ unit }) {
    if (!unit.alive || unit.hp >= unit.maxHp) return;
    const healAmt = Math.round(unit.maxHp * this.params[0]);
    if (healAmt <= 0) return;
    return { selfHeal: healAmt, log: `  [${unit.talent.name}] ${unit.name} HP ${healAmt} 회복` };
  }
}

registerEffect(CycleHpRegen);
mapType('cycle_hp_regen', 114);
