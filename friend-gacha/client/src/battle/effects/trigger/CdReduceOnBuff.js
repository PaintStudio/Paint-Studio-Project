import { Effect, registerEffect, mapSkillExtra } from '../../effectSystem';

class CdReduceOnBuff extends Effect {
  static ID = 135;
  onSkillUsed({ owner, unit, skill }) {
    if (owner.id !== unit.id) return;
    if (skill.type === 'buff') return { cdReduce: 1 };
  }
}

registerEffect(CdReduceOnBuff);
mapSkillExtra('cd_reduce_on_buff', 135);
