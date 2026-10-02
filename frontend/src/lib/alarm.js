// Web Audio API chime and mobile vibration engine
class AlarmService {
  constructor() {
    this.ctx = null;
    this.intervalId = null;
    this.timeoutId = null;
    this.isPlaying = false;
  }

  // Plays a crystal, pleasing dual-note chime (D5 -> A5 -> D6)
  playChime() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!this.ctx) this.ctx = new AudioCtx();
      if (this.ctx.state === "suspended") this.ctx.resume();

      const now = this.ctx.currentTime;
      const playTone = (freq, start, duration) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.3, start);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(start);
        osc.stop(start + duration);
      };

      playTone(587.33, now, 0.4);       // D5
      playTone(880.00, now + 0.15, 0.5); // A5
      playTone(1174.66, now + 0.3, 0.8); // D6
    } catch (err) {
      console.warn("Alarm audio chime error:", err);
    }
  }

  start() {
    this.stop();
    this.isPlaying = true;

    // Trigger immediate sound
    this.playChime();

    // Trigger phone vibration if supported
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate([300, 150, 300, 150, 400]);
      } catch (e) {
        void e;
      }
    }

    // Repeat alarm chime every 2.5 seconds
    this.intervalId = setInterval(() => {
      this.playChime();
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        try {
          navigator.vibrate([300, 150, 300]);
        } catch (e) {
          void e;
        }
      }
    }, 2500);

    // Auto-stop after 40 seconds to prevent indefinite ringing if user is away
    this.timeoutId = setTimeout(() => {
      this.stop();
    }, 40_000);
  }

  stop() {
    this.isPlaying = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(0);
      } catch (e) {
        void e;
      }
    }
  }
}

export const alarm = new AlarmService();
