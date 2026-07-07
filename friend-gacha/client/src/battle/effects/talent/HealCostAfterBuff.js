import { Effect, registerEffect } from '../../effectSystem';

// 버프 없는 대상에 버프 사용 → 다음 회복 스킬 코스트 감소
// args: [costReduce]  예) [3]
class HealCostAfterBuff extends Effect {
  static ID = 163;
  onSkillUsed({ owner, unit, skill, targets }) {
    if (owner.id !== unit.id) return;
    if (skill.type !== 'buff') return;
    if (!targets?.some(t => !(t.buffs?.length > 0))) return;
    this.state._healDiscount = this.params[0] || 3;
    return { log: `  [호프풀 프론티어] 다음 회복 스킬 코스트 -${this.state._healDiscount}` };
  }

  modifyCost(value, { owner, unit, skill }) {
    if (owner.id !== unit.id) return;
    if (skill.type !== 'heal') return;
    if (!this.state._healDiscount) return;
    const reduce = this.state._healDiscount;
    this.state._healDiscount = 0;
    return Math.max(1, value - reduce);
  }
}

registerEffect(HealCostAfterBuff);
