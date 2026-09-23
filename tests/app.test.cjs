const test=require('node:test'),assert=require('node:assert/strict');
const Core=require('../core'),FrogAudio=require('../audio'),BandSession=require('../session'),boot=require('../app');
const {context}=require('./fake-audio.cjs');
test('WeChat UI: seven independent record/delete controls, keyboard recording, combined playback and hide cleanup',()=>{
  const c=context(),handlers={},texts=[];let nextFrame,band;
  const draw=new Proxy({fillText(s){texts.push(s);}},{get(target,key){return target[key]||(()=>{});}});
  const wx={getWindowInfo:()=>({windowWidth:390,windowHeight:844,pixelRatio:1}),createCanvas:()=>({getContext:()=>draw}),createWebAudioContext:()=>c,
    onTouchStart(fn){handlers.start=fn;},onTouchMove(fn){handlers.move=fn;},onTouchEnd(fn){handlers.end=fn;},onTouchCancel(fn){handlers.cancel=fn;},onHide(fn){handlers.hide=fn;},onWindowResize(fn){handlers.resize=fn;}};
  class CaptureSession extends BandSession{constructor(...args){super(...args);band=this;}}
  const original=global.requestAnimationFrame;global.requestAnimationFrame=fn=>{nextFrame=fn;};
  try{
    boot({Core,FrogAudio,BandSession:CaptureSession,wx});
    assert.equal(texts.filter(t=>t==='● 录制').length,7);assert.equal(texts.filter(t=>t==='删除').length,7);
    const tap=(x,y)=>{handlers.start({changedTouches:[{clientX:x,clientY:y,identifier:1}]});handlers.end({changedTouches:[{identifier:1}]});};
    // Native layout: top 80, trackY 114, 34px per part.
    tap(290,130);assert.equal(band.recording,0);
    c.currentTime=.2;handlers.start({changedTouches:[{clientX:35,clientY:680,identifier:1}]});
    c.currentTime=.7;handlers.end({changedTouches:[{identifier:1}]});tap(290,130);
    tap(290,164);assert.equal(band.recording,1);
    c.currentTime=1;handlers.start({changedTouches:[{clientX:200,clientY:680,identifier:1}]});
    c.currentTime=1.5;handlers.end({changedTouches:[{identifier:1}]});tap(290,164);
    tap(145,380);assert.equal(band.playing,true);
    assert.equal(band.audio.scheduled[0].size,1);assert.equal(band.audio.scheduled[1].size,1);
    tap(340,130);assert.equal(band.tracks[0].length,0);assert.equal(band.tracks[1].length,1);assert.equal(band.playing,true);
    nextFrame();handlers.hide();assert.equal(band.running,false);assert.ok(band.audio.scheduled.every(s=>!s.size));
  }finally{global.requestAnimationFrame=original;}
});
