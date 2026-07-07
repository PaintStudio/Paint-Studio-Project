import { Effect, registerEffect, cleanseByStat } from '../../effectSystem';

class PartyDefDebuffImmune extends Effect {
  static ID = 218;
  onDebuffApplied({ owner, target }) {
    if (!owner.alive) return;
    if (target.isEnemy) return;
    const removed = cleanseByStat(target.id, 'def');
    if (!removed) return;
    return { log: `  [배신하지 않는 믿음] ${target.name}: DEF 감소 디버프 무효화` };
  }
}

registerEffect(PartyDefDebuffImmune);
