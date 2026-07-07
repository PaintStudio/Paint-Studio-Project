import { Effect, registerEffect } from '../../effectSystem';

// 대상에게 사이클 도발 부여 상태 적용
// args: [스택수, 턴수]  예) [2, 3]
class GrantCycleTaunt extends Effect {
  static ID = 313;

  onSkillUsed({ owner, unit, skill, targets, modSkill }) {
    if (owner.id !== unit.id) return;
    if (!modSkill || skill.id !== modSkill.id) return;
    if (!targets?.length) return;

    const stacks = this.params[0] ?? 2;
    const turns = this.params[1] ?? 3;

    return {
      applyStatuses: targets.map(t => ({
        targetId: t.id,
        statusKey: 'cycle_taunt_grant',
        displayName: '도발 부여',
        turns,
        params: [stacks],
      })),
      log: `  ${unit.name} → ${targets.map(t => t.name).join(', ')}: 매 사이클 도발 ${stacks}스택 (${turns}사이클)`,
    };
  }
}

registerEffect(GrantCycleTaunt);
