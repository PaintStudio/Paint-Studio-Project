import { Effect, registerEffect, mapType, getEffStat } from '../../effectSystem';

class DebuffBonusDamage extends Effect {
  static ID = 107;
  onDebuffApplied({ owner, unit, target }) {
    if (owner.id !== unit.id) return;
    const bonusDmg = Math.round(getEffStat(unit, 'atk') * this.params[0]);
    return {
      bonusDamage: [{ targetId: target.id, damage: bonusDmg, element: this.params[1] || unit.element }],
      log: `  [${unit.talent.name}] → ${target.name}: ${bonusDmg} ${this.params[1] || unit.element} 추가 피해`
    };
  }
}

registerEffect(DebuffBonusDamage);
mapType('debuff_bonus_damage', 107);
