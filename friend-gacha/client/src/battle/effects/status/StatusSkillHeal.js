import { Effect, registerEffect, mapStatus } from '../../effectSystem';

class StatusSkillHeal extends Effect {
  static ID = 211;
  onSkillUsed({ owner, unit }) {
    if (owner.id !== unit.id) return;
    const healAmt = this.params[0] || 0;
    if (healAmt <= 0) return;
    return {
      selfHeal: healAmt,
      log: `  [성화만개] ${unit.name}: HP ${healAmt} 회복`,
    };
  }
}

registerEffect(StatusSkillHeal);
mapStatus('skill_heal', 211);
