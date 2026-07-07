import { Effect, registerEffect, getEffStat } from '../../effectSystem';

class AllyShieldGrant extends Effect {
  static ID = 329;

  onSkillUsed({ owner, unit, skill, targets, modSkill }) {
    if (owner.id !== unit.id) return;
    if (modSkill?.id !== skill?.id) return;
    if (!targets?.length) return;
    const ratio = this.params[0] || 1.5;
    const amount = Math.round(getEffStat(unit, 'atk') * ratio);
    return {
      partyShieldGrant: targets.map(t => ({ unitId: t.id, amount })),
      log: `  ${targets.map(t => t.name).join(', ')}: 보호막 ${amount} 획득`
    };
  }
}

registerEffect(AllyShieldGrant);
