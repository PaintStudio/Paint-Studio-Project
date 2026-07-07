import { Effect, registerEffect, mapType } from '../../effectSystem';

class AtkBoostVsSlower extends Effect {
  static ID = 3;
  modifyAtk(value, { attackerSpd, defenderSpd }) {
    if (attackerSpd > defenderSpd) return Math.round(value * (1 + this.params[0]));
  }
}

registerEffect(AtkBoostVsSlower);
mapType('atk_boost_vs_slower', 3);
