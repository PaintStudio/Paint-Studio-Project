import { Effect, registerEffect, mapStatus } from '../../effectSystem';

class StatusSubmerge extends Effect {
  static ID = 201;
  modifyEnemyOverload() { return true; }
  modifyEnemyDefCost(penalty) { return penalty + 1; }
}

registerEffect(StatusSubmerge);
mapStatus('submerge', 201);
