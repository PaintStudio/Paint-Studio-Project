import { Effect, registerEffect, mapType } from '../../effectSystem';

class NoteRegen extends Effect {
  static ID = 13;
  turnStartNotes(value) {
    return value + this.params[0];
  }
}

registerEffect(NoteRegen);
mapType('note_regen', 13);
