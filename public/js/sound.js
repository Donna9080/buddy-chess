// sound.js — the Phase 6 extra. A short synthesized click plays on every
// move, in every mode. Generated with the Web Audio API rather than an
// audio file, so there's nothing to source, license, or ship as an asset.

let audioContext = null;

function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
}

function playMoveSound() {
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.value = 440;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.12);
  } catch {
    // Web Audio can be blocked or unsupported — a move should never fail
    // just because the sound couldn't play.
  }
}

export { playMoveSound };
