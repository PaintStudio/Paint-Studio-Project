import { Effect, registerEffect, mapType } from '../../effectSystem';

class HealSpeedBuff extends Effect {
  static ID = 141;
  onSkillUsed({ owner, unit, skill, targets }) {
    if (owner.id !== unit.id) return;
    if (skill.type !== 'heal' || !targets?.length) return;
    const updates = [];
    for (const t of targets) {
      const cur = this.getStack(t, '_swiftStacks');
      updates.push({ targetId: t.id, stacks: { _swiftStacks: cur + 1 } });
    }
    return {
      partyStackUpdates: updates,
      log: `  [${unit.talent.name}] 대상에게 신속 부여`
    };
  }
  modifyStat(value, { stat, unit }) {
    if (stat !== 'spd') return;
    const swift = this.getStack(unit, '_swiftStacks');
    if (swift > 0) return Math.round(value * (1 + swift * (this.params[0] || 0.1)));
  }
}

registerEffect(HealSpeedBuff);
mapType('heal_speed_buff', 141);
