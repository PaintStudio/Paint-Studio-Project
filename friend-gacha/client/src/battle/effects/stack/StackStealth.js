import { Effect, registerEffect, mapStack } from '../../effectSystem';

class StackStealth extends Effect {
  static ID = 503;
  static PRIORITY = 10;

  modifyEnemyTarget(current, { owner, livingTargets }) {
    if (!owner.alive) return;
    if (current?.id === owner.id) {
      const others = livingTargets?.filter(u => u.id !== owner.id && u.alive);
      if (others?.length) return others[Math.floor(Math.random() * others.length)];
    }
  }

  onPartyTakeDamage({ owner, damagedUnit }) {
    if (!owner.alive) return;
    const stacks = this.params[0] || 0;
    if (stacks <= 0) return;
    return {
      combatStackUpdates: { _stealthStacks: stacks - 1 },
    };
  }
}

registerEffect(StackStealth);
mapStack('_stealthStacks', 503);
