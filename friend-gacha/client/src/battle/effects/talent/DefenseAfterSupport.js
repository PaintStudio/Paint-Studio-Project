import { Effect, registerEffect, getEffStat } from '../../effectSystem';

class DefenseAfterSupport extends Effect {
  static ID = 194;
  onSkillUsed({ owner, unit, skill, targets }) {
    if (owner.id !== unit.id) return;
    if (skill?.type === 'support') {
      this.state._usedSupportThisCycle = true;
      return;
    }
    if (skill?.type !== 'defense') return;
    if (!this.state._usedSupportThisCycle) return;
    const target = targets?.[0];
    if (!target) return;
    const atkRatio = this.params[0] || 1.5;
    const atk = getEffStat(unit, 'atk');
    const dmg = Math.round(atk * atkRatio);
    return {
      bonusDamage: [{ targetId: target.id, damage: dmg }],
      log: `  [긍지 높은 플레이어] ${unit.name} → ${target.name}: 광 속성 ${dmg} 피해`,
    };
  }
  onCycleStart({ owner, unit }) {
    if (owner.id !== unit.id) return;
    this.state._usedSupportThisCycle = false;
  }
}

registerEffect(DefenseAfterSupport);
