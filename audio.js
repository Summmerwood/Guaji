(function(root){
class FrogAudio{
 constructor(factory){this.factory=factory;this.ctx=null;this.voice=null;this.sample=null;this.buffers=[];}
 init(){if(!this.ctx)this.ctx=this.factory();if(this.ctx.resume){const p=this.ctx.resume();if(p&&p.catch)p.catch(()=>{});}return this.ctx;}
 buffer(color){if(this.buffers[color])return this.buffers[color];const c=this.ctx,sr=c.sampleRate||44100,length=Math.round(sr/130.8128)*64,b=c.createBuffer(1,length,sr),d=b.getChannelData(0),period=length/64;
 for(let i=0;i<length;i++){const p=2*Math.PI*i/period;d[i]=.52*Math.sin(p)+.23*Math.sin(2*p)+.14*Math.sin((3+color%3)*p)+.06*Math.sin(7*p);}this.buffers[color]=b;return b;}
 start(freq,color){this.stop();const c=this.init(),s=c.createBufferSource(),g=c.createGain();s.buffer=this.sample||this.buffer(color);s.loop=true;s.connect(g);g.connect(c.destination);g.gain.value=.0001;s.start();this.voice={s,g,base:this.sample?261.6256:(c.sampleRate||44100)/(s.buffer.length/64)};this.pitch(freq,0);g.gain.linearRampToValueAtTime(.16,c.currentTime+.025);}
 pitch(freq,cents){if(!this.voice)return;this.voice.s.playbackRate.value=freq/this.voice.base*Math.pow(2,cents/1200);}
 stop(){if(!this.voice)return;const {s,g}=this.voice,c=this.ctx;this.voice=null;g.gain.cancelScheduledValues(c.currentTime);g.gain.setValueAtTime(g.gain.value,c.currentTime);g.gain.linearRampToValueAtTime(0,c.currentTime+.04);s.stop(c.currentTime+.05);setTimeout(()=>{s.disconnect();g.disconnect();},100);}
 async import(data){const c=this.init();const b=await new Promise((resolve,reject)=>{const p=c.decodeAudioData(data,resolve,reject);if(p&&p.then)p.then(resolve,reject);});if(b.duration>.03&&b.duration<=10){this.stop();this.sample=b;}else throw new Error('请选择 0.03–10 秒的单音素材');}
}
if(typeof module!=='undefined')module.exports=FrogAudio;else root.FrogAudio=FrogAudio;
})(typeof globalThis!=='undefined'?globalThis:this);
