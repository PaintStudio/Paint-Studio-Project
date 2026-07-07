import { Effect, registerEffect } from '../../effectSystem';

class DarkGlassCannon extends Effect {
  static ID = 182;
  modifyDamageDealt(value, { owner, attacker, skillElem }) {
    if (owner.id !== attacker.id) return;
    if (skillElem !== 'dark') return;
    return Math.round(value * (1 + (this.params[0] || 1)));
  }
  calcDamageReduction(value, { owner, defender }) {
    if (owner.id !== defender.id) return;
    return value - (this.params[1] || 1);
  }
}

registerEffect(DarkGlassCannon);
