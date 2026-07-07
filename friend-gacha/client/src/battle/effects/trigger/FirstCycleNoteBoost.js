import { Effect, registerEffect, mapType } from '../../effectSystem';

class FirstCycleNoteBoost extends Effect {
  static ID = 118;
  onFirstCycle({ unit }) {
    return {
      partyMaxNoteBoost: this.params[0],
      log: `  [${unit.talent.name}] 모든 아군 턴 노트 최대치 +${this.params[0]} & 전회복`
    };
  }
}

registerEffect(FirstCycleNoteBoost);
mapType('first_cycle_note_boost', 118);
