import { Effect, registerEffect, mapType } from '../../effectSystem';

class TagMultiScaling extends Effect {
  static ID = 159;
  modifyStat(value, { stat, owner, unit, party }) {
    if (owner.id !== unit.id) return;
    if (!party) return;
    for (const rule of (this.params[0] || [])) {
      if (rule.stat !== stat) continue;
      let count = 0;
      for (const u of party) {
        if (!u.alive || !u.tags) continue;
        if (u.tags.some(t => t.label === rule.tagLabel)) count++;
      }
      if (count > 0) value = Math.round(value * (1 + count * rule.value));
    }
    return value;
  }
}

registerEffect(TagMultiScaling);
mapType('tag_multi_scaling', 159);
