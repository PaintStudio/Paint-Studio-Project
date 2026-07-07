import { Effect, registerEffect } from '../../effectSystem';

class CycleStartTaunt extends Effect {
  static ID = 200;
  onCycleStart({ owner, unit }) {
    if (owner.id !== unit.id) return;
    const stacks = this.params[0] || 2;
    const cur = (unit.combatStacks || {})._tauntStacks || 0;
    return {
      combatStackUpdates: { _tauntStacks: cur + stacks },
      log: `  [마노의 혼] ${unit.name}: 도발 ${stacks}스택 획득`,
    };
  }
}

registerEffect(CycleStartTaunt);
