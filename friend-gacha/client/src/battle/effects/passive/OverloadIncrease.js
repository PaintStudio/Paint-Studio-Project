import { Effect, registerEffect, mapType } from '../../effectSystem';

class OverloadIncrease extends Effect {
  static ID = 10;
  modifyOverloadInc(value) {
    return value + this.params[0];
  }
}

registerEffect(OverloadIncrease);
mapType('overload_increase', 10);
