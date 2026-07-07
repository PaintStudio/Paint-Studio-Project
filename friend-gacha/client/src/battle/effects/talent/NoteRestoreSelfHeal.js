import { Effect, registerEffect } from '../../effectSystem';

class NoteRestoreSelfHeal extends Effect {
  static ID = 193;
  onSkillUsed({ owner, unit, skill }) {
    if (owner.id !== unit.id) return;
    const hasNoteRestore = skill?.effectIds?.some(e => {
      const id = typeof e === 'object' ? e.id : e;
      return id === 346;
    }) || skill?.extra?.noteRestore;
    if (!hasNoteRestore) return;
    const ratio = this.params[0] || 0.1;
    const healAmt = Math.round(unit.maxHp * ratio);
    return { selfHeal: healAmt, log: `  [비트마스터] ${unit.name}: HP ${healAmt} 회복` };
  }
}

registerEffect(NoteRestoreSelfHeal);
