import { Effect, registerEffect } from '../../effectSystem';

class Deflect extends Effect {
  static ID = 333;

  modifyDefenseMult(value, { owner, modSkill, defender, defenseSkill, baseDamage }) {
    if (!modSkill || modSkill.id !== defenseSkill?.id) return;
    if (owner.id !== defender?.id) return;
    const threshold = Math.round(defender.maxHp * (this.params[0] || 0.1));
    if (baseDamage <= threshold) return 1.0;
  }
}

registerEffect(Deflect);
