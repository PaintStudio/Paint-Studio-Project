import { Effect, registerEffect } from '../../effectSystem';

class DefIgnoreAura extends Effect {
  static ID = 223;
  modifyDef(value, { owner, attacker }) {
    if (!owner.alive) return;
    if (attacker.isEnemy) return;
    if (attacker.id === owner.id) {
      return Math.round(value * (1 - (this.params[0] || 0.5)));
    }
    const allyElement = this.params[2] || 'fire';
    if (attacker.element === allyElement) {
      return Math.round(value * (1 - (this.params[1] || 0.25)));
    }
  }
}

registerEffect(DefIgnoreAura);
