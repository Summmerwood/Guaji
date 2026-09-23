(function(root){
function boot(env){
const wx=env.wx,C=env.Core,Audio=env.FrogAudio,isWX=!!wx;
const canvas=isWX?wx.createCanvas():document.querySelector('canvas'),ctx=canvas.getContext('2d');
const info=isWX?wx.getWindowInfo():null;
let W=isWX?info.windowWidth:Math.min(innerWidth,520),H=isWX?info.windowHeight:innerHeight,dpr=isWX?info.pixelRatio:devicePixelRatio;
const audio=new Audio(()=>isWX?wx.createWebAudioContext():new (window.AudioContext||window.webkitAudioContext)());
const band=new env.BandSession(audio,C);
const colors=['#94b967','#bdd378','#7eb898','#d2c076','#83b6bb','#baa8ce','#dfac87'];
const names=['呱队长','小豆','阿低','泡泡','咕咕','歪歪','大福'],sol=['do','re','mi','fa','sol','la','si'];
let octave=4,key=-1,originY=0,bend=0,pointer=null,challenge=false,started=0,score=0,total=0,last=0,message='今天的池塘，也要有点动静。',messageUntil=0;
const clock=()=>Date.now()/1000;
function size(){canvas.width=W*dpr;canvas.height=H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);}
size();
function layout(){
const top=isWX?Math.max(80,(wx.getMenuButtonBoundingClientRect?.().bottom||48)+12):56;
const kh=Math.min(110,H*.14),ky=H-kh-93,row=H<700?30:34,trackH=40+7*row;
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
const active=band.record(i);
toast(active?names[i]+'录制中 · 其他声部伴唱':names[i]+'已保存');
}
function importSample(){stop();if(!isWX){document.querySelector('#sample').click();return;}if(!wx.chooseMessageFile){toast('此微信版本暂不支持选取音频');return;}wx.chooseMessageFile({count:1,type:'file',success:r=>{const f=r.tempFiles[0];if(f.size>10*1024*1024){toast('素材请小于 10 MB');return;}wx.getFileSystemManager().readFile({filePath:f.path,success:async r=>{try{await audio.import(r.data);toast('原声已载入 · 基准音 C4');}catch(e){toast('音频无法读取，请使用短 WAV / MP3');}},fail:()=>toast('文件读取失败')});},fail:()=>toast('未选择素材')});}
function down(x,y,id){
if(pointer!==null)return;
const l=layout();
try {
if(y>=l.ky&&y<l.ky+l.kh){
if(band.playing){band.stop();endNote();}
pointer=id;originY=y;note(C.keyAt(x,16,W-32),y);return;
}
if(y>=l.octY&&y<l.octY+35){endNote();octave=C.clamp(Math.floor((x-16)/((W-32)/11))-2,-2,8);return;}
if(y>=l.trackY&&y<l.trackY+7*l.row&&x>=20&&x<W-20){
const i=Math.floor((y-l.trackY)/l.row);
if(x>=l.delX){
const wasRecording=band.recording===i;
band.clear(i);if(wasRecording){key=-1;bend=0;pointer=null;}
toast(names[i]+'声部已删除');
}else if(x>=l.recX){recordTrack(i);}
else if(x<l.left){
if(band.recording>=0&&band.recording!==i){toast('先停止当前录制，再选择其他声部');return;}
endNote();band.selected=i;toast('当前声部：'+names[i]);
}
return;
}
if(y>=l.top+l.trackH+8&&y<l.top+l.trackH+40&&x>=16&&x<W-16){
const b=Math.floor((x-16)/((W-32)/4));
if(b===0){stop();toast('已停止 · 七个声部保留');}
if(b===1){
endNote();challenge=false;const was=band.playing;
const active=band.play();toast(active?'七个声部，一起开唱！':was?'合唱已停止':'先给一只青蛙录一段吧');
}
if(b===2){stop();challenge=true;score=total=0;octave=4;started=clock()+2;toast('两秒后开始：跟着音轨弹小星星');}
if(b===3)importSample();
}
}catch(e){stop();toast('音频启动失败，请检查设备声音后重试');}
}
function move(x,y,id){if(pointer===id)note(C.keyAt(x,16,W-32),y);}
function up(id){if(pointer===id){endNote();pointer=null;}}
if(isWX){wx.onTouchStart(e=>{const t=e.changedTouches[0];down(t.clientX,t.clientY,t.identifier);});wx.onTouchMove(e=>{for(const t of e.changedTouches)move(t.clientX,t.clientY,t.identifier);});wx.onTouchEnd(e=>{for(const t of e.changedTouches)up(t.identifier);});wx.onTouchCancel(()=>{endNote();pointer=null;});wx.onHide(stop);wx.onWindowResize(e=>{stop();W=e.windowWidth;H=e.windowHeight;size();});}
else{canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);const r=canvas.getBoundingClientRect();down(e.clientX-r.left,e.clientY-r.top,e.pointerId);});canvas.addEventListener('pointermove',e=>{const r=canvas.getBoundingClientRect();move(e.clientX-r.left,e.clientY-r.top,e.pointerId);});for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,e=>up(e.pointerId));window.addEventListener('blur',stop);document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});window.addEventListener('resize',()=>{stop();W=Math.min(innerWidth,520);H=innerHeight;size();});document.querySelector('#sample').addEventListener('change',async e=>{const f=e.target.files[0];if(!f)return;try{if(f.size>10*1024*1024)throw Error('请选择小于 10 MB 的素材');await audio.import(await f.arrayBuffer());toast('原声已载入 · 基准音 C4');}catch(err){toast(err.message||'音频无法读取');}e.target.value='';});}
function frog(i,x,y,s,t){const active=(key>=0&&band.selected===i)||!!band.eventAt(i),bob=active?Math.sin(t*22)*3:Math.sin(t*2+i)*2;ctx.save();ctx.translate(x,y+bob);ellipse(0,23*s,30*s,7*s,'#d0d8b5');ellipse(0,3*s,27*s,29*s,colors[i]);ellipse(-15*s,-19*s,12*s,12*s,colors[i]);ellipse(15*s,-19*s,12*s,12*s,colors[i]);for(const a of [-15,15]){ellipse(a*s,-20*s,8*s,9*s,'#fffce9');ellipse((a+1)*s,-19*s,3*s,4*s,'#233d31');}ellipse(-19*s,1*s,5*s,3*s,'#e9a88b');ellipse(19*s,1*s,5*s,3*s,'#e9a88b');ellipse(0,10*s,(active?10:7)*s,(active?10+Math.sin(t*28)*3:2)*s,'#29473c');if(active){ellipse(0,16*s,5*s,3*s,'#efac97');text('♪',29*s,-24*s,21,'#567245');}if(i===0){round(-9*s,-6*s,18*s,5*s,2,'#29473c');}ctx.restore();text(names[i],x,y+44*s,10,band.selected===i?'#29493c':'#778466','center',band.selected===i?'bold':'normal');}
function frame(){const now=clock(),dt=Math.min(now-last,.05);last=now;const l=layout(),elapsed=now-started;
const finished=band.tick();
if(finished){key=-1;bend=0;pointer=null;toast(finished==='recorded'?'30 秒声部已保存':'演出完毕，池塘掌声响起来！');}
if(challenge&&elapsed>=0){const target=C.melody.find(n=>elapsed>=n.start&&elapsed<n.start+n.duration);if(target){total+=dt;if(C.judge(key,octave,elapsed)&&Math.abs(bend)<70)score+=dt;}if(elapsed>9.2){const result=Math.round(score/Math.max(total,.01)*100);stop();toast('合唱完成 · '+result+' 分 · '+(result>75?'池塘天团出道！':'跑调也是一种风格！'));}}
ctx.fillStyle='#f1f1df';ctx.fillRect(0,0,W,H);text('呱唧',20,isWX?l.top-20:34,28,'#29493c','left','bold');text('GUAJI / POND SESSIONS',88,isWX?l.top-21:31,9,'#75836a');round(W-88,isWX?l.top-41:15,70,25,12,'#dce5bb');text('● 排练中',W-53,isWX?l.top-24:32,10,'#536a3f','center');
round(16,l.top,W-32,l.trackH,16,'#263f37');
text(challenge?'小星星 / 跟唱挑战':'池塘七重唱',28,l.top+22,12,'#e7edd6');
const recorded=band.tracks.filter(t=>t.some(e=>e.duration>0)).length;
text(band.recording>=0?'录制 '+band.elapsed.toFixed(1)+' / 30s':band.playing?'合唱 '+band.elapsed.toFixed(1)+'s':recorded+'/7 声部 · 点名字选声部',W-28,l.top+22,9,'#afbea4','right');
const {trackY,row,left,right}=l,playX=left+8;
for(let i=0;i<7;i++){
const y=trackY+i*row;
if(i===band.selected)round(23,y,W-46,row-2,6,'#354f42');
text((i+1)+' '+names[i],28,y+row*.64,10,colors[i]);
ctx.strokeStyle='#39544a';ctx.beginPath();ctx.moveTo(left,y+row-1);ctx.lineTo(right,y+row-1);ctx.stroke();
const rec=band.recording===i,has=band.tracks[i].some(e=>e.duration>0);
round(l.recX,y+1,46,row-3,6,rec?'#e6ab91':'#52634d');
text(rec?'■ 停止':has?'● 重录':'● 录制',l.recX+23,y+row*.64,10,rec?'#293e2f':'#eef0d9','center');
round(l.delX,y+1,46,row-3,6,'#3d4d41');
text('删除',l.delX+23,y+row*.64,10,has||rec?'#edc5b5':'#849480','center');
}
for(let x=left;x<right;x+=24){ctx.strokeStyle='#3c5548';ctx.beginPath();ctx.moveTo(x,trackY);ctx.lineTo(x,trackY+7*row);ctx.stroke();}
const view=challenge?C.melody.map(n=>({...n,track:n.key})):band.tracks.flatMap((t,i)=>t.map(n=>({...n,track:i,live:n===band.current})));
const transport=challenge?elapsed:band.running?band.elapsed:0,tempo=24;
ctx.save();ctx.beginPath();ctx.rect(left,trackY,right-left,7*row);ctx.clip();
for(const n of view){
const x=playX+(n.start-transport)*tempo,duration=n.live?band.elapsed-n.start:n.duration;
const width=Math.max(5,duration*tempo),y=trackY+n.track*row+5;
round(x,y,width,row-10,3,colors[n.track]);
if(width>12)text(String(n.key+1),x+4,y+(row-10)*.7,9,'#29473c');
}
ctx.restore();ctx.strokeStyle='#e9c582';ctx.beginPath();ctx.moveTo(playX,trackY-2);ctx.lineTo(playX,trackY+7*row);ctx.stroke();
const labels=['■ 停止',band.playing?'■ 停合唱':'▷ 合唱',challenge?'♪ 挑战中':'☆ 跟唱','＋ 原声'];
for(let i=0;i<4;i++){const bw=(W-32)/4;round(16+i*bw,l.top+l.trackH+8,bw-5,32,9,i===1&&band.playing?'#c4d395':'#e4e7cf');text(labels[i],16+i*bw+(bw-5)/2,l.top+l.trackH+29,11,'#3c5542','center');}
const stageTop=l.top+l.trackH+48,stageBottom=l.ky-29,stageH=Math.max(25,stageBottom-stageTop);
const compact=stageH<120,scale=compact?Math.min(.62,stageH/82,W/490):Math.min(.95,(stageH-8)/165,W/400);
for(let i=0;i<7;i++){
if(compact)frog(i,W*(i+.5)/7,stageTop+stageH*.42,scale,now);
else{const back=i<3,j=back?i:i-3,count=back?3:4;frog(i,W*(j+1)/(count+1),stageTop+32*scale+(back?0:stageH*.5),scale,now);}
}
text(now<messageUntil?message:(key>=0?names[band.selected]+'：'+sol[key]+' ～  '+Math.round(bend)+' cents':'当前 '+names[band.selected]+' · 长按滑奏 / 上下颤音'),W/2,l.ky-13,11,'#63744f','center');
const kw=(W-32)/7;for(let i=0;i<7;i++){const active=key===i;round(16+i*kw,l.ky,kw-3,l.kh,10,active?colors[i]:'#fffdf0','#d5dac2');round(16+i*kw,l.ky,kw-3,5,2,colors[i]);text(String(i+1),16+i*kw+(kw-3)/2,l.ky+l.kh*.47,22,active?'#253e30':'#425b42','center','bold');text(sol[i],16+i*kw+(kw-3)/2,l.ky+l.kh*.74,11,'#748165','center');}
text('音区',19,l.octY-8,9,'#778466');text('C4 = 中央 C',W-20,l.octY-8,9,'#778466','right');const ow=(W-32)/11;for(let i=0;i<11;i++){round(16+i*ow,l.octY,ow-2,31,6,octave===i-2?'#344e3c':'#e1e5ce');text('C'+(i-2>0?'+':'')+(i-2),16+i*ow+(ow-2)/2,l.octY+20,9,octave===i-2?'#f5f4dd':'#778466','center');}text('不必完美，呱得开心。',W/2,H-13,9,'#899478','center');
(isWX?requestAnimationFrame:window.requestAnimationFrame)(frame);}
frame();
}
if(typeof module!=='undefined')module.exports=boot;else boot({Core:root.GuajiCore,FrogAudio:root.FrogAudio,BandSession:root.BandSession});
})(typeof globalThis!=='undefined'?globalThis:this);

