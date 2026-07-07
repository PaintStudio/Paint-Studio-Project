import { Effect, registerEffect, getEffStat } from '../../effectSystem';

// 대상에게 좌표 마크 부여 — 아군 행동 시 추가 피해
// args: [피해비율, 속성, 턴수]  예) [0.1, 'light', 2]
class ApplyMark extends Effect {
  static ID = 309;

  onSkillUsed({ owner, unit, skill, targets, modSkill }) {
    if (owner.id !== unit.id) return;
    if (!modSkill || skill.id !== modSkill.id) return;
    if (!targets?.length) return;

    const damageRatio = this.params[0] ?? 0.1;
    const element = this.params[1] ?? unit.element;
    const turns = this.params[2] ?? 2;
    const atkSnapshot = getEffStat(unit, 'atk');

    return {
      applyMarks: targets.map(t => ({
        targetId: t.id,
        mark: { casterId: unit.id, casterName: unit.name, atkSnapshot, damageRatio, element, turns }
      })),
      log: `  ${unit.name} → ${targets.map(t => t.name).join(', ')}: 좌표 고정 (${turns}턴, ${Math.round(damageRatio * 100)}% ${element})`
    };
  }
}

registerEffect(ApplyMark);
