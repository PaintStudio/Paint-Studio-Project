import { Effect, registerEffect, mapType } from '../../effectSystem';

class DebuffTaunt extends Effect {
  static ID = 108;
  modifyEnemyTarget(target, { enemy, owner }) {
    if (enemy.debuffs?.length > 0 && owner.alive && Math.random() < 0.8) return owner;
  }
  calcDamageReduction(value, { attacker }) {
    if (attacker?.debuffs?.length > 0 && this.params[0]) return value + this.params[0];
  }
}

registerEffect(DebuffTaunt);
mapType('debuff_taunt', 108);
