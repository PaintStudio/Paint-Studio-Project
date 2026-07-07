import { Effect, registerEffect } from '../../effectSystem';

// 대상에게 광 속성 피해 증가 상태 부여
// args: [증가량, 턴수]  예) [0.5, 3]
class GrantLightDmgBoost extends Effect {
  static ID = 314;

  onSkillUsed({ owner, unit, skill, targets, modSkill }) {
    if (owner.id !== unit.id) return;
    if (!modSkill || skill.id !== modSkill.id) return;
    if (!targets?.length) return;

    const amount = this.params[0] ?? 0.5;
    const turns = this.params[1] ?? 3;

    return {
      applyStatuses: targets.map(t => ({
        targetId: t.id,
        statusKey: 'light_damage_boost',
        displayName: '광 피해 증가',
        turns,
        params: [amount],
      })),
      log: `  ${unit.name} → ${targets.map(t => t.name).join(', ')}: 광 속성 피해 +${Math.round(amount * 100)}% (${turns}사이클)`,
    };
  }
}

registerEffect(GrantLightDmgBoost);
