import { Effect, registerEffect, mapType } from '../../effectSystem';

class UniqueElementNoteRecover extends Effect {
  static ID = 106;
  onSkillUsed({ owner, unit, skill }) {
    if (owner.id !== unit.id) return;
    if (skill.type !== 'attack' && skill.type !== 'ultimate') return;
    const cs = unit.combatStacks || {};
    const usedElems = new Set(JSON.parse(cs['_usedElements'] || '[]'));
    usedElems.add(skill.element || unit.element);
    if (usedElems.size >= this.params[0]) {
      return {
        noteRecover: this.params[1],
        combatStackUpdates: { '_usedElements': '[]' },
        log: `  [${unit.talent.name}] ${this.params[0]}속성 달성! 노트 ${this.params[1]} 회복`
      };
    }
    return { combatStackUpdates: { '_usedElements': JSON.stringify([...usedElems]) } };
  }
}

registerEffect(UniqueElementNoteRecover);
mapType('unique_element_note_recover', 106);
