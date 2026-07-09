import { Effect, registerEffect, mapStatus, getEffStat, getBattleContext } from '../../effectSystem';

class StatusColorExtract extends Effect {
  static ID = 210;

  onEnemyStatusTick({ owner }) {
    if (!owner.alive) return;
    const statuses = owner.statuses || [];
    const ce = statuses.find(s => s.statusKey === 'color_extract');
    if (!ce) return;
    const party = getBattleContext().party || [];
    const caster = party.find(u => u.id === ce.casterId);
    if (!caster?.alive) return;
    const atkRatio = ce.atkRatio || 3.0;
    const dot = Math.round(getEffStat(caster, 'atk') * atkRatio);
    return {
      selfDamage: dot,
      log: `  [색 추출] ${owner.name}: ${dot} 암 속성 피해 (${caster.name})`,
    };
  }
}

registerEffect(StatusColorExtract);
mapStatus('color_extract', 210);
