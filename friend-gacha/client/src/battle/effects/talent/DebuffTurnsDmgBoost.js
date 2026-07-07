import { Effect, registerEffect, getDebuffs } from '../../effectSystem';

class DebuffTurnsDmgBoost extends Effect {
  static ID = 221;
  modifyDamageDealt(value, { owner, attacker, defender }) {
    if (owner.id !== attacker.id) return;
    if (!defender) return;
    const debuffs = getDebuffs(defender.id);
    if (!debuffs.length) return;
    const totalTurns = debuffs.reduce((sum, d) => sum + (d.turns || 0), 0);
    if (totalTurns <= 0) return;
    const ratio = this.params[0] || 0.1;
    return Math.round(value * (1 + totalTurns * ratio));
  }
}

registerEffect(DebuffTurnsDmgBoost);
