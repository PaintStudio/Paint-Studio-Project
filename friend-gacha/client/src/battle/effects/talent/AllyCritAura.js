import { Effect, registerEffect } from '../../effectSystem';

class AllyCritAura extends Effect {
  static ID = 196;
  modifyCritRate(value, { owner, attacker }) {
    if (!owner.alive) return;
    if (attacker.isEnemy) return;
    return value + (this.params[0] || 0.1);
  }
}

registerEffect(AllyCritAura);
