import { Effect, registerEffect, mapType } from '../../effectSystem';

class BuffGrantStealth extends Effect {
  static ID = 154;
  onSkillUsed({ owner, unit, skill, targets }) {
    if (owner.id !== unit.id) return;
    if (skill.type !== 'buff') return;
    const updates = [];
    for (const t of targets) {
      if (t.id === unit.id) continue;
      const cur = this.getStack(t, '_stealthStacks');
      updates.push({ targetId: t.id, stacks: { _stealthStacks: cur + (this.params[0] || 2) } });
    }
    if (!updates.length) return;
    return {
      partyStackUpdates: updates,
      log: `  [${unit.talent.name}] 대상에게 은신 ${this.params[0] || 2}스택 부여`
    };
  }
  modifyEnemyTarget(target, { owner, livingTargets }) {
    const stealth = this.getStack(target, '_stealthStacks');
    if (stealth <= 0) return;
    const nonStealth = (livingTargets || []).filter(u => !((u.combatStacks || {})._stealthStacks > 0));
    if (nonStealth.length > 0) return nonStealth[Math.floor(Math.random() * nonStealth.length)];
  }
}

registerEffect(BuffGrantStealth);
mapType('buff_grant_stealth', 154);
