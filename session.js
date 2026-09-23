(function(root) {
// A frog owns one independent part; all seven parts share one audio clock.
class BandSession {
  constructor(audio, core) {
    this.audio = audio;
    this.core = core;
    this.tracks = Array.from({length: 7}, () => []);
    this.selected = 0;
    this.recording = -1;
    this.playing = false;
    this.epoch = 0;
    this.current = null;
    this.limit = 30;
  }
  get running() { return this.recording >= 0 || this.playing; }
  get elapsed() { return this.audio.ctx ? Math.max(0, this.audio.ctx.currentTime - this.epoch) : 0; }
  get duration() { return Math.max(0, ...this.tracks.map(t => t.reduce((d, e) => Math.max(d, e.start + e.duration), 0))); }
  endNote() {
    this.audio.stop();
    if (this.current) {
      this.current.duration = Math.max(0, Math.min(this.limit, this.elapsed) - this.current.start);
      this.current = null;
    }
  }
  stop() {
    this.endNote();
    this.audio.stopAll();
    this.recording = -1;
    this.playing = false;
  }
  scheduleOthers(exclude) {
    this.tracks.forEach((events, track) => {
      if (track !== exclude) for (const e of events) this.audio.schedule(track, e, this.core.frequency(e.key, e.octave), this.epoch);
    });
  }
  record(track) {
    const finish = this.recording === track;
    this.stop();
    this.selected = track;
    if (finish) return false;
    const c = this.audio.init();
    this.tracks[track] = [];
    this.recording = track;
    this.epoch = c.currentTime;
    this.scheduleOthers(track);
    return true;
  }
  play() {
    const finish = this.playing;
    this.stop();
    if (finish || !this.duration) return false;
    const c = this.audio.init();
    this.epoch = c.currentTime + .06;
    this.playing = true;
    this.scheduleOthers(-1);
    return true;
  }
  clear(track) {
    if (this.recording === track) this.stop();
    else this.audio.stopTrack(track);
    this.tracks[track] = [];
  }
  note(key, octave) {
    this.endNote();
    if (this.recording >= 0 && this.elapsed >= this.limit) { this.stop(); return; }
    this.audio.start(this.core.frequency(key, octave), this.selected);
    if (this.recording >= 0) {
      this.current = {key, octave, start: this.elapsed, duration: 0, bends: []};
      this.tracks[this.recording].push(this.current);
    }
  }
  pitch(key, octave, cents) {
    this.audio.pitch(this.core.frequency(key, octave), cents);
    if (this.current) this.current.bends.push({at: Math.max(0, this.elapsed - this.current.start), value: cents});
  }
  eventAt(track) {
    if (!this.running || track === this.recording || (this.audio.ctx && this.audio.ctx.currentTime < this.epoch)) return null;
    const t = this.elapsed;
    return this.tracks[track].find(e => t >= e.start && t < e.start + e.duration) || null;
  }
  tick() {
    if (this.recording >= 0 && this.elapsed >= this.limit) { this.stop(); return 'recorded'; }
    if (this.playing && this.elapsed >= this.duration + .04) { this.stop(); return 'played'; }
    return null;
  }
}
if (typeof module !== 'undefined') module.exports = BandSession;
else root.BandSession = BandSession;
})(typeof globalThis !== 'undefined' ? globalThis : this);
