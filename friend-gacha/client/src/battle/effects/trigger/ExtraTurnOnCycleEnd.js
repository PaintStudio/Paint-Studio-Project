import { Effect, registerEffect, mapType } from '../../effectSystem';

class ExtraTurnOnCycleEnd extends Effect {
  static ID = 103;
  modifyDef(value, { attacker }) {
    if ((attacker.combatStacks || {})._extraTurn) return Math.round(value * (1 - (this.params[0] || 0)));
  }
  onCycleEnd({ unit }) {
    if (unit.alive && unit.notes > 0) {
      return { extraTurn: true, log: `  [${unit.talent.name}] ${unit.name} 추가 턴! (노트 ${unit.notes} 남음)` };
    }
  }
}

registerEffect(ExtraTurnOnCycleEnd);
mapType('extra_turn_on_cycle_end', 103);
