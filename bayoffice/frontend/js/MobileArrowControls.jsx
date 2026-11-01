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
  const povTopRef = useRef(null);
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

    const handlePovAction = (e) => {
      e.preventDefault();
      if (typeof onCenterAction === 'function') {
        onCenterAction();
      }
    };

    const povTopEl = povTopRef.current;
    if (povTopEl) {
      povTopEl.addEventListener('click', handlePovAction);
    }
    const centerEl = centerRef.current;
    if (centerEl) {
      centerEl.addEventListener('click', handlePovAction);
    }

    return () => {
      if (cleanupUp) cleanupUp();
      if (cleanupDown) cleanupDown();
      if (cleanupLeft) cleanupLeft();
      if (cleanupRight) cleanupRight();
      if (povTopEl) povTopEl.removeEventListener('click', handlePovAction);
      if (centerEl) centerEl.removeEventListener('click', handlePovAction);
    };
  }, [active, onDirectionChange, onCenterAction]);

  if (!active) return null;

  return (
    <div id="mobileArrowControls" className="mobile-arrow-controls" aria-label="Kontrol Navigasi Mobile">
      <div className="mobile-dpad-container">
        {/* Top Utility Slot: POV Switch Button */}
        <div className="mobile-dpad-top-bar">
          <button
            type="button"
            ref={povTopRef}
            id="mobileArrowPovTop"
            className="mobile-dpad-pov-btn"
            title="Ganti Sudut Pandang (POV / Reset)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
              <circle cx="12" cy="13" r="3" />
            </svg>
            <span id="mobilePovBtnLabel">FPV/TPV</span>
          </button>
        </div>

        {/* 4-Way Directional Grid */}
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
          {/* Center non-clickable hub */}
          <div className="dpad-center-hub" aria-hidden="true"></div>
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
