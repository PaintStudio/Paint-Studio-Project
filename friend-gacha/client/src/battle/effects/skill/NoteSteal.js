import { Effect, registerEffect } from '../../effectSystem';

class NoteSteal extends Effect {
  static ID = 326;

  modifyCanUse(value, { owner, modSkill, skill }) {
    if (modSkill?.id !== skill?.id) return;
    if (this.params[1] && owner.notes > 0) return false;
  }

  onSkillUsed({ owner, unit, skill, targets, modSkill }) {
    if (owner.id !== unit.id) return;
    if (modSkill?.id !== skill?.id) return;
    const target = targets?.[0];
    if (!target) return;
    const ratio = this.params[0] || 0.1;
    const stealAmount = Math.floor((target.maxNotes || 0) * ratio);
    if (stealAmount <= 0) return;
    return {
      enemyNoteReduce: [{ targetId: target.id, amount: stealAmount }],
      noteRecoverUncapped: stealAmount,
      log: `  [${skill.name}] ${target.name} 노트 ${stealAmount} 흡수 → ${owner.name} 노트 회복`
    };
  }
}

registerEffect(NoteSteal);
