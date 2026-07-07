import { Effect, registerEffect, mapType } from '../../effectSystem';

class AbsorbDebuff extends Effect {
  static ID = 134;
  onSkillUsed({ owner, unit, skill, targets, party }) {
    if (owner.id !== unit.id) return;
    if (skill.type !== 'buff' || !targets || !party) return;
    const transfers = [];
    for (const t of targets) {
      if (t.id === unit.id) continue;
      const ally = party.find(u => u.id === t.id);
      if (!ally || !ally.debuffs?.length) continue;
      const debuff = ally.debuffs[0];
      transfers.push({ fromId: ally.id, fromName: ally.name, debuff });
      break;
    }
    if (!transfers.length) return;
    return {
      debuffTransfers: transfers,
      log: `  [${unit.talent.name}] ${transfers[0].fromName}의 디버프를 흡수`
    };
  }
}

registerEffect(AbsorbDebuff);
mapType('absorb_debuff', 134);
