import { Effect, registerEffect } from '../../effectSystem';

class DebuffCycleDefBoost extends Effect {
  static ID = 220;
  onSkillUsed({ owner, unit, skill }) {
    if (owner.id !== unit.id) return;
    if (skill?.type !== 'debuff') return;
    this.state._usedDebuffThisCycle = true;
  }
  modifyStat(value, { owner, unit, stat }) {
    if (owner.id !== unit.id) return;
    if (stat !== 'def') return;
    if (!this.state._usedDebuffThisCycle) return;
    return Math.round(value * (1 + (this.params[0] || 1)));
  }
  onCycleStart({ owner, unit }) {
    if (owner.id !== unit.id) return;
    this.state._usedDebuffThisCycle = false;
  }
}

registerEffect(DebuffCycleDefBoost);
