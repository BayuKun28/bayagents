/**
 * MobileArrowControls.jsx
 * Responsive Virtual D-Pad / Directional Arrow Controls component
 * Designed specifically for touchscreens and mobile viewports (<= 768px).
 *
 * Provides bidirectional movement & camera control:
 * - Up (Forward / Pan North)
 * - Down (Backward / Pan South)
 * - Left (Strafe / Turn Left / Pan West)
 * - Right (Strafe / Turn Right / Pan East)
 * - Center (Toggle POV / Reset Camera)
 */

import React, { useEffect, useRef } from 'react';

export function MobileArrowControls({
  onDirectionChange,
  onCenterAction,
  active = true
}) {
  const upRef = useRef(null);
  const downRef = useRef(null);
  const leftRef = useRef(null);
  const rightRef = useRef(null);
  const centerRef = useRef(null);

  useEffect(() => {
    if (!active) return;

    const bindButton = (el, dir) => {
      if (!el) return;

      const handleStart = (e) => {
        e.preventDefault();
        el.classList.add('active');
        if (typeof onDirectionChange === 'function') {
          onDirectionChange(dir, true);
        }
      };

      const handleEnd = (e) => {
        if (e) e.preventDefault();
        el.classList.remove('active');
        if (typeof onDirectionChange === 'function') {
          onDirectionChange(dir, false);
        }
      };

      el.addEventListener('pointerdown', handleStart);
      el.addEventListener('pointerup', handleEnd);
      el.addEventListener('pointercancel', handleEnd);
      el.addEventListener('pointerleave', handleEnd);

      el.addEventListener('touchstart', handleStart, { passive: false });
      el.addEventListener('touchend', handleEnd, { passive: false });
      el.addEventListener('touchcancel', handleEnd, { passive: false });

      return () => {
        el.removeEventListener('pointerdown', handleStart);
        el.removeEventListener('pointerup', handleEnd);
        el.removeEventListener('pointercancel', handleEnd);
        el.removeEventListener('pointerleave', handleEnd);
        el.removeEventListener('touchstart', handleStart);
        el.removeEventListener('touchend', handleEnd);
        el.removeEventListener('touchcancel', handleEnd);
      };
    };

    const cleanupUp = bindButton(upRef.current, 'up');
    const cleanupDown = bindButton(downRef.current, 'down');
    const cleanupLeft = bindButton(leftRef.current, 'left');
    const cleanupRight = bindButton(rightRef.current, 'right');

    const handleCenter = (e) => {
      e.preventDefault();
      if (typeof onCenterAction === 'function') {
        onCenterAction();
      }
    };

    const centerEl = centerRef.current;
    if (centerEl) {
      centerEl.addEventListener('click', handleCenter);
    }

    return () => {
      if (cleanupUp) cleanupUp();
      if (cleanupDown) cleanupDown();
      if (cleanupLeft) cleanupLeft();
      if (cleanupRight) cleanupRight();
      if (centerEl) centerEl.removeEventListener('click', handleCenter);
    };
  }, [active, onDirectionChange, onCenterAction]);

  if (!active) return null;

  return (
    <div id="mobileArrowControls" className="mobile-arrow-controls" aria-label="Kontrol Navigasi Mobile">
      <div className="mobile-dpad-container">
        <button
          type="button"
          ref={upRef}
          id="mobileArrowUp"
          className="mobile-dpad-btn dpad-up"
          aria-label="Maju / Pandangan Atas"
          title="Maju (Atas)"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="18 15 12 9 6 15" />
          </svg>
        </button>
        <div className="mobile-dpad-row">
          <button
            type="button"
            ref={leftRef}
            id="mobileArrowLeft"
            className="mobile-dpad-btn dpad-left"
            aria-label="Belok Kiri"
            title="Kiri"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button
            type="button"
            ref={centerRef}
            id="mobileArrowCenter"
            className="mobile-dpad-btn dpad-center"
            aria-label="POV Switch / Reset"
            title="POV / Reset"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="22" y1="12" x2="18" y2="12" />
              <line x1="6" y1="12" x2="2" y2="12" />
              <line x1="12" y1="6" x2="12" y2="2" />
              <line x1="12" y1="22" x2="12" y2="18" />
            </svg>
          </button>
          <button
            type="button"
            ref={rightRef}
            id="mobileArrowRight"
            className="mobile-dpad-btn dpad-right"
            aria-label="Belok Kanan"
            title="Kanan"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
        <button
          type="button"
          ref={downRef}
          id="mobileArrowDown"
          className="mobile-dpad-btn dpad-down"
          aria-label="Mundur / Pandangan Bawah"
          title="Mundur (Bawah)"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default MobileArrowControls;
