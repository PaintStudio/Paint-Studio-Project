import { Effect, registerEffect } from '../../effectSystem';

class OriginPartyAura extends Effect {
  static ID = 190;
  modifyStat(value, { owner, unit, stat, party }) {
    if (!owner.alive) return;
    if (unit.id === owner.id) return;
    const targetOrigin = this.params[0] || 'heart';
    if (unit.origin !== targetOrigin) return;
    const stats = this.params[1] || ['atk', 'def'];
    if (!stats.includes(stat)) return;
    return Math.round(value * (1 + (this.params[2] || 0.5)));
  }
}

registerEffect(OriginPartyAura);
