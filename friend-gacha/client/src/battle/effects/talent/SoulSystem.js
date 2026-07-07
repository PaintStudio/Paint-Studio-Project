import { Effect, registerEffect } from '../../effectSystem';

// 전투 시작 시 영혼 획득, 영혼 보유자 치명타 피해 증가, 아군 대상 시 영혼 이동
// args: [critDmgBoost]  예) [0.8]
class SoulSystem extends Effect {
  static ID = 164;

  onFirstCycle({ owner, unit }) {
    if (owner.id !== unit.id) return;
    return {
      combatStackUpdates: { _soulStacks: 1 },
      log: `  [영혼] ${unit.name}: 영혼 획득`,
    };
  }

  modifyCritMult(value, { owner, attacker }) {
    if (!owner.alive) return;
    if (!(attacker.combatStacks || {})._soulStacks) return;
    return value + (this.params[0] || 0.8);
  }

  onSkillUsed({ owner, unit, skill, targets, party }) {
    if (!owner.alive) return;
    if (!(unit.combatStacks || {})._soulStacks) return;
    if (!targets?.length || !party?.length) return;
    const allyTarget = targets.find(t => t.id !== unit.id && party.some(p => p.id === t.id));
    if (!allyTarget) return;
    return {
      partyStackUpdates: [
        { targetId: unit.id, stacks: { _soulStacks: 0 } },
        { targetId: allyTarget.id, stacks: { _soulStacks: 1 } },
      ],
      log: `  [영혼] ${unit.name} → ${allyTarget.name}: 영혼 이동`,
    };
  }
}

registerEffect(SoulSystem);
