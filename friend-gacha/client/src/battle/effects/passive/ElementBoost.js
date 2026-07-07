import { Effect, registerEffect, mapType } from '../../effectSystem';

class ElementBoost extends Effect {
  static ID = 1;
  modifyDamageDealt(value, { owner, attacker, skillElem }) {
    if (owner.id !== attacker.id) return;
    if (skillElem === this.params[0]) return Math.round(value * (1 + this.params[1]));
  }
}

registerEffect(ElementBoost);
mapType('element_boost', 1);
