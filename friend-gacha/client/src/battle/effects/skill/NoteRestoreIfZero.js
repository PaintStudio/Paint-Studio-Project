import { Effect, registerEffect } from '../../effectSystem';

class NoteRestoreIfZero extends Effect {
  static ID = 334;

  onSkillUsed({ owner, unit, skill, party, modSkill }) {
    if (owner.id !== unit.id) return;
    if (!modSkill || skill.id !== modSkill.id) return;
    const amt = this.params[0] || 5;
    const restores = [];
    const logs = [];
    for (const u of (party || [])) {
      if (!u.alive || u.notes > 0) continue;
      restores.push({ unitId: u.id, amount: amt });
      logs.push(`  ${u.name}: 턴 노트 ${amt} 회복`);
    }
    if (!restores.length) return;
    return { partyNoteRestore: restores, logs };
  }
}

registerEffect(NoteRestoreIfZero);
