import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';
import CurrencyIcon, { currencyImg } from '../components/CurrencyIcon';
import { timeAgo } from '../utils/gameConstants';
import './SocialPage.css';

export default function SocialPage({ user, addToast, onRefresh }) {
  const [mails, setMails] = useState([]);
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    try { const d = await api.mailList(); setMails(d.mails); } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);

  const claim = async (id) => {
    try {
      const r = await api.mailClaim(id);
      const parts = [];
      if (r.rewards?.currency) parts.push(`${currencyImg('prism')} ${r.rewards.currency}`);
      if (r.rewards?.gold) parts.push(`${currencyImg('bit')} ${r.rewards.gold}`);
      if (r.rewards?.items) r.rewards.items.forEach(it => parts.push(`${it.name || it.itemId} x${it.count}`));
      addToast('보상 수령! ' + parts.join(' '), 'trade');
      load();
      onRefresh();
    } catch (e) { addToast(e.message, 'error'); }
  };

  const claimAll = async () => {
    try {
      const r = await api.mailClaimAll();
      if (r.claimed === 0) return addToast('수령할 우편이 없습니다', 'error');
      const parts = [];
      if (r.totalRewards?.currency) parts.push(`${currencyImg('prism')} ${r.totalRewards.currency}`);
      if (r.totalRewards?.gold) parts.push(`${currencyImg('bit')} ${r.totalRewards.gold}`);
      addToast(`${r.claimed}건 일괄 수령! ${parts.join(' ')}`, 'trade');
      load();
      onRefresh();
    } catch (e) { addToast(e.message, 'error'); }
  };

  const cleanup = async () => {
    try {
      const r = await api.mailCleanup();
      addToast(`${r.deleted}건 정리 완료`, 'trade');
      load();
    } catch {}
  };

  const markRead = async (mail) => {
    if (!mail.is_read) {
      try { await api.mailRead(mail.id); } catch {}
    }
    setSelected(mail.id === selected ? null : mail.id);
  };

  return (
    <div className="social-page">
      <div className="mailbox">
        <div className="mailbox-header">
          <h3>우편함</h3>
          <div className="mailbox-actions">
            <button className="btn-claim-all" onClick={claimAll}>일괄 수령</button>
            <button className="btn-cleanup" onClick={cleanup}>읽은 우편 정리</button>
          </div>
        </div>
        {mails.length === 0 && <p className="empty-msg">우편이 없습니다</p>}
        <div className="mail-list">
          {mails.map(m => (
            <div key={m.id} className={`mail-item ${m.is_read ? 'read' : 'unread'} ${selected === m.id ? 'open' : ''}`}>
              <div className="mail-row" onClick={() => markRead(m)}>
                {!m.is_read && <span className="mail-dot" />}
                <div className="mail-info">
                  <span className="mail-title">{m.title}</span>
                  <span className="mail-sender">{m.senderName} · {timeAgo(m.created_at)}</span>
                </div>
                {m.rewards && !m.is_claimed && <span className="mail-gift">&#127873;</span>}
                {m.is_claimed && <span className="mail-claimed">수령됨</span>}
              </div>
              {selected === m.id && (
                <div className="mail-detail">
                  {m.body && <p className="mail-body">{m.body}</p>}
                  {m.rewards && (
                    <div className="mail-rewards">
                      {m.rewards.currency && <span><CurrencyIcon type="prism" /> {m.rewards.currency}</span>}
                      {m.rewards.gold && <span><CurrencyIcon type="bit" /> {m.rewards.gold}</span>}
                      {m.rewards.items && m.rewards.items.map((it, i) => (
                        <span key={i}>{it.name || it.itemId} x{it.count}</span>
                      ))}
                    </div>
                  )}
                  {m.rewards && !m.is_claimed && (
                    <button className="btn-claim-mail" onClick={() => claim(m.id)}>수령</button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
