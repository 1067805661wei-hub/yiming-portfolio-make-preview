import { useEffect } from 'react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export const reducedMotion = () => {
  const choice = document.documentElement.dataset.motion;
  if (choice === 'full') return false;
  if (choice === 'reduced') return true;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

export function scrollToY(top, immediate = false) {
  if (window.__portfolioScrollTo) window.__portfolioScrollTo(top, immediate);
  else window.scrollTo({ top, behavior: immediate || reducedMotion() ? 'instant' : 'smooth' });
}

export function scrollToElement(element, immediate = false) {
  if (!element) return;
  scrollToY(element.getBoundingClientRect().top + window.scrollY, immediate);
}

// Native document scrolling stays intact. Only a fine-pointer wheel is damped;
// touch, scrollbars, keyboard focus and reduced-motion retain native behavior.
export function useSmoothWheel(enabled, route) {
  useEffect(() => {
    if (!enabled || reducedMotion() || !matchMedia('(min-width: 801px) and (pointer: fine)').matches) return;
    let current = window.scrollY, target = current, frame = 0, previous = 0, loopIntent = false;
    const limit = () => Math.max(0, document.documentElement.scrollHeight - innerHeight);
    const clamp = value => Math.max(0, Math.min(limit(), value));
    const write = value => { current = value; window.scrollTo(0, value); ScrollTrigger.update(); };
    const tick = time => {
      const elapsed = previous ? Math.min(40, time - previous) : 16.7;
      previous = time;
      target = clamp(target);
      current += (target - current) * (1 - Math.exp(-elapsed / 105));
      if (Math.abs(target - current) < .35) current = target;
      const anchor = route === '/' ? document.querySelector('[data-home-loop]') : null;
      if (anchor && loopIntent) {
        const boundary = anchor.getBoundingClientRect().top + window.scrollY;
        if (current >= boundary - .5 && target >= boundary - .5) {
          current = 0; target = 0; loopIntent = false;
        }
      }
      write(current);
      if (Math.abs(target - current) > .1) frame = requestAnimationFrame(tick);
      else { frame = 0; previous = 0; }
    };
    const start = () => { if (!frame) frame = requestAnimationFrame(tick); };
    const wheel = event => {
      if (event.ctrlKey || event.defaultPrevented || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      if (event.target.closest?.('.project-layer,.lightbox,.menu-panel,input,textarea,select,video')) return;
      if (getComputedStyle(document.body).overflow === 'hidden') return;
      event.preventDefault();
      const delta = event.deltaY * (event.deltaMode === 1 ? 18 : event.deltaMode === 2 ? innerHeight : 1);
      target = clamp(target + Math.max(-420, Math.min(420, delta * .78)));
      loopIntent = delta > 0;
      start();
    };
    const nativeScroll = () => {
      if (Math.abs(window.scrollY - current) > 3) {
        current = window.scrollY; target = current; loopIntent = false;
      }
    };
    const move = (top, immediate = false) => {
      loopIntent = false; target = clamp(top);
      if (immediate) { cancelAnimationFrame(frame); frame = 0; previous = 0; write(target); }
      else start();
    };
    window.__portfolioScrollTo = move;
    window.addEventListener('wheel', wheel, { passive: false });
    window.addEventListener('scroll', nativeScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('wheel', wheel);
      window.removeEventListener('scroll', nativeScroll);
      if (window.__portfolioScrollTo === move) delete window.__portfolioScrollTo;
    };
  }, [enabled, route]);
}
