import { Effect, registerEffect } from '../../effectSystem';

class TagPartyHpAura extends Effect {
  static ID = 192;
  modifyStat(value, { owner, unit, stat }) {
    if (!owner.alive) return;
    if (stat !== 'maxHp') return;
    const tagLabel = this.params[0];
    if (!tagLabel) return;
    if (!unit.tags?.some(t => t.label === tagLabel)) return;
    return Math.round(value * (1 + (this.params[1] || 0.25)));
  }
}

registerEffect(TagPartyHpAura);
