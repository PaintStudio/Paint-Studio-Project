import { Effect, registerEffect } from '../../effectSystem';

// 대상에게 크리티컬 확률 증가 상태 부여
// args: [증가량, 턴수]  예) [0.2, 3]
class GrantCritBoost extends Effect {
  static ID = 317;

  onSkillUsed({ owner, unit, skill, targets, modSkill }) {
    if (owner.id !== unit.id) return;
    if (!modSkill || skill.id !== modSkill.id) return;
    if (!targets?.length) return;

    const amount = this.params[0] ?? 0.2;
    const turns = this.params[1] ?? 3;

    return {
      applyStatuses: targets.map(t => ({
        targetId: t.id,
        statusKey: 'crit_boost_status',
        displayName: '크리티컬 증가',
        turns,
        params: [amount],
      })),
      log: `  ${unit.name} → ${targets.map(t => t.name).join(', ')}: 크리티컬 +${Math.round(amount * 100)}% (${turns}사이클)`,
    };
  }
}

registerEffect(GrantCritBoost);
