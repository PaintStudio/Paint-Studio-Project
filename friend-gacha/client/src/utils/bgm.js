const TRACKS = {
  title: '/bgm/title.mp3',
  lobby: '/bgm/main_theme.mp3',
  gacha: '/bgm/gacha_theme.mp3',
  battle_hub: '/bgm/battle_hub.mp3',
  battle: '/bgm/battle.mp3',
  battle_raid: '/bgm/battle_raid.mp3',
  story: '/bgm/story.mp3',
  collection: '/bgm/main_theme.mp3',
  social: '/bgm/main_theme.mp3',
  character: '/bgm/main_theme.mp3',
  inventory: '/bgm/main_theme.mp3',
};

let currentTrack = null;
let currentSrc = null;
let volume = parseFloat(localStorage.getItem('bgm_volume') ?? '0.5');
let muted = localStorage.getItem('bgm_muted') === 'true';
let unlocked = false;
const listeners = new Set();

// src별 Audio 객체 캐시 (재생 위치 보존 + blob URL 재사용)
const audioCache = {};
let activeAudio = null;

function notify() {
  const state = { currentTrack, volume, muted };
  listeners.forEach(fn => fn(state));
}

function unlock() {
  if (unlocked) return;
  unlocked = true;
  if (currentTrack) play(currentTrack);
}

async function loadAudio(src) {
  if (audioCache[src]) return audioCache[src];
  try {
    const resp = await fetch(src);
    const blob = await resp.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = new Audio(blobUrl);
    a.loop = true;
    audioCache[src] = a;
    return a;
  } catch {
    const a = new Audio(src);
    a.loop = true;
    audioCache[src] = a;
    return a;
  }
}

function play(key) {
  currentTrack = key;
  const src = TRACKS[key] || '/bgm/' + key + '.mp3';
  if (src === currentSrc && activeAudio && !activeAudio.paused) { notify(); return; }
  if (!unlocked) { notify(); return; }

  if (activeAudio) {
    activeAudio.pause();
  }

  currentSrc = src;

  loadAudio(src).then(a => {
    if (currentSrc !== src) return;
    activeAudio = a;
    a.volume = muted ? 0 : volume;
    a.play().catch(() => {});
    notify();
  });
  notify();
}

function stop() {
  if (activeAudio) {
    activeAudio.pause();
    activeAudio = null;
  }
  currentTrack = null;
  currentSrc = null;
  notify();
}

function setVolume(v) {
  volume = Math.max(0, Math.min(1, v));
  localStorage.setItem('bgm_volume', String(volume));
  if (activeAudio) activeAudio.volume = muted ? 0 : volume;
  notify();
}

function setMuted(m) {
  muted = m;
  localStorage.setItem('bgm_muted', String(muted));
  if (activeAudio) activeAudio.volume = muted ? 0 : volume;
  notify();
}

function toggleMute() {
  setMuted(!muted);
}

function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function getState() {
  return { currentTrack, volume, muted };
}

const handleInteraction = () => {
  unlock();
  window.removeEventListener('click', handleInteraction);
  window.removeEventListener('touchstart', handleInteraction);
  window.removeEventListener('keydown', handleInteraction);
};
window.addEventListener('click', handleInteraction);
window.addEventListener('touchstart', handleInteraction);
window.addEventListener('keydown', handleInteraction);

export const bgm = { play, stop, setVolume, setMuted, toggleMute, subscribe, getState, TRACKS };
