import { Effect, registerEffect, mapStack, getEffStat } from '../../effectSystem';

class StackEcho extends Effect {
  static ID = 504;

  onAttackHit({ owner, attacker, targets, skill }) {
    if (owner.id !== attacker.id) return;
    if (skill?.type !== 'attack') return;
    const stacks = this.params[0] || 0;
    if (stacks <= 0) return;
    const dmg = Math.round(getEffStat(owner, 'atk') * 1.5);
    const aliveTargets = (targets || []).filter(t => t.alive);
    if (!aliveTargets.length) return;
    const target = aliveTargets[0];
    return {
      combatStackUpdates: { _echoStacks: stacks - 1 },
      bonusDamage: [{ targetId: target.id, damage: dmg }],
      log: `  [울림] ${owner.name}: ${target.name}에게 추가 ${dmg} 피해 (스택 ${stacks - 1} 남음)`
    };
  }
}

registerEffect(StackEcho);
mapStack('_echoStacks', 504);
