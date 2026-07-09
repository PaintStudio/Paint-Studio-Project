import { Effect, registerEffect, mapStack } from '../../effectSystem';

class StackSwift extends Effect {
  static ID = 505;

  onCycleEnd({ owner, unit }) {
    if (owner.id !== unit.id) return;
    const stacks = this.params[0] || 0;
    if (stacks <= 0) return;
    const half = Math.floor(stacks / 2);
    return {
      combatStackUpdates: { _swiftStacks: half },
      log: half > 0 ? `  [신속] ${owner.name} 신속 ${half}스택 잔여` : `  [신속 해제] ${owner.name}`,
    };
  }
}

registerEffect(StackSwift);
mapStack('_swiftStacks', 505);
