import { Effect, registerEffect, getEffStat } from '../../effectSystem';

class GrantPartySkillHeal extends Effect {
  static ID = 338;

  onSkillUsed({ owner, unit, skill, party, modSkill }) {
    if (owner.id !== unit.id) return;
    if (!modSkill || skill.id !== modSkill.id) return;

    const ratio = this.params[0] || 0.35;
    const turns = this.params[1] || 3;
    const healAmt = Math.round(getEffStat(unit, 'atk') * ratio);
    const alive = (party || []).filter(u => u.alive);
    if (!alive.length) return;

    return {
      applyStatuses: alive.map(u => ({
        targetId: u.id,
        statusKey: 'skill_heal',
        displayName: '성화만개',
        turns,
        params: [healAmt],
      })),
      log: `  [성화만개] 모든 아군: 스킬 사용 시 HP ${healAmt} 회복 (${turns}사이클)`,
    };
  }
}

registerEffect(GrantPartySkillHeal);
