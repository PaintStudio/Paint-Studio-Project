import { Effect, registerEffect } from '../../effectSystem';

// 대상에게 턴 노트 회복
// args: [amount]  예) [3]
class NoteRestoreOnUse extends Effect {
  static ID = 346;
  onSkillUsed({ owner, unit, skill, targets, modSkill }) {
    if (owner.id !== unit.id) return;
    if (!modSkill || skill.id !== modSkill.id) return;
    if (!targets?.length) return;
    const amount = this.params[0] || 1;
    return {
      partyNoteRestore: targets.map(t => ({ unitId: t.id, amount })),
      log: `  ${targets.map(t => t.name).join(', ')}: 턴 노트 ${amount} 회복`,
    };
  }
}

registerEffect(NoteRestoreOnUse);
