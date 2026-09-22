import { useCallback, useEffect, useRef } from 'react';

/**
 * Plays a loud, attention-grabbing three-note "ding-ding-dong" alert,
 * synthesized with the Web Audio API — no external audio file to fetch, so
 * it can never fail to load and stays reliable no matter how many admins
 * have the tracker open.
 *
 * A dynamics compressor sits between the notes and the output so gain can be
 * pushed high (loud enough to notice over waiting-room chatter) without the
 * oscillators clipping into harsh distortion.
 *
 * A freshly created AudioContext starts 'suspended' until a user gesture
 * unlocks it, so we resume it on the first click/keypress anywhere on the
 * page — by the time a real 'Gọi PV' event arrives, it's already unlocked.
 */
export default function useInterviewCallChime() {
  const audioCtxRef = useRef(null);
  const outputRef = useRef(null);

  const getContext = useCallback(() => {
    if (!audioCtxRef.current) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      const ctx = new Ctx();
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-14, ctx.currentTime);
      compressor.knee.setValueAtTime(12, ctx.currentTime);
      compressor.ratio.setValueAtTime(8, ctx.currentTime);
      compressor.attack.setValueAtTime(0.003, ctx.currentTime);
      compressor.release.setValueAtTime(0.15, ctx.currentTime);
      compressor.connect(ctx.destination);
      audioCtxRef.current = ctx;
      outputRef.current = compressor;
    }
    return audioCtxRef.current;
  }, []);

  useEffect(() => {
    const unlock = () => {
      const ctx = getContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
    };
    document.addEventListener('click', unlock);
    document.addEventListener('keydown', unlock);
    return () => {
      document.removeEventListener('click', unlock);
      document.removeEventListener('keydown', unlock);
    };
  }, [getContext]);

  return useCallback(() => {
    const ctx = getContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const now = ctx.currentTime;
    const destination = outputRef.current || ctx.destination;
    // Three-note "ding-ding-dong" — louder and more insistent than a plain
    // two-note chime, closer to a real call-bell than a soft notification.
    [
      { freq: 987.77, start: 0, dur: 0.22 }, // B5
      { freq: 987.77, start: 0.26, dur: 0.22 }, // B5
      { freq: 783.99, start: 0.52, dur: 0.5 }, // G5, held
    ].forEach(({ freq, start, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now + start);
      gain.gain.linearRampToValueAtTime(0.9, now + start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur);
      osc.connect(gain);
      gain.connect(destination);
      osc.start(now + start);
      osc.stop(now + start + dur + 0.02);
    });
  }, [getContext]);
}
