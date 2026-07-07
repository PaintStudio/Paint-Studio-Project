import { Effect, registerEffect, mapType } from '../../effectSystem';

class FirstCycleExtraTurn extends Effect {
  static ID = 152;
  onFirstCycle({ unit }) {
    return {
      extraTurn: true,
      log: `  [${unit.talent.name}] 첫 사이클 추가 턴!`
    };
  }
}

registerEffect(FirstCycleExtraTurn);
mapType('first_cycle_extra_turn', 152);
