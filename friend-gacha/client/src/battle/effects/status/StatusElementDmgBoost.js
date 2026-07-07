import { Effect, registerEffect, mapStatus } from '../../effectSystem';

// 지정 속성 피해 증가 상태
// params: [element, amount]  예) ["water", 0.5]
class StatusElementDmgBoost extends Effect {
  static ID = 214;
  modifyDamageDealt(value, { owner, attacker, skillElem }) {
    if (owner.id !== attacker.id) return;
    if (skillElem !== this.params[0]) return;
    return Math.round(value * (1 + (this.params[1] || 0.5)));
  }
}

registerEffect(StatusElementDmgBoost);
mapStatus('element_damage_boost', 214);
