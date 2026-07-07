import { Effect, registerEffect } from '../../effectSystem';

// 디버프 스킬 사용 시 지속 시간 증가
// args: [extraTurns]  예) [2]
class DebuffDurationExtend extends Effect {
  static ID = 165;
  modifyDebuffTurns(value, { owner, unit, skill }) {
    if (owner.id !== unit.id) return;
    if (skill?.type !== 'debuff') return;
    return value + (this.params[0] || 2);
  }
}

registerEffect(DebuffDurationExtend);
