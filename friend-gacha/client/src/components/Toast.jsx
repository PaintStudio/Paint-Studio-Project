import React from 'react';
import { useToasts } from '../utils/toast';

export default function ToastContainer() {
  const toasts = useToasts();
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`} dangerouslySetInnerHTML={{ __html: t.message }} />
      ))}
    </div>
  );
}
