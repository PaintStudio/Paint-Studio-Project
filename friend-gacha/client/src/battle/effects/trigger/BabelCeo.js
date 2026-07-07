import { Effect, registerEffect, mapType } from '../../effectSystem';

class BabelCeo extends Effect {
  static ID = 132;
  onBuffApplied({ owner, caster, target, wasExtended }) {
    if (caster.id !== owner.id || !wasExtended) return;
    const cur = this.getStack(target, '_babelStacks');
    return {
      partyStackUpdates: [{ targetId: target.id, stacks: { _babelStacks: cur + 1 } }],
      log: `  [바벨 CEO] ${target.name} 바벨 ${cur + 1}스택`
    };
  }
}

registerEffect(BabelCeo);
mapType('babel_ceo', 132);
