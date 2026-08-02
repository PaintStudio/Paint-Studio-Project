import React, { useState, useEffect } from 'react';
import './LoadingOverlay.css';

const SD_IMAGES = [];
let sdLoaded = false;

export function setLoadingSdImages(urls) {
  SD_IMAGES.length = 0;
  SD_IMAGES.push(...urls);
  sdLoaded = true;
}

export default function LoadingOverlay() {
  const [dots, setDots] = useState(0);
  const [sdUrl] = useState(() => {
    if (SD_IMAGES.length === 0) return null;
    return SD_IMAGES[Math.floor(Math.random() * SD_IMAGES.length)];
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setDots(d => (d + 1) % 4);
    }, 500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="loading-overlay">
      <div className="loading-overlay-inner">
        {sdUrl && <img src={sdUrl} alt="" className="loading-sd-img" />}
        <span className="loading-dots-text">LOADING{'.'.repeat(dots)}</span>
      </div>
    </div>
  );
}
