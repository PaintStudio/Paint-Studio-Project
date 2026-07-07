import { Effect, registerEffect } from '../../effectSystem';

// 스킬 사용 후 보호막 부여
// args: [비율]  예) [0.15] → maxHp의 15%
class ShieldOnUse extends Effect {
  static ID = 303;

  onPostSkill({ owner, unit, skill, modSkill }) {
    if (owner.id !== unit.id) return;
    if (!modSkill || skill.id !== modSkill.id) return;

    const amount = Math.round(unit.maxHp * (this.params[0] ?? 0.1));
    return {
      grantShield: amount,
      log: `  ${unit.name}: 보호막 ${amount} 획득!`
    };
  }
}

registerEffect(ShieldOnUse);
