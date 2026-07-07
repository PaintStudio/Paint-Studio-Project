import { Effect, registerEffect } from '../../effectSystem';

class WindSkillSelfHeal extends Effect {
  static ID = 187;
  onSkillUsed({ owner, unit, skill }) {
    if (owner.id !== unit.id) return;
    if (skill?.element !== 'wind') return;
    const ratio = this.params[0] || 0.05;
    const healAmt = Math.round(unit.maxHp * ratio);
    return { selfHeal: healAmt, log: `  [정령술의 기사] ${unit.name}: HP ${healAmt} 회복` };
  }
}

registerEffect(WindSkillSelfHeal);
