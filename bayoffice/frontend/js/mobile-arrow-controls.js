/**
 * mobile-arrow-controls.js
 * Standalone Mobile D-Pad Directional Controller for BayOffice 3D & 2D views
 */

(function (window) {
  'use strict';

  function initMobileArrowControls() {
    const controls = document.getElementById('mobileArrowControls');
    if (!controls) return;

    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobileArrowControls);
  } else {
    initMobileArrowControls();
  }

  window.initMobileArrowControls = initMobileArrowControls;
})(typeof window !== 'undefined' ? window : this);
