import { Effect, registerEffect } from '../../effectSystem';

// 대상에게 지정 속성 피해 증가 상태 부여
// args: [element, amount, turns]  예) ["water", 0.5, 3]
class GrantElementDmgBoost extends Effect {
  static ID = 348;
  onSkillUsed({ owner, unit, skill, targets, modSkill }) {
    if (owner.id !== unit.id) return;
    if (!modSkill || skill.id !== modSkill.id) return;
    if (!targets?.length) return;
    const element = this.params[0] || 'neutral';
    const amount = this.params[1] ?? 0.5;
    const turns = this.params[2] ?? 3;
    const elemNames = { fire: '염', water: '수', wind: '풍', light: '광', dark: '암', neutral: '무' };
    return {
      applyStatuses: targets.map(t => ({
        targetId: t.id,
        statusKey: 'element_damage_boost',
        displayName: `${elemNames[element] || element} 피해 증가`,
        turns,
        params: [element, amount],
      })),
      log: `  ${targets.map(t => t.name).join(', ')}: ${elemNames[element] || element} 속성 피해 +${Math.round(amount * 100)}% (${turns}사이클)`,
    };
  }
}

registerEffect(GrantElementDmgBoost);
