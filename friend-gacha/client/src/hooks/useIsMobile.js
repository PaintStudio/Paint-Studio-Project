import { useRef } from 'react';

const MOBILE_BREAKPOINT = 1024;

export default function useIsMobile() {
  const ref = useRef(window.innerWidth < MOBILE_BREAKPOINT);
  return ref.current;
}
