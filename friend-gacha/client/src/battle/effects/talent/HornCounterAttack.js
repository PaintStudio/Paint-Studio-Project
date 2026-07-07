import { Effect, registerEffect, getEffStat } from '../../effectSystem';

class HornCounterAttack extends Effect {
  static ID = 185;
  onFirstCycle({ owner, unit }) {
    if (owner.id !== unit.id) return;
    const initial = this.params[0] || 1;
    const cur = (unit.combatStacks || {})._hornStacks || 0;
    return { combatStackUpdates: { _hornStacks: cur + initial }, log: `  [매와 함께하는 기사] ${unit.name}: 호각 ${initial}스택 획득` };
  }
  onSkillUsed({ owner, unit, skill, targets }) {
    if (owner.id !== unit.id) return;
    if (skill?.type !== 'defense') return;
    const horns = (unit.combatStacks || {})._hornStacks || 0;
    if (horns <= 0) return;
    const target = targets?.[0];
    if (!target) return;
    const atkRatio = this.params[1] || 0.8;
    const atk = getEffStat(unit, 'atk');
    const dmg = Math.round(atk * atkRatio);
    return {
      combatStackUpdates: { _hornStacks: horns - 1 },
      bonusDamage: [{ targetId: target.id, damage: dmg }],
      log: `  [매와 함께하는 기사] ${unit.name}: 호각 소모 → ${target.name}에게 ${dmg} 풍 피해`,
    };
  }
}

registerEffect(HornCounterAttack);
