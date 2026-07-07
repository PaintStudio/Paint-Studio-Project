import { Effect, registerEffect, mapType } from '../../effectSystem';

class DefenseBoost extends Effect {
  static ID = 11;
  modifyDefenseMult(value) {
    return value + this.params[0];
  }
}

registerEffect(DefenseBoost);
mapType('defense_boost', 11);
