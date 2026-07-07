import { Effect, registerEffect, mapStack } from '../../effectSystem';

class StackFarewell extends Effect {
  static ID = 508;
  modifyCritRate(value, { owner, attacker, skillElem }) {
    if (attacker?.id === owner.id) return;
    if (skillElem !== 'wind') return;
    const stacks = this.params[0] || 0;
    if (stacks <= 0) return;
    return value + stacks * (0.25);
  }
  onTakeDamage({ owner, unit }) {
    if (owner.id !== unit.id) return;
    const stacks = this.params[0] || 0;
    if (stacks <= 0) return;
    return {
      combatStackUpdates: { _farewellStacks: Math.max(0, stacks - 1) },
      log: `  [작별] ${unit.name}: 작별 ${stacks - 1}스택`,
    };
  }
}

registerEffect(StackFarewell);
mapStack('_farewellStacks', 508);
