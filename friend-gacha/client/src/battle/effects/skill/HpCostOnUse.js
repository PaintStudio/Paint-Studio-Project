import { Effect, registerEffect } from '../../effectSystem';

// 스킬 사용 시 최대 HP의 일정 비율을 추가 코스트로 소모
// args: [비율]  예) [0.2] → maxHp의 20%
class HpCostOnUse extends Effect {
  static ID = 305;

  canPayCost(unit) {
    const hpLoss = Math.round(unit.maxHp * (this.params[0] ?? 0.1));
    return unit.hp > hpLoss;
  }

  onSkillUsed({ owner, unit, skill, modSkill }) {
    if (owner.id !== unit.id) return;
    if (!modSkill || skill.id !== modSkill.id) return;
    const ratio = this.params[0] ?? 0.1;
    const hpLoss = Math.round(unit.maxHp * ratio);
    return {
      selfDamage: hpLoss,
      log: `  ${unit.name}: HP ${hpLoss} 소모`
    };
  }
}

registerEffect(HpCostOnUse);
