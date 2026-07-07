import { Effect, registerEffect } from '../../effectSystem';

// 이 effectId가 할당된 스킬은 cdReduce 대상이 됨 (버프 사용 시 쿨다운 감소)
// args 없음 — 마커 역할만 수행
class CdReduceReceiver extends Effect {
  static ID = 312;
}

registerEffect(CdReduceReceiver);
