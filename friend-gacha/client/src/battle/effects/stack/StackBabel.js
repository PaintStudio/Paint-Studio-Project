import { Effect, registerEffect, mapStack } from '../../effectSystem';

class StackBabel extends Effect {
  static ID = 506;

  onTakeDamage({ owner, unit }) {
    if (owner.id !== unit.id) return;
    const stacks = this.params[0] || 0;
    if (stacks <= 0) return;
    return {
      combatStackUpdates: { _babelStacks: 0 },
      log: `  [바벨 CEO] ${owner.name} 바벨 ${stacks}스택 소실!`,
    };
  }
}

registerEffect(StackBabel);
mapStack('_babelStacks', 506);
