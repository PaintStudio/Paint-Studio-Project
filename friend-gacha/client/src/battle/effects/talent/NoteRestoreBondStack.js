import { Effect, registerEffect, mapType } from '../../effectSystem';

class NoteRestoreBondStack extends Effect {
  static ID = 147;
  onSkillUsed({ owner, unit, skill, targets }) {
    if (owner.id !== unit.id) return;
    const hasNoteRestore = (skill.effectIds || []).some(e => (typeof e === 'object' ? e.id : e) === 327);
    if (!hasNoteRestore) return;
    const updates = [];
    for (const t of targets) {
      if (t.id === unit.id) continue;
      const cur = this.getStack(t, '_bondStacks');
      updates.push({ targetId: t.id, stacks: { _bondStacks: cur + (this.params[0] || 3) } });
    }
    if (!updates.length) return;
    return {
      partyStackUpdates: updates,
      log: `  [${unit.talent.name}] 결속 ${this.params[0] || 3}스택 부여`
    };
  }
}

registerEffect(NoteRestoreBondStack);
mapType('note_restore_bond', 147);
