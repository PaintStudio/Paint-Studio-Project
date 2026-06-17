import { useState, useEffect } from 'react';

let listeners = [];
let toasts = [];
let nextId = 0;

export function addToast(message, type = 'info') {
  const id = ++nextId;
  toasts = [...toasts, { id, message, type }];
  notify();
  setTimeout(() => {
    toasts = toasts.filter(t => t.id !== id);
    notify();
  }, 4000);
}

function notify() {
  const snapshot = [...toasts];
  listeners.forEach(fn => fn(snapshot));
}

export function useToasts() {
  const [state, setState] = useState(toasts);
  useEffect(() => {
    listeners.push(setState);
    return () => { listeners = listeners.filter(fn => fn !== setState); };
  }, []);
  return state;
}
