const test=require('node:test'),assert=require('node:assert/strict');
const Core=require('../core'),Audio=require('../audio'),Session=require('../session');
const {context}=require('./fake-audio.cjs');
function setup(){const c=context(),audio=new Audio(()=>c),band=new Session(audio,Core);return {c,audio,band};}
function record(c,band,track,key=0,length=1){band.record(track);c.currentTime+=.1;band.note(key,4);c.currentTime+=length;band.endNote();band.stop();}

test('seven recordings are independent; every frog can sing different pitches',()=>{
  const {c,band}=setup();
  for(let i=0;i<7;i++)record(c,band,i,(i+2)%7);
  assert.deepEqual(band.tracks.map(t=>t.length),[1,1,1,1,1,1,1]);
  assert.deepEqual(band.tracks.map(t=>t[0].key),[2,3,4,5,6,0,1]);
  const others=JSON.stringify(band.tracks.slice(1));
  record(c,band,0,6);
  assert.equal(JSON.stringify(band.tracks.slice(1)),others);
  assert.equal(band.tracks[0].length,1);
  assert.equal(band.tracks[0][0].key,6);
});
test('all seven voices queue against one epoch; deleting a part cancels only its current and future notes',()=>{
  const {c,audio,band}=setup();
  band.tracks.forEach(t=>t.push({key:0,octave:4,start:0,duration:1,bends:[]},{key:2,octave:4,start:2,duration:1,bends:[]}));
  assert.equal(band.play(),true);
  const voices=audio.scheduled.map(s=>[...s]);
  assert.equal(voices.flat().length,14);
  assert.ok(voices.every(v=>v[0].s.startTime===band.epoch&&v[1].s.startTime===band.epoch+2));
  c.currentTime=band.epoch+.3;
  band.clear(3);
  assert.equal(band.tracks[3].length,0);
  assert.equal(audio.scheduled[3].size,0);
  assert.ok(voices[3].every(v=>v.s.stops.at(-1)===c.currentTime));
  assert.ok(voices[2].every(v=>v.s.stops.length===1));
  assert.equal(band.playing,true);
  assert.equal(band.eventAt(3),null);
  assert.ok(band.eventAt(2));
  c.currentTime=band.epoch+3.1;
  assert.equal(band.tick(),'played');
  assert.ok(audio.scheduled.every(s=>s.size===0));
});
test('overdubbing plays other parts while live notes and bends only affect selected recording',()=>{
  const {c,audio,band}=setup();record(c,band,0,2);
  const original=JSON.stringify(band.tracks[0]);band.record(1);
  assert.equal(audio.scheduled[0].size,1);
  c.currentTime+=.2;band.note(5,3);c.currentTime+=.3;band.pitch(5,3,120);
  c.currentTime+=.5;band.endNote();
  const e=band.tracks[1][0];assert.ok(Math.abs(e.duration-.8)<1e-9);
  assert.equal(e.bends[0].value,120);
  assert.equal(JSON.stringify(band.tracks[0]),original);
  band.clear(0);assert.equal(band.recording,1);
  band.clear(1);assert.equal(band.recording,-1);assert.equal(band.current,null);
});
test('recording toggle finalizes held note; 30-second limit clamps duration; global stop retains all tracks',()=>{
  const {c,band,audio}=setup();band.record(6);c.currentTime=29;band.note(0,4);c.currentTime=31;
  assert.equal(band.tick(),'recorded');assert.equal(band.tracks[6][0].duration,1);
  band.record(0);c.currentTime+=.2;band.note(1,4);c.currentTime+=.4;
  assert.equal(band.record(0),false);assert.equal(band.tracks[0].length,1);
  const saved=JSON.stringify(band.tracks);band.play();band.stop();
  assert.equal(JSON.stringify(band.tracks),saved);assert.equal(audio.voice,null);
  assert.ok(audio.scheduled.every(s=>!s.size));
});
test('empty playback stays idle and separate bends schedule independently',()=>{
  const {c,audio,band}=setup();assert.equal(band.play(),false);
  band.tracks[0]=[{key:0,octave:4,start:0,duration:1,bends:[{at:.2,value:1200}]}];
  band.tracks[1]=[{key:0,octave:4,start:0,duration:1,bends:[]}];
  band.play();const a=[...audio.scheduled[0]][0],b=[...audio.scheduled[1]][0];
  const events=a.s.playbackRate.events;
  assert.equal(events[1].value,events[0].value*2);
  assert.equal(events[1].time,band.epoch+.2);assert.equal(b.s.playbackRate.events.length,1);
  assert.equal(band.play(),false);assert.equal(band.playing,false);
});
