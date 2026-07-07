import { Effect, registerEffect } from '../../effectSystem';

class GrantCritDmgBoost extends Effect {
  static ID = 337;

  onSkillUsed({ owner, unit, skill, targets, modSkill }) {
    if (owner.id !== unit.id) return;
    if (!modSkill || skill.id !== modSkill.id) return;
    if (!targets?.length) return;

    const amount = this.params[0] || 0.15;
    const turns = this.params[1] || 1;

    return {
      applyStatuses: targets.map(t => ({
        targetId: t.id,
        statusKey: 'crit_dmg_boost',
        displayName: '치명타 피해 증가',
        turns,
        params: [amount],
      })),
      log: `  ${targets.map(t => t.name).join(', ')}: 치명타 피해 +${Math.round(amount * 100)}% (${turns}사이클)`,
    };
  }
}

registerEffect(GrantCritDmgBoost);
