import { Effect, registerEffect, mapType } from '../../effectSystem';

class DawnStack extends Effect {
  static ID = 117;
  onSkillUsed({ owner, unit, skill, targets, actualCost }) {
    if (owner.id !== unit.id) return;
    const cs = unit.combatStacks || {};
    let dawn = cs._dawnStacks || 0;
    const logs = [];
    let noteRestore;

    if (skill.type === 'support' && dawn > 0 && targets?.length > 0) {
      dawn--;
      noteRestore = [{ unitId: targets[0].id, amount: this.params[0] }];
      logs.push(`  [${unit.talent.name}] 새벽 소모 → ${targets[0].name} 노트 +${this.params[0]}`);
    }

    if (actualCost !== undefined) {
      const remaining = unit.notes - actualCost;
      const gain = Math.floor(remaining / this.params[1]);
      if (gain > 0) {
        dawn = Math.min(this.params[2], dawn + gain);
        logs.push(`  [${unit.talent.name}] 새벽 ${dawn}스택`);
      }
    }

    if (logs.length === 0) return;
    const result = { combatStackUpdates: { _dawnStacks: dawn }, logs };
    if (noteRestore) result.partyNoteRestore = noteRestore;
    return result;
  }
}

registerEffect(DawnStack);
mapType('dawn_stack', 117);
