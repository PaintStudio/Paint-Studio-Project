import { Effect, registerEffect, mapStack } from '../../effectSystem';

// 고조 스택: 스택당 공격력 3% 증가
class StackFervor extends Effect {
  static ID = 507;
  modifyStat(value, { owner, unit, stat }) {
    if (owner.id !== unit.id) return;
    if (stat !== 'atk') return;
    const stacks = this.params[0] || 0;
    if (stacks <= 0) return;
    return Math.round(value * (1 + stacks * 0.03));
  }
}

registerEffect(StackFervor);
mapStack('_fervorStacks', 507);
