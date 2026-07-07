import { Effect, registerEffect } from '../../effectSystem';

class TsugidoNotesAura extends Effect {
  static ID = 225;
  modifyStat(value, { owner, unit, stat, party }) {
    if (stat !== 'maxNotes') return;
    if (!owner.alive) return;
    const tagLabel = this.params[0] || '츠기도';
    const selfPerMember = this.params[1] || 3;
    const allyBoost = this.params[2] || 2;
    if (unit.id === owner.id) {
      let count = 0;
      for (const u of (party || [])) {
        if (!u.alive || !u.tags) continue;
        if (u.tags.some(t => t.label === tagLabel)) count++;
      }
      if (count <= 0) return;
      return value + count * selfPerMember;
    }
    if (!unit.tags?.some(t => t.label === tagLabel)) return;
    return value + allyBoost;
  }
}

registerEffect(TsugidoNotesAura);
