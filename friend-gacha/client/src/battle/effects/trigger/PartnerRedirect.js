import { Effect, registerEffect, mapType } from '../../effectSystem';

class PartnerRedirect extends Effect {
  static ID = 125;
  onSkillUsed({ owner, unit, targets, party }) {
    if (owner.id !== unit.id) return;
    const target = targets?.[0];
    if (!target || target.id === unit.id) return;
    if (!party?.some(u => u.id === target.id)) return;
    const curPartner = this.getStack(unit, '_partnerId');
    if (curPartner === target.id) return;
    return {
      combatStackUpdates: { _partnerId: target.id },
      log: `  [${unit.talent.name}] ${target.name}이(가) 파트너가 됨`
    };
  }
  modifyEnemyTarget(target, { owner }) {
    if (!owner.alive) return;
    const partnerId = this.getStack(owner, '_partnerId');
    if (!partnerId || target.id !== partnerId) return;
    return owner;
  }
}

registerEffect(PartnerRedirect);
mapType('partner_redirect', 125);
