/**
 * BayOffice - 8-Bit Retro Sound Effects Synthesizer (Web Audio API)
 * Design Standards: Zero Audio Assets (0 KB Transfer), Pure Synthesizer
 * Enabled by default (User preference preserved in localStorage)
 */

class SoundFX {
  constructor() {
    this.ctx = null;
    this.storageKey = 'bayoffice_sound_enabled';
    
    // Default active per user requirement: "audio langsung diaktifkan saja tapi kasih tombol untuk mematikan"
    const saved = localStorage.getItem(this.storageKey);
    this.enabled = saved !== null ? (saved === 'true') : true;
  }

  initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  isEnabled() {
    return this.enabled;
  }

  toggle() {
    this.enabled = !this.enabled;
    localStorage.setItem(this.storageKey, this.enabled ? 'true' : 'false');
    if (this.enabled) {
      this.initContext();
      this.playClick();
    }
    return this.enabled;
  }

  playTone(freq, duration = 0.08, type = 'square', gainVal = 0.06) {
    if (!this.enabled) return;
    try {
      this.initContext();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      // Audio autoplay restrictions or errors silently caught
    }
  }

  playClick() {
    this.playTone(587.33, 0.05, 'sine', 0.04); // D5 soft blip
  }

  playDoorSwing() {
    // Gentle synthesized door swing blip (280Hz -> 360Hz sine glide)
    if (!this.enabled) return;
    try {
      this.initContext();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(260, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(380, this.ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.03, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.08);
    } catch (e) {}
  }

  playDispatch() {
    if (!this.enabled) return;
    try {
      this.initContext();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      // 8-bit ascending chime (A4 -> C#5 -> E5 -> A5)
      const notes = [440, 554.37, 659.25, 880];
      notes.forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        const start = t + i * 0.05;
        const dur = 0.05;
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.05, start);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(start);
        osc.stop(start + dur);
      });
    } catch (e) {}
  }

  playSuccess() {
    if (!this.enabled) return;
    try {
      this.initContext();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      // 8-bit Victory Jingle: C5 -> E5 -> G5 -> C6
      const arpeggio = [523.25, 659.25, 783.99, 1046.50];
      arpeggio.forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        const start = t + i * 0.08;
        const dur = (i === arpeggio.length - 1) ? 0.3 : 0.08;
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.08, start);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(start);
        osc.stop(start + dur);
      });
    } catch (e) {}
  }
}

window.SoundFX = SoundFX;
