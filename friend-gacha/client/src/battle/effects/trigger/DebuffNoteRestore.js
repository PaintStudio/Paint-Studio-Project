import { Effect, registerEffect, mapType } from '../../effectSystem';

class DebuffNoteRestore extends Effect {
  static ID = 113;
  onSkillUsed({ owner, unit, skill, targets, party }) {
    if (owner.id !== unit.id) return;
    if (skill.type !== 'debuff' || !party) return;
    const cur = this.getStack(unit, '_debuffNRCount');
    if (cur >= this.params[0]) return;
    const target = targets?.[0];
    if (!target || !target.debuffs?.length) return;
    const allies = party.filter(u => u.alive && u.id !== unit.id);
    if (!allies.length) return;
    const weakest = allies.reduce((a, b) => a.notes < b.notes ? a : b);
    if (weakest.notes >= weakest.maxNotes) return;
    return {
      combatStackUpdates: { _debuffNRCount: cur + 1 },
      partyNoteRestore: [{ unitId: weakest.id, amount: 1 }],
      log: `  [${unit.talent.name}] ${weakest.name} 노트 +1 (${cur + 1}/${this.params[0]})`
    };
  }
  onCycleEnd() {
    return { combatStackUpdates: { _debuffNRCount: 0 } };
  }
}

registerEffect(DebuffNoteRestore);
mapType('debuff_note_restore', 113);
