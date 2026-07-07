import { Effect, registerEffect, mapType } from '../../effectSystem';

class FirstDefenseBonus extends Effect {
  static ID = 122;
  modifyDefenseMult(value, { attacker, owner }) {
    const defended = (owner.combatStacks || {})._defendedIds || {};
    if (!defended[attacker.id]) return value + this.params[0];
  }
  onDefenseUsed({ owner, defender, attacker }) {
    if (owner.id !== defender.id) return;
    const defended = (defender.combatStacks || {})._defendedIds || {};
    if (!defended[attacker.id]) {
      return {
        defenderStackUpdates: { _defendedIds: { ...defended, [attacker.id]: true } },
        log: `  [${defender.talent.name}] 처음 방어! 방어율 +${Math.round(this.params[0] * 100)}%`
      };
    }
  }
}

registerEffect(FirstDefenseBonus);
mapType('first_defense_bonus', 122);
