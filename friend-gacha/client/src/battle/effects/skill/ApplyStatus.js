import { Effect, registerEffect } from '../../effectSystem';

// 아군 전체에 방어 관통 상태 부여
// args: [관통량, 턴수]  예) [0.5, 2]
class GrantPartyIgnoreDef extends Effect {
  static ID = 311;

  onSkillUsed({ owner, unit, skill, targets, modSkill }) {
    if (owner.id !== unit.id) return;
    if (!modSkill || skill.id !== modSkill.id) return;
    if (!targets?.length) return;

    const amount = this.params[0] ?? 0.5;
    const turns = this.params[1] ?? 2;

    return {
      applyStatuses: targets.map(t => ({
        targetId: t.id,
        statusKey: 'party_ignore_def',
        displayName: '방어 관통',
        turns,
        params: [amount],
      })),
      log: `  ${unit.name} → ${targets.map(t => t.name).join(', ')}: 방어 관통 ${Math.round(amount * 100)}% (${turns}사이클)`,
    };
  }
}

registerEffect(GrantPartyIgnoreDef);
