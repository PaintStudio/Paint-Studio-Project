import { Effect, registerEffect } from '../../effectSystem';

class TagSelfStatScaling extends Effect {
  static ID = 186;
  modifyStat(value, { owner, unit, stat, party }) {
    if (owner.id !== unit.id) return;
    const targetStat = this.params[0] === 'hp' ? 'maxHp' : this.params[0];
    if (stat !== targetStat) return;
    const tagLabel = this.params[1];
    if (!tagLabel || !party) return;
    let count = 0;
    for (const u of party) {
      if (!u.alive || !u.tags) continue;
      if (u.tags.some(t => t.label === tagLabel)) count++;
    }
    if (count <= 0) return;
    return Math.round(value * (1 + count * (this.params[2] || 0.3)));
  }
}

registerEffect(TagSelfStatScaling);
