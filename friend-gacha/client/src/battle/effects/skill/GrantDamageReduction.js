import { Effect, registerEffect } from '../../effectSystem';

// 모든 아군에게 피해 감소 상태 부여
// args: [reduction, turns]  예) [0.45, 1]
class GrantDamageReduction extends Effect {
  static ID = 341;

  onSkillUsed({ owner, unit, skill, targets, modSkill, party }) {
    if (owner.id !== unit.id) return;
    if (!modSkill || skill.id !== modSkill.id) return;

    const reduction = this.params[0] || 0.45;
    const turns = this.params[1] || 1;
    const alive = (targets?.length ? targets : (party || [])).filter(u => u.alive);
    if (!alive.length) return;

    return {
      applyStatuses: alive.map(u => ({ targetId: u.id, statusKey: 'damage_reduction', displayName: '피해 감소', turns, params: [reduction] })),
      log: `  [피해 감소] 모든 아군: 피해 ${Math.round(reduction * 100)}% 감소 (${turns}사이클)`,
    };
  }
}

registerEffect(GrantDamageReduction);
