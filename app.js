(function(root){
function boot(env){
const wx=env.wx,C=env.Core,Audio=env.FrogAudio,isWX=!!wx;
const canvas=isWX?wx.createCanvas():document.querySelector('canvas'),ctx=canvas.getContext('2d');
const info=isWX?wx.getWindowInfo():null;
let W=isWX?info.windowWidth:Math.min(innerWidth,520),H=isWX?info.windowHeight:innerHeight,dpr=isWX?info.pixelRatio:devicePixelRatio;
const audio=new Audio(()=>isWX?wx.createWebAudioContext():new (window.AudioContext||window.webkitAudioContext)());
const band=new env.BandSession(audio,C);
const frogAtlas=isWX?wx.createImage():new Image();
let frogsReady=false;
frogAtlas.onload=()=>{frogsReady=true;};
frogAtlas.onerror=()=>{toast('青蛙图像加载失败，请刷新重试');};
frogAtlas.src='assets/frogs-atlas.png';
const colors=['#94b967','#bdd378','#7eb898','#d2c076','#83b6bb','#baa8ce','#dfac87'];
const names=['呱队长','小豆','阿低','泡泡','咕咕'],sol=['do','re','mi','fa','sol','la','si'];
let octave=4,key=-1,originY=0,bend=0,pointer=null,challenge=false,started=0,score=0,total=0,last=0,message='今天的池塘，也要有点动静。',messageUntil=0;
const clock=()=>Date.now()/1000;
function size(){canvas.width=W*dpr;canvas.height=H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);}
size();
function layout(){
const top=isWX?Math.max(80,(wx.getMenuButtonBoundingClientRect?.().bottom||48)+12):56;
const kh=Math.min(110,H*.14),ky=H-kh-93,row=H<700?30:34,trackH=40+5*row;
return {top,trackH,row,trackY:top+34,left:94,right:W-130,recX:W-120,delX:W-70,ky,kh,octY:H-68};
}
function toast(s){message=s;messageUntil=clock()+4;}
function round(x,y,w,h,r,fill,stroke){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke();}}
function text(s,x,y,size=12,color='#29493c',align='left',weight='normal'){ctx.fillStyle=color;ctx.font=weight+' '+size+'px sans-serif';ctx.textAlign=align;ctx.fillText(s,x,y);}
function ellipse(x,y,rx,ry,fill){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();}
function endNote(){band.endNote();key=-1;bend=0;}
function note(k,y){
if(k!==key){endNote();band.note(k,octave);key=k;}
bend=C.clamp((originY-y)*3,-180,180);band.pitch(key,octave,bend);
}
function stop(){endNote();band.stop();challenge=false;pointer=null;}
function recordTrack(i){
endNote();challenge=false;pointer=null;
const active=band.record(i);octave=band.octave;
toast(active?names[i]+'录制中 · 其他声部伴唱':names[i]+'已保存');
}
function importSample(){stop();if(!isWX){document.querySelector('#sample').click();return;}if(!wx.chooseMessageFile){toast('此微信版本暂不支持选取音频');return;}wx.chooseMessageFile({count:1,type:'file',success:r=>{const f=r.tempFiles[0];if(f.size>10*1024*1024){toast('素材请小于 10 MB');return;}wx.getFileSystemManager().readFile({filePath:f.path,success:async r=>{try{await audio.import(r.data);toast('原声已载入 · 基准音 C4');}catch(e){toast('音频无法读取，请使用短 WAV / MP3');}},fail:()=>toast('文件读取失败')});},fail:()=>toast('未选择素材')});}
function selectFrog(i){
endNote();band.select(i);octave=band.octave;
toast(names[i]+' · C+'+octave);
}
function frogPositions(l){
const top=l.top+l.trackH+48,height=Math.max(25,l.ky-29-top);
const scale=Math.min(1.15,(height-26)/105,W/430);
return names.map((_,i)=>({x:W*(i+.5)/5,y:top+height*.38,s:scale}));
}
function down(x,y,id){
if(pointer!==null)return;
const l=layout();
try {
if(y>=l.ky&&y<l.ky+l.kh){
if(band.playing){band.stop();endNote();}
pointer=id;originY=y;note(C.keyAt(x,16,W-32),y);return;
}
if(y>=l.octY&&y<l.octY+35){selectFrog(C.clamp(Math.floor((x-16)/((W-32)/5)),0,4));return;}
const hit=frogPositions(l).findIndex(p=>Math.abs(x-p.x)<W/10&&y>=p.y-38*p.s&&y<=p.y+78*p.s);
if(hit>=0){selectFrog(hit);return;}
if(y>=l.trackY&&y<l.trackY+5*l.row&&x>=20&&x<W-20){
const i=Math.floor((y-l.trackY)/l.row);
if(x>=l.delX){
const wasRecording=band.recording===i;
band.clear(i);if(wasRecording){key=-1;bend=0;pointer=null;}
toast(names[i]+'声部已删除');
}else if(x>=l.recX){recordTrack(i);}
else if(x<l.left){
selectFrog(i);
}
return;
}
if(y>=l.top+l.trackH+8&&y<l.top+l.trackH+40&&x>=16&&x<W-16){
const b=Math.floor((x-16)/((W-32)/4));
if(b===0){stop();toast('已停止 · 五个声部保留');}
if(b===1){
endNote();challenge=false;const was=band.playing;
const active=band.play();toast(active?'五个声部，一起开唱！':was?'合唱已停止':'先给一只青蛙录一段吧');
}
if(b===2){stop();challenge=true;score=total=0;band.select(1);octave=4;started=clock()+2;toast('两秒后开始：跟着音轨弹小星星');}
if(b===3)importSample();
}
}catch(e){stop();toast('音频启动失败，请检查设备声音后重试');}
}
function move(x,y,id){if(pointer===id)note(C.keyAt(x,16,W-32),y);}
function up(id){if(pointer===id){endNote();pointer=null;}}
if(isWX){wx.onTouchStart(e=>{const t=e.changedTouches[0];down(t.clientX,t.clientY,t.identifier);});wx.onTouchMove(e=>{for(const t of e.changedTouches)move(t.clientX,t.clientY,t.identifier);});wx.onTouchEnd(e=>{for(const t of e.changedTouches)up(t.identifier);});wx.onTouchCancel(()=>{endNote();pointer=null;});wx.onHide(stop);wx.onWindowResize(e=>{stop();W=e.windowWidth;H=e.windowHeight;size();});}
else{canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);const r=canvas.getBoundingClientRect();down(e.clientX-r.left,e.clientY-r.top,e.pointerId);});canvas.addEventListener('pointermove',e=>{const r=canvas.getBoundingClientRect();move(e.clientX-r.left,e.clientY-r.top,e.pointerId);});for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,e=>up(e.pointerId));window.addEventListener('blur',stop);document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});window.addEventListener('resize',()=>{stop();W=Math.min(innerWidth,520);H=innerHeight;size();});document.querySelector('#sample').addEventListener('change',async e=>{const f=e.target.files[0];if(!f)return;try{if(f.size>10*1024*1024)throw Error('请选择小于 10 MB 的素材');await audio.import(await f.arrayBuffer());toast('原声已载入 · 基准音 C4');}catch(err){toast(err.message||'音频无法读取');}e.target.value='';});}
function frog(i,x,y,s,t){
const active=(key>=0&&band.selected===i)||!!band.eventAt(i);
const bob=active?Math.sin(t*22)*2:Math.sin(t*2+i);
const width=78*s,height=width*(frogAtlas.height/2)/(frogAtlas.width/7);
if(frogsReady){
const cellW=frogAtlas.width/7,cellH=frogAtlas.height/2;
ctx.drawImage(frogAtlas,i*cellW,active?cellH:0,cellW,cellH,x-width/2,y-38*s+bob,width,height);
}else{ellipse(x,y,24*s,20*s,colors[i]);}
if(active)text('♪',x+35*s,y-22*s,16,'#567245');
if(band.selected===i)round(x-37*s,y-33*s,74*s,96*s,12,null,'#86a75b');
text(names[i]+' C+'+(i+3),x,y+76*s,10,band.selected===i?'#29493c':'#778466','center',band.selected===i?'bold':'normal');
}
function frame(){const now=clock(),dt=Math.min(now-last,.05);last=now;const l=layout(),elapsed=now-started;
const finished=band.tick();
if(finished){key=-1;bend=0;pointer=null;toast(finished==='recorded'?'30 秒声部已保存':'演出完毕，池塘掌声响起来！');}
if(challenge&&elapsed>=0){const target=C.melody.find(n=>elapsed>=n.start&&elapsed<n.start+n.duration);if(target){total+=dt;if(C.judge(key,octave,elapsed)&&Math.abs(bend)<70)score+=dt;}if(elapsed>9.2){const result=Math.round(score/Math.max(total,.01)*100);stop();toast('合唱完成 · '+result+' 分 · '+(result>75?'池塘天团出道！':'跑调也是一种风格！'));}}
ctx.fillStyle='#f1f1df';ctx.fillRect(0,0,W,H);text('呱唧',20,isWX?l.top-20:34,28,'#29493c','left','bold');text('GUAJI / POND SESSIONS',88,isWX?l.top-21:31,9,'#75836a');round(W-88,isWX?l.top-41:15,70,25,12,'#dce5bb');text('● 排练中',W-53,isWX?l.top-24:32,10,'#536a3f','center');
round(16,l.top,W-32,l.trackH,16,'#263f37');
text(challenge?'小星星 / 跟唱挑战':'池塘五重唱',28,l.top+22,12,'#e7edd6');
const recorded=band.tracks.filter(t=>t.some(e=>e.duration>0)).length;
text(band.recording>=0?'录制 '+band.elapsed.toFixed(1)+' / 30s':band.playing?'合唱 '+band.elapsed.toFixed(1)+'s':recorded+'/5 声部 · 点青蛙选音区',W-28,l.top+22,9,'#afbea4','right');
const {trackY,row,left,right}=l,playX=left+8;
for(let i=0;i<5;i++){
const y=trackY+i*row;
if(i===band.selected)round(23,y,W-46,row-2,6,'#354f42');
text(names[i]+' C+'+(i+3),26,y+row*.64,9,colors[i]);
ctx.strokeStyle='#39544a';ctx.beginPath();ctx.moveTo(left,y+row-1);ctx.lineTo(right,y+row-1);ctx.stroke();
const rec=band.recording===i,has=band.tracks[i].some(e=>e.duration>0);
round(l.recX,y+1,46,row-3,6,rec?'#e6ab91':'#52634d');
text(rec?'■ 停止':has?'● 重录':'● 录制',l.recX+23,y+row*.64,10,rec?'#293e2f':'#eef0d9','center');
round(l.delX,y+1,46,row-3,6,'#3d4d41');
text('删除',l.delX+23,y+row*.64,10,has||rec?'#edc5b5':'#849480','center');
}
for(let x=left;x<right;x+=24){ctx.strokeStyle='#3c5548';ctx.beginPath();ctx.moveTo(x,trackY);ctx.lineTo(x,trackY+5*row);ctx.stroke();}
const view=challenge?C.melody.map(n=>({...n,track:band.selected})):band.tracks.flatMap((t,i)=>t.map(n=>({...n,track:i,live:n===band.current})));
const transport=challenge?elapsed:band.running?band.elapsed:0,tempo=24;
ctx.save();ctx.beginPath();ctx.rect(left,trackY,right-left,5*row);ctx.clip();
for(const n of view){
const x=playX+(n.start-transport)*tempo,duration=n.live?band.elapsed-n.start:n.duration;
const width=Math.max(5,duration*tempo),y=trackY+n.track*row+5;
round(x,y,width,row-10,3,colors[n.track]);
if(width>12)text(String(n.key+1),x+4,y+(row-10)*.7,9,'#29473c');
}
ctx.restore();ctx.strokeStyle='#e9c582';ctx.beginPath();ctx.moveTo(playX,trackY-2);ctx.lineTo(playX,trackY+5*row);ctx.stroke();
const labels=['■ 停止',band.playing?'■ 停合唱':'▷ 合唱',challenge?'♪ 挑战中':'☆ 跟唱','＋ 原声'];
for(let i=0;i<4;i++){const bw=(W-32)/4;round(16+i*bw,l.top+l.trackH+8,bw-5,32,9,i===1&&band.playing?'#c4d395':'#e4e7cf');text(labels[i],16+i*bw+(bw-5)/2,l.top+l.trackH+29,11,'#3c5542','center');}
frogPositions(l).forEach((p,i)=>frog(i,p.x,p.y,p.s,now));
text(now<messageUntil?message:(key>=0?names[band.selected]+'：'+sol[key]+' ～  '+Math.round(bend)+' cents':'当前 '+names[band.selected]+' · 长按滑奏 / 上下颤音'),W/2,l.ky-13,11,'#63744f','center');
const kw=(W-32)/7;for(let i=0;i<7;i++){const active=key===i;round(16+i*kw,l.ky,kw-3,l.kh,10,active?colors[i]:'#fffdf0','#d5dac2');round(16+i*kw,l.ky,kw-3,5,2,colors[i]);text(String(i+1),16+i*kw+(kw-3)/2,l.ky+l.kh*.47,22,active?'#253e30':'#425b42','center','bold');text(sol[i],16+i*kw+(kw-3)/2,l.ky+l.kh*.74,11,'#748165','center');}
text('音区',19,l.octY-8,9,'#778466');text('C4 = 中央 C',W-20,l.octY-8,9,'#778466','right');const ow=(W-32)/5;for(let i=0;i<5;i++){const register=i+3;round(16+i*ow,l.octY,ow-3,31,6,octave===register?'#344e3c':'#e1e5ce');text('C+'+register,16+i*ow+(ow-3)/2,l.octY+20,11,octave===register?'#f5f4dd':'#778466','center');}text('不必完美，呱得开心。',W/2,H-13,9,'#899478','center');
(isWX?requestAnimationFrame:window.requestAnimationFrame)(frame);}
frame();
}
if(typeof module!=='undefined')module.exports=boot;else boot({Core:root.GuajiCore,FrogAudio:root.FrogAudio,BandSession:root.BandSession});
})(typeof globalThis!=='undefined'?globalThis:this);


