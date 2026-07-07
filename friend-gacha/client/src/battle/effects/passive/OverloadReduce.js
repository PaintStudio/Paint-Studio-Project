import { Effect, registerEffect, mapType } from '../../effectSystem';

class OverloadReduce extends Effect {
  static ID = 9;
  modifyOverloadInc(value) {
    return Math.max(0, value - this.params[0]);
  }
}

registerEffect(OverloadReduce);
mapType('overload_reduce', 9);
