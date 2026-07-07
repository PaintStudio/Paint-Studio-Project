import { Effect, registerEffect, mapType } from '../../effectSystem';

class CycleNoteReduceAtkUp extends Effect {
  static ID = 145;
  onCycleStart({ unit }) {
    if (!unit.alive) return;
    const cur = this.getStack(unit, '_darkArmsStacks');
    return {
      combatStackUpdates: { _darkArmsStacks: cur + 1 },
      maxNoteReduce: this.params[0] || 4,
      log: `  [${unit.talent.name}] 최대 노트 -${this.params[0] || 4}, ATK +${Math.round((this.params[1] || 0.75) * 100)}%`
    };
  }
  modifyStat(value, { stat, owner, unit }) {
    if (owner.id !== unit.id) return;
    if (stat !== 'atk') return;
    const stacks = this.getStack(owner, '_darkArmsStacks');
    if (stacks > 0) return Math.round(value * (1 + stacks * (this.params[1] || 0.75)));
  }
}

registerEffect(CycleNoteReduceAtkUp);
mapType('cycle_note_reduce_atk_up', 145);
