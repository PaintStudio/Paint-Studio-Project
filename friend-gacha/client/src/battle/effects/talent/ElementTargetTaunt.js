import { Effect, registerEffect } from '../../effectSystem';

class ElementTargetTaunt extends Effect {
  static ID = 188;
  onSkillUsed({ owner, unit, targets }) {
    if (owner.id !== unit.id) return;
    if (!targets?.length) return;
    const elements = this.params[0] || ['water', 'wind'];
    let tauntGain = 0;
    for (const t of targets) {
      if (t.id === unit.id) continue;
      if (elements.includes(t.element)) tauntGain++;
    }
    if (tauntGain <= 0) return;
    const cur = (unit.combatStacks || {})._tauntStacks || 0;
    return {
      combatStackUpdates: { _tauntStacks: cur + tauntGain },
      log: `  [이 푸른 하늘 아래에서] ${unit.name}: 도발 ${tauntGain}스택 획득`,
    };
  }
}

registerEffect(ElementTargetTaunt);
