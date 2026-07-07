import { Effect, registerEffect, mapType } from '../../effectSystem';

class DamageReduce extends Effect {
  static ID = 5;
  calcDamageReduction(value) {
    return value + this.params[0];
  }
}

registerEffect(DamageReduce);
mapType('damage_reduce', 5);
