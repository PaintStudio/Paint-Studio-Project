import { Effect, registerEffect, mapType } from '../../effectSystem';

class Revive extends Effect {
  static ID = 109;
  onLethalDamage({ owner, unit }) {
    if (owner.id !== unit.id) return;
    if (this.getStack(unit, '_reviveUsed')) return;
    const hp = Math.round(unit.maxHp * this.params[0]);
    return {
      preventDeath: true, reviveHp: hp,
      combatStackUpdates: { _reviveUsed: 1 },
      log: `  [${unit.talent?.name || '부활'}] ${unit.name} 부활! (HP ${hp})`
    };
  }
}

registerEffect(Revive);
mapType('revive', 109);
