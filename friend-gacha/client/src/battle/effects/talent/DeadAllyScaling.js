import { Effect, registerEffect, mapType } from '../../effectSystem';

class DeadAllyScaling extends Effect {
  static ID = 149;
  _deadCount(ctx) {
    const party = ctx?.party;
    if (!party) return 0;
    return party.filter(u => !u.alive).length;
  }
  modifyStat(value, ctx) {
    if (ctx.owner.id !== ctx.unit.id) return;
    if (ctx.stat !== 'atk') return;
    const dead = this._deadCount(ctx);
    if (dead > 0) return Math.round(value * (1 + dead * (this.params[0] || 0.5)));
  }
  modifyCost(value, ctx) {
    if (ctx.owner.id !== ctx.unit.id) return;
    const dead = this._deadCount(ctx);
    if (dead > 0) return Math.max(1, value - dead * (this.params[1] || 1));
  }
}

registerEffect(DeadAllyScaling);
mapType('dead_ally_scaling', 149);
