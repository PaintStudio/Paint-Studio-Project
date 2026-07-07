import { Effect, registerEffect, getEffStat } from '../../effectSystem';

// 조건부 방어 배율 강화
// args: [조건, 방어배율]  예) ['attacker_slower', 0.6]
class ConditionalDefense extends Effect {
  static ID = 310;

  modifyDefenseMult(value, { owner, defender, defenseSkill, attacker, modSkill }) {
    if (owner.id !== defender.id) return;
    if (!modSkill || defenseSkill?.id !== modSkill.id) return;
    const condition = this.params[0];
    const defMult = this.params[1];
    if (condition === 'attacker_slower' && getEffStat(attacker, 'spd') < getEffStat(defender, 'spd')) {
      return defMult;
    }
  }
}

registerEffect(ConditionalDefense);
