import { Effect, registerEffect, mapStatus } from '../../effectSystem';

class StatusLightDamageBoost extends Effect {
  static ID = 208;
  modifyDamageDealt(value, { owner, attacker, skillElem }) {
    if (owner.id !== attacker.id) return;
    if (skillElem === 'light') return Math.round(value * (1 + (this.params[0] || 0.5)));
  }
}

registerEffect(StatusLightDamageBoost);
mapStatus('light_damage_boost', 208);
