import { Effect, registerEffect, mapType } from '../../effectSystem';

class TagPartyAtkScaling extends Effect {
  static ID = 136;
  modifyStat(value, { stat, owner, unit, party }) {
    if (owner.id !== unit.id) return;
    if (stat !== 'atk' || !party) return;
    const tagId = this.params[0];
    const tagLabel = this.params[1];
    if (!tagId && !tagLabel) return;
    let count = 0;
    for (const u of party) {
      if (!u.alive || !u.tags) continue;
      if (tagId && u.tags.some(t => t.id === tagId)) count++;
      else if (tagLabel && u.tags.some(t => t.label === tagLabel)) count++;
    }
    if (count > 0) return Math.round(value * (1 + count * this.params[2]));
  }
}

registerEffect(TagPartyAtkScaling);
mapType('tag_party_atk', 136);
