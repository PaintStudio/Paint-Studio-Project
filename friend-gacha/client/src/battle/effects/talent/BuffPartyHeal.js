import { Effect, registerEffect, mapType, getEffStat } from '../../effectSystem';

class BuffPartyHeal extends Effect {
  static ID = 143;
  onSkillUsed({ owner, unit, skill, party }) {
    if (owner.id !== unit.id) return;
    if (skill.type !== 'buff' || !party) return;
    const healAmt = Math.round(getEffStat(unit, 'atk') * this.params[0]);
    const heals = party.filter(u => u.alive).map(u => ({ unitId: u.id, amount: healAmt }));
    if (!heals.length) return;
    return {
      partyHeal: heals,
      log: `  [${unit.talent.name}] 아군 전체 HP ${healAmt} 회복`
    };
  }
}

registerEffect(BuffPartyHeal);
mapType('buff_party_heal', 143);
