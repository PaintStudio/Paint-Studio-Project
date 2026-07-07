import { Effect, registerEffect, mapType } from '../../effectSystem';

class FirstStrike extends Effect {
  static ID = 2;
  modifyDamageDealt(value, { owner, attacker, isFirstAttack }) {
    if (owner.id !== attacker.id) return;
    if (isFirstAttack) return Math.round(value * (1 + this.params[0]));
  }
}

registerEffect(FirstStrike);
mapType('first_strike', 2);
