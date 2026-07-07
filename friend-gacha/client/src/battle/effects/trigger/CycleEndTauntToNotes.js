import { Effect, registerEffect, mapType } from '../../effectSystem';

class CycleEndTauntToNotes extends Effect {
  static ID = 124;
  onCycleStart({ unit }) {
    const pending = this.getStack(unit, '_pendingTauntNotes');
    if (!pending || pending <= 0) return;
    return {
      combatStackUpdates: { _pendingTauntNotes: 0 },
      noteRecover: pending,
      log: `  [${unit.talent.name}] ${unit.name} 노트 +${pending}`
    };
  }
  onCycleEnd({ unit }) {
    if (!unit.alive) return;
    const taunt = this.getStack(unit, '_tauntStacks');
    if (taunt <= 0) return;
    return {
      combatStackUpdates: { _tauntStacks: 0, _pendingTauntNotes: taunt * this.params[0] },
      log: `  [${unit.talent.name}] 도발 ${taunt}스택 소모 → 다음 사이클 노트 +${taunt * this.params[0]}`
    };
  }
}

registerEffect(CycleEndTauntToNotes);
mapType('cycle_end_taunt_to_notes', 124);
