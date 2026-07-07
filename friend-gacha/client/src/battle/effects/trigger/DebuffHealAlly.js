import { Effect, registerEffect, mapType, getEffStat } from '../../effectSystem';

class DebuffHealAlly extends Effect {
  static ID = 111;
  onSkillUsed({ owner, unit, skill, party }) {
    if (owner.id !== unit.id) return;
    if (skill.type !== 'debuff' || !party) return;
    const allies = party.filter(u => u.alive && u.id !== unit.id);
    if (!allies.length) return;
    const weakest = allies.reduce((a, b) => (a.hp / a.maxHp) < (b.hp / b.maxHp) ? a : b);
    const healAmt = Math.round(getEffStat(unit, 'atk') * this.params[0]);
    if (healAmt <= 0) return;
    return {
      partyHeal: [{ unitId: weakest.id, amount: healAmt }],
      log: `  [${unit.talent.name}] ${weakest.name} HP ${healAmt} 회복`
    };
  }
}

registerEffect(DebuffHealAlly);
mapType('debuff_heal_ally', 111);
