import { Effect, registerEffect, getBattleContext } from '../../effectSystem';

class BossSupportCdReduce extends Effect {
  static ID = 222;
  modifyBaseCooldown(value, { owner, unit, skill }) {
    if (owner.id !== unit.id) return;
    if (skill?.type !== 'support') return;
    const { enemies } = getBattleContext();
    const hasBoss = (enemies || []).some(e => e.alive && e.tags?.some(t => t.label === '보스'));
    if (!hasBoss) return;
    const reduce = this.params[0] || 1;
    return Math.max(0, value - reduce);
  }
}

registerEffect(BossSupportCdReduce);
