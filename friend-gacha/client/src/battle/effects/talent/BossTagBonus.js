import { Effect, registerEffect, mapType } from '../../effectSystem';

class BossTagBonus extends Effect {
  static ID = 146;
  _hasBoss(ctx) {
    const enemies = ctx?.enemies;
    if (!enemies) return false;
    return enemies.some(e => e.alive && (e.isBoss || (e.tags || []).some(t => t.label === '보스')));
  }
  modifyCost(value, ctx) {
    if (ctx.owner.id !== ctx.unit.id) return;
    if (!this._hasBoss(ctx)) return;
    return Math.max(1, value - (this.params[0] || 1));
  }
  modifyDamageDealt(value, ctx) {
    if (ctx.owner.id !== ctx.attacker.id) return;
    if (!this._hasBoss(ctx)) return;
    return Math.round(value * (1 + (this.params[1] || 0.25)));
  }
}

registerEffect(BossTagBonus);
mapType('boss_tag_bonus', 146);
