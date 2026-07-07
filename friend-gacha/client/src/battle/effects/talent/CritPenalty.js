import { Effect, registerEffect } from '../../effectSystem';

class CritPenalty extends Effect {
  static ID = 181;
  modifyCritRate(value, { owner, attacker }) {
    if (owner.id !== attacker.id) return;
    return value + (this.params[0] || 1);
  }
  onCrit({ owner, attacker }) {
    if (owner.id !== attacker.id) return;
    const hpLoss = Math.round(owner.maxHp * (this.params[1] || 0.2));
    return { selfDamage: hpLoss, log: `  [잃어버린 긍지] ${owner.name}: 치명타! HP ${hpLoss} 감소` };
  }
}

registerEffect(CritPenalty);
