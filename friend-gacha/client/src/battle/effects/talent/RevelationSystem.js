import { Effect, registerEffect } from '../../effectSystem';

class RevelationSystem extends Effect {
  static ID = 224;
  onCycleStart({ owner, unit, party }) {
    if (owner.id !== unit.id) return;
    const others = (party || []).filter(u => u.alive && u.id !== owner.id);
    if (!others.length) return;
    if (this.state._prevTarget) {
      const prevId = this.state._prevTarget;
      const updates = [{ targetId: prevId, stacks: { _revelationStacks: 0 } }];
      const chosen = others[Math.floor(Math.random() * others.length)];
      this.state._prevTarget = chosen.id;
      updates.push({ targetId: chosen.id, stacks: { _revelationStacks: 1 } });
      return {
        partyStackUpdates: updates,
        log: `  [신께서 명하신 대로] ${chosen.name}에게 계시 부여`,
      };
    }
    const chosen = others[Math.floor(Math.random() * others.length)];
    this.state._prevTarget = chosen.id;
    return {
      partyStackUpdates: [{ targetId: chosen.id, stacks: { _revelationStacks: 1 } }],
      log: `  [신께서 명하신 대로] ${chosen.name}에게 계시 부여`,
    };
  }
  onSkillUsed({ owner, unit, skill, targets }) {
    if (owner.id !== unit.id) return;
    if (skill?.type !== 'buff' && skill?.type !== 'support') return;
    if (!targets?.length) return;
    const heals = [];
    for (const t of targets) {
      if (t.id === unit.id) continue;
      if (!((t.combatStacks || {})._revelationStacks > 0)) continue;
      const ratio = this.params[0] || 0.1;
      const amt = Math.round(t.maxHp * ratio);
      heals.push({ unitId: t.id, amount: amt });
    }
    if (!heals.length) return;
    return {
      partyHeal: heals,
      log: `  [신께서 명하신 대로] 계시 대상 HP ${heals.map(h => h.amount).join('/')} 회복`,
    };
  }
}

registerEffect(RevelationSystem);
