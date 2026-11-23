// Tiny chiptune sound engine built on the Web Audio API (square + triangle waves).

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(
  freq: number,
  start: number,
  duration: number,
  type: OscillatorType = "square",
  volume = 0.06
) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + start;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(gain).connect(a.destination);
  osc.start(t);
  osc.stop(t + duration + 0.02);
}

export const sfx = {
  /** New quote: quick rising blip */
  next() {
    tone(392, 0, 0.07);
    tone(784, 0.06, 0.1);
  },
  /** Typewriter tick */
  tick() {
    tone(1200 + Math.random() * 300, 0, 0.02, "square", 0.015);
  },
  /** Favorite: classic coin */
  coin() {
    tone(988, 0, 0.08);
    tone(1319, 0.08, 0.28);
  },
  /** Copy / share confirm */
  select() {
    tone(660, 0, 0.05, "triangle", 0.09);
    tone(880, 0.05, 0.08, "triangle", 0.09);
  },
  /** Remove / error */
  bonk() {
    tone(196, 0, 0.12);
    tone(147, 0.1, 0.18);
  },
  /** Level up arpeggio */
  levelUp() {
    [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, i * 0.08, 0.12, "square", 0.07));
  },
};
