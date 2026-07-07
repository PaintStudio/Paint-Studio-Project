import { Effect, registerEffect } from '../../effectSystem';

// 아군 대상 시 피해 대신 회복으로 전환하는 마커 이펙트
// args: [회복비율]  예) [0.5]
class AllyHealConvert extends Effect {
  static ID = 323;
}

registerEffect(AllyHealConvert);
