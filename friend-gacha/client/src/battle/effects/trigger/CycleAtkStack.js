import { Effect, registerEffect, mapType } from '../../effectSystem';

class CycleAtkStack extends Effect {
  static ID = 102;
  modifyStat(value, { stat, owner, unit }) {
    if (owner.id !== unit.id) return;
    if (stat === 'atk') {
      const stacks = this.getStack(owner, '_cycle_atk');
      return Math.round(value * (1 + stacks * this.params[0]));
    }
  }
  onCycleEnd({ unit }) {
    const cur = this.getStack(unit, '_cycle_atk');
    const max = this.params[1] || 30;
    if (cur < max) {
      return {
        combatStackUpdates: { '_cycle_atk': cur + 1 },
        log: `  [${unit.talent.name}] ${unit.name} ATK +${Math.round(this.params[0] * 100)}% (${cur + 1}중첩)`
      };
    }
  }
}

registerEffect(CycleAtkStack);
mapType('cycle_atk_stack', 102);
