import { Effect, registerEffect } from '../../effectSystem';

class DamageToShield extends Effect {
  static ID = 331;

  onPostAttack({ owner, unit, skill, modSkill, totalDmgDealt }) {
    if (owner.id !== unit.id) return;
    if (modSkill?.id !== skill?.id) return;
    if (!totalDmgDealt || totalDmgDealt <= 0) return;
    const ratio = this.params[0] || 0.25;
    const amount = Math.round(totalDmgDealt * ratio);
    if (amount <= 0) return;
    return {
      grantShield: amount,
      log: `  ${unit.name}: 피해의 ${Math.round(ratio * 100)}% → 보호막 ${amount} 획득`
    };
  }
}

registerEffect(DamageToShield);
