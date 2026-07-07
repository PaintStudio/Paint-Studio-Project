import { Effect, registerEffect, mapType } from '../../effectSystem';

// BattlePage.jsx 턴 시작 섹션에서 _extraTurn 체크 후 직접 처리
class ExtraTurnCdReduce extends Effect {
  static ID = 155;
}

registerEffect(ExtraTurnCdReduce);
mapType('extra_turn_cd_reduce', 155);
