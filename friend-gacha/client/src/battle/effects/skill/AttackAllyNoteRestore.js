import { Effect, registerEffect } from '../../effectSystem';

class AttackAllyNoteRestore extends Effect {
  static ID = 327;

  onSkillUsed({ owner, unit, skill, party, modSkill }) {
    if (owner.id !== unit.id) return;
    if (modSkill?.id !== skill?.id) return;
    if (!party?.length) return;
    const amount = this.params[0] || 2;
    const alive = party.filter(u => u.alive);
    if (!alive.length) return;
    const lowest = alive.reduce((a, b) => a.notes < b.notes ? a : b);
    return {
      partyNoteRestore: [{ unitId: lowest.id, amount }],
      log: `  [${skill.name}] ${lowest.name}: 턴 노트 ${amount} 회복`
    };
  }
}

registerEffect(AttackAllyNoteRestore);
