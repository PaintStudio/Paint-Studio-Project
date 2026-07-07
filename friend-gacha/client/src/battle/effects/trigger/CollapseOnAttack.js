import { Effect, registerEffect, mapType } from '../../effectSystem';

class CollapseOnAttack extends Effect {
  static ID = 128;
  onAttackHit({ attacker, owner, targets, actualCost, skill }) {
    if (attacker.id !== owner.id) return;
    if (skill?.type !== 'attack' && skill?.type !== 'ultimate') return;
    const gain = (actualCost || 0) * this.params[0];
    if (gain <= 0) return;
    return {
      targetStackUpdates: targets.map(t => {
        const cur = this.getStack(t, '_collapseStacks');
        return {
          targetId: t.id,
          stacks: { _collapseStacks: Math.min(this.params[1], cur + gain) },
          addStatus: { key: 'collapse', turns: 999, statusKey: 'collapse' }
        };
      }),
      log: `  [${owner.talent.name}] 코스트 ${actualCost} × ${this.params[0]} = 붕괴 ${gain}스택 부여`
    };
  }
}

registerEffect(CollapseOnAttack);
mapType('collapse_on_attack', 128);
