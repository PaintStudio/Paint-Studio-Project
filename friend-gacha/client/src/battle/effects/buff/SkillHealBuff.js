import { Effect, registerEffect } from '../../effectSystem';

// 방어 이외의 스킬 사용 시 HP 회복 버프
// args: [회복량]
class SkillHealBuff extends Effect {
  static ID = 404;

  onSkillUsed({ owner, unit, skill }) {
    if (owner.id !== unit.id) return;
    if (skill.type === 'defense') return;
    const healAmt = this.params[0];
    if (!healAmt || healAmt <= 0) return;
    return {
      selfHeal: healAmt,
      log: `  [활력 주입] ${unit.name} HP ${healAmt} 회복`,
    };
  }
}

registerEffect(SkillHealBuff);
