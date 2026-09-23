(function(root) {
class FrogAudio {
  constructor(factory) {
    this.factory = factory;
    this.ctx = null;
    this.voice = null;
    this.sample = null;
    this.buffers = [];
    this.scheduled = Array.from({length: 7}, () => new Set());
    // Leave mix headroom for seven parts and their release tails.
    this.level = 0.08;
  }
  init() {
    if (!this.ctx) this.ctx = this.factory();
    if (this.ctx.resume) {
      const p = this.ctx.resume();
      if (p && p.catch) p.catch(() => {});
    }
    return this.ctx;
  }
  buffer(color) {
    if (this.buffers[color]) return this.buffers[color];
    const c = this.ctx, sr = c.sampleRate || 44100;
    const length = Math.round(sr / 130.8128) * 64;
    const b = c.createBuffer(1, length, sr), d = b.getChannelData(0), period = length / 64;
    for (let i = 0; i < length; i++) {
      const p = 2 * Math.PI * i / period;
      d[i] = .52 * Math.sin(p) + .23 * Math.sin(2*p) + .14 * Math.sin((3+color%3)*p) + .06 * Math.sin(7*p);
    }
    this.buffers[color] = b;
    return b;
  }
  makeVoice(color) {
    const c = this.ctx, s = c.createBufferSource(), g = c.createGain();
    s.buffer = this.sample || this.buffer(color);
    s.loop = true;
    s.connect(g);
    g.connect(c.destination);
    return {s, g, base: this.sample ? 261.6256 : (c.sampleRate || 44100)/(s.buffer.length/64)};
  }
  start(freq, color) {
    this.stop();
    const c = this.init(), v = this.makeVoice(color);
    this.voice = v;
    v.s.onended = () => { v.s.disconnect(); v.g.disconnect(); };
    v.g.gain.setValueAtTime(0, c.currentTime);
    this.pitch(freq, 0);
    v.s.start(c.currentTime);
    v.g.gain.linearRampToValueAtTime(this.level, c.currentTime + .015);
  }
  pitch(freq, cents) {
    if (this.voice) this.voice.s.playbackRate.value = freq / this.voice.base * Math.pow(2, cents/1200);
  }
  stop() {
    if (!this.voice) return;
    const v = this.voice, c = this.ctx;
    this.voice = null;
    v.g.gain.cancelScheduledValues(c.currentTime);
    v.g.gain.setValueAtTime(v.g.gain.value, c.currentTime);
    v.g.gain.linearRampToValueAtTime(0, c.currentTime + .025);
    v.s.stop(c.currentTime + .03);
  }
  schedule(track, event, frequency, epoch) {
    if (event.duration <= 0) return;
    const v = this.makeVoice(track), at = epoch + event.start, end = at + event.duration;
    const rate = frequency / v.base;
    v.s.playbackRate.setValueAtTime(rate, at);
    for (const b of event.bends || []) {
      if (b.at >= 0 && b.at < event.duration) v.s.playbackRate.setValueAtTime(rate * Math.pow(2, b.value/1200), at + b.at);
    }
    v.g.gain.setValueAtTime(0, at);
    v.g.gain.linearRampToValueAtTime(this.level, at + Math.min(.015, event.duration/2));
    v.g.gain.setValueAtTime(this.level, end);
    v.g.gain.linearRampToValueAtTime(0, end + .025);
    this.scheduled[track].add(v);
    v.s.onended = () => {
      this.scheduled[track].delete(v);
      v.s.disconnect();
      v.g.disconnect();
    };
    v.s.start(at);
    v.s.stop(end + .03);
  }
  stopTrack(track) {
    if (!this.ctx) return;
    for (const v of this.scheduled[track]) {
      // Cancel both sounding notes and notes queued for later in the song.
      v.g.gain.cancelScheduledValues(this.ctx.currentTime);
      v.g.gain.setValueAtTime(0, this.ctx.currentTime);
      v.s.stop(this.ctx.currentTime);
      v.s.disconnect();
      v.g.disconnect();
    }
    this.scheduled[track].clear();
  }
  stopAll() {
    this.stop();
    for (let i = 0; i < 7; i++) this.stopTrack(i);
  }
  async import(data) {
    const c = this.init();
    const b = await new Promise((resolve, reject) => {
      const p = c.decodeAudioData(data, resolve, reject);
      if (p && p.then) p.then(resolve, reject);
    });
    if (b.duration > .03 && b.duration <= 10) { this.stopAll(); this.sample = b; }
    else throw new Error('请选择 0.03–10 秒的单音素材');
  }
}
if (typeof module !== 'undefined') module.exports = FrogAudio;
else root.FrogAudio = FrogAudio;
})(typeof globalThis !== 'undefined' ? globalThis : this);
