import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../utils/api';
import './AttendanceModal.css';

export default function AttendanceModal({ onClose }) {
  const [data, setData] = useState(null);
  const [stampAnim, setStampAnim] = useState(false);
  const [rewardPopup, setRewardPopup] = useState(null);
  const [newStampIndex, setNewStampIndex] = useState(-1);

  const load = useCallback(async () => {
    try {
      const res = await api.attendance();
      setData(res);

      if (!res.todayStamped) {
        const stampRes = await api.attendanceStamp();
        if (!stampRes.alreadyStamped) {
          setNewStampIndex(stampRes.stampIndex);
          setTimeout(() => setStampAnim(true), 300);
          setTimeout(() => setRewardPopup(stampRes.rewardText), 900);
          setData(prev => ({
            ...prev,
            todayStamped: true,
            stamps: [...prev.stamps, { date: new Date().toISOString().split('T')[0], index: stampRes.stampIndex }],
          }));
        }
      }
    } catch (err) {
      console.error('출석부 로드 실패:', err);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (!data) return null;

  const stampedSet = new Set(data.stamps.map(s => s.index));
  const monthLabel = data.monthKey.replace('-', '년 ') + '월';

  return createPortal(
    <div className="attendance-backdrop" onClick={onClose}>
      <div className="attendance-modal" onClick={e => e.stopPropagation()}>
        <div className="attendance-header">
          <h3>&#128197; {monthLabel} 출석부</h3>
          <span className="attendance-count">{data.stamps.length} / 28</span>
          <button className="attendance-close" onClick={onClose}>&times;</button>
        </div>

        <div className="attendance-grid">
          {(data.rewards || []).map((reward, i) => {
            const stamped = stampedSet.has(i);
            const isNew = i === newStampIndex;
            const isMilestone = (i + 1) % 7 === 0;

            const parts = [];
            if (reward.currency) parts.push(`&#128142;${reward.currency}`);
            if (reward.gold) parts.push(`${reward.gold.toLocaleString()}G`);
            if (reward.items) reward.items.forEach(it => parts.push(`${it.name || it.itemId} x${it.count}`));
            const rewardLabel = parts.join(' + ');

            return (
              <div key={i} className={
                'stamp-cell' +
                (stamped ? ' stamped' : '') +
                (isNew && stampAnim ? ' stamp-new' : '') +
                (isMilestone ? ' milestone' : '')
              }>
                <div className="stamp-day">{i + 1}</div>
                <div className="stamp-reward" dangerouslySetInnerHTML={{ __html: rewardLabel }} />
                {stamped && <div className={`stamp-mark${isNew && stampAnim ? ' stamp-pop' : ''}`}>&#10004;</div>}
              </div>
            );
          })}
        </div>

        {rewardPopup && (
          <div className="attendance-reward-popup" onAnimationEnd={() => setTimeout(() => setRewardPopup(null), 2000)}>
            <span>&#127873; {rewardPopup}</span>
            <span className="reward-sub">우편함으로 발송되었습니다</span>
          </div>
        )}
      </div>
    </div>,
    document.getElementById('game-root') || document.body
  );
}
