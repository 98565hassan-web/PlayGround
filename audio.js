/* Tiny WebAudio synth: no assets, works offline. */

const Sound = (() => {
  let ctx = null;
  let master = null;
  let muted = false;
  let lastChomp = 0;
  let chompFlip = 0;

  try {
    muted = localStorage.getItem("pacMemoryMuted") === "1";
  } catch (_) {
    muted = false;
  }

  function init() {
    if (ctx) {
      if (ctx.state === "suspended") ctx.resume().catch(() => {});
      return;
    }
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    ctx = new AudioCtx();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.32;
    master.connect(ctx.destination);
  }

  function now() {
    return ctx ? ctx.currentTime : 0;
  }

  function tone(freq, duration, options = {}) {
    if (!ctx || muted) return;
    const {
      type = "square",
      gain = 0.16,
      slide = 0,
      delay = 0,
      attack = 0.005,
    } = options;
    const t = now() + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(24, freq + slide), t + duration);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(g);
    g.connect(master);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  function chord(freqs, duration, options = {}) {
    freqs.forEach((f, i) => tone(f, duration, { ...options, delay: (options.delay || 0) + i * 0.055 }));
  }

  return {
    init,
    get muted() { return muted; },
    toggle() {
      muted = !muted;
      try { localStorage.setItem("pacMemoryMuted", muted ? "1" : "0"); } catch (_) {}
      if (master) master.gain.value = muted ? 0 : 0.32;
      if (!muted) this.ui();
      return muted;
    },
    pellet() {
      if (!ctx) return;
      const t = performance.now();
      if (t - lastChomp < 55) return;
      lastChomp = t;
      chompFlip = 1 - chompFlip;
      tone(chompFlip ? 540 : 420, 0.055, { type: "square", gain: 0.075 });
    },
    power() {
      chord([220, 330, 440], 0.14, { type: "sawtooth", gain: 0.1 });
      tone(660, 0.28, { type: "triangle", gain: 0.11, slide: -240, delay: 0.05 });
    },
    ghost() {
      tone(660, 0.1, { type: "square", gain: 0.13, slide: 500 });
      tone(1180, 0.2, { type: "triangle", gain: 0.11, slide: -520, delay: 0.09 });
    },
    death() {
      if (!ctx || muted) return;
      const notes = [520, 440, 350, 270, 210, 150, 100];
      notes.forEach((f, i) => {
        tone(f, 0.2, { type: "sawtooth", gain: 0.11, slide: -f * 0.45, delay: i * 0.13 });
      });
    },
    level() {
      chord([392, 523, 659, 784, 1047], 0.22, { type: "triangle", gain: 0.12, slide: 30 });
    },
    start() {
      chord([262, 330, 392, 523], 0.18, { type: "square", gain: 0.09 });
    },
    ui() {
      tone(680, 0.045, { type: "sine", gain: 0.07 });
    },
    shard() {
      chord([880, 1320, 1760], 0.16, { type: "sine", gain: 0.1 });
    },
    extraLife() {
      chord([523, 659, 784, 1047], 0.18, { type: "square", gain: 0.09 });
    },
  };
})();
