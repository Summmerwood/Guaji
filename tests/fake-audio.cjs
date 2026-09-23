function param() {
  return {value: 0, events: [], setValueAtTime(value, time) { this.value=value; this.events.push({kind:'set',value,time}); }, linearRampToValueAtTime(value,time) { this.events.push({kind:'ramp',value,time}); }, cancelScheduledValues(time) { this.events=this.events.filter(e=>e.time<time); }};
}
function context() {
  const c={sources:[],gains:[],sampleRate:44100,currentTime:0,destination:{},resume(){},
    createBuffer(channels,length,sampleRate){return {length,sampleRate,getChannelData:()=>new Float32Array(length)};},
    createGain(){const g={gain:param(),connect(){},disconnect(){g.disconnected=true;}};c.gains.push(g);return g;},
    createBufferSource(){const s={playbackRate:param(),stops:[],connect(){},disconnect(){s.disconnected=true;},start(time){s.startTime=time;},stop(time){s.stops.push(time);}};c.sources.push(s);return s;}
  };
  return c;
}
module.exports={context};
