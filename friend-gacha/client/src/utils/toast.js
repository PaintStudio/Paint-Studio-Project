let nextId = 0;

export function addToast(message, type = 'info') {
  const root = document.getElementById('game-root');
  if (!root) return;

  const el = document.createElement('div');
  el.className = `gnotify gnotify-${type}`;
  el.innerHTML = message;
  el.id = `gnotify-${++nextId}`;

  root.appendChild(el);

  requestAnimationFrame(() => el.classList.add('gnotify-show'));

  setTimeout(() => {
    el.classList.add('gnotify-out');
    el.addEventListener('animationend', () => el.remove(), { once: true });
  }, 2200);
}
