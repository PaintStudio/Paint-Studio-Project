import { Effect, registerEffect } from '../../effectSystem';

// 추가 턴 상태인 아군의 피해 증가 (파티 오라)
// args: [dmgBoost]  예) [0.25]
class ExtraTurnDmgBoost extends Effect {
  static ID = 172;
  modifyDamageDealt(value, { owner, attacker }) {
    if (!owner.alive) return;
    if (!((attacker.combatStacks || {})._extraTurn > 0)) return;
    return Math.round(value * (1 + (this.params[0] || 0.25)));
  }
}

registerEffect(ExtraTurnDmgBoost);
