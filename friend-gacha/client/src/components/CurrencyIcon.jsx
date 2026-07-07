import React from 'react';
import './CurrencyIcon.css';

const ICONS = {
  prism:   '/uploads/icons/prism.png',
  bit:     '/uploads/icons/bit.png',
  stamina: '/uploads/icons/stamina.png',
};

export default function CurrencyIcon({ type, size, className = '' }) {
  const src = ICONS[type];
  if (!src) return null;
  const style = size ? { width: size, height: size } : undefined;
  return <img src={src} alt={type} className={`currency-icon ${type} ${className}`} style={style} draggable={false} />;
}

export function currencyImg(type, size) {
  const src = ICONS[type];
  if (!src) return '';
  const s = size ? ` width="${size}" height="${size}"` : '';
  return `<img src="${src}" alt="${type}" class="currency-icon ${type}"${s} draggable="false" />`;
}
