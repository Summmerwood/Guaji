(function(root){
function boot(env){
const wx=env.wx,C=env.Core,Audio=env.FrogAudio,isWX=!!wx;
const canvas=isWX?wx.createCanvas():document.querySelector('canvas'),ctx=canvas.getContext('2d');
const info=isWX?wx.getWindowInfo():null;
let W=isWX?info.windowWidth:Math.min(innerWidth,520),H=isWX?info.windowHeight:innerHeight,dpr=isWX?info.pixelRatio:devicePixelRatio;
const audio=new Audio(()=>isWX?wx.createWebAudioContext():new (window.AudioContext||window.webkitAudioContext)());
const colors=['#94b967','#bdd378','#7eb898','#d2c076','#83b6bb','#baa8ce','#dfac87'];
const names=['呱队长','小豆','阿低','泡泡','咕咕','歪歪','大福'],sol=['do','re','mi','fa','sol','la','si'];
let octave=4,key=-1,originY=0,bend=0,pointer=null,recording=false,playing=false,challenge=false,started=0,events=[],current=null,replayIndex=0,score=0,total=0,last=0,message='今天的池塘，也要有点动静。',messageUntil=0;
const clock=()=>Date.now()/1000;
function size(){canvas.width=W*dpr;canvas.height=H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);}
size();
function layout(){const top=isWX?Math.max(80,(wx.getMenuButtonBoundingClientRect?.().bottom||48)+12):66;const kh=Math.min(125,H*.165),ky=H- kh-93;return {top,trackH:Math.min(210,H*.26),ky,kh,octY:H-68};}
function toast(s){message=s;messageUntil=clock()+4;}
function round(x,y,w,h,r,fill,stroke){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke();}}
function text(s,x,y,size=12,color='#29493c',align='left',weight='normal'){ctx.fillStyle=color;ctx.font=weight+' '+size+'px sans-serif';ctx.textAlign=align;ctx.fillText(s,x,y);}
function ellipse(x,y,rx,ry,fill){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();}
function endNote(){audio.stop();if(current){current.duration=clock()-current.wall;delete current.wall;current=null;}key=-1;bend=0;}
function note(k,y){if(k!==key){endNote();key=k;audio.start(C.frequency(key,octave),key);if(recording){current={key,octave,start:clock()-started,duration:0,wall:clock(),bends:[]};events.push(current);}}bend=C.clamp((originY-y)*3,-180,180);audio.pitch(C.frequency(key,octave),bend);if(current)current.bends.push({at:clock()-current.wall,value:bend});}
function stop(){endNote();recording=false;playing=false;challenge=false;pointer=null;}
function importSample(){stop();if(!isWX){document.querySelector('#sample').click();return;}if(!wx.chooseMessageFile){toast('此微信版本暂不支持选取音频');return;}wx.chooseMessageFile({count:1,type:'file',success:r=>{const f=r.tempFiles[0];if(f.size>10*1024*1024){toast('素材请小于 10 MB');return;}wx.getFileSystemManager().readFile({filePath:f.path,success:async r=>{try{await audio.import(r.data);toast('原声已载入 · 基准音 C4');}catch(e){toast('音频无法读取，请使用短 WAV / MP3');}},fail:()=>toast('文件读取失败')});},fail:()=>toast('未选择素材')});}
function down(x,y,id){if(pointer!==null)return;const l=layout();if(y>=l.ky&&y<l.ky+l.kh){if(playing){playing=false;endNote();}pointer=id;originY=y;try{note(C.keyAt(x,16,W-32),y);}catch(e){endNote();pointer=null;toast('音频启动失败，请检查设备声音后重试');}return;}
if(y>=l.octY&&y<l.octY+35){endNote();octave=C.clamp(Math.floor((x-16)/((W-32)/11))-2,-2,8);return;}
if(y>=l.top+ l.trackH+10&&y<l.top+l.trackH+49){const b=Math.floor((x-16)/((W-32)/4));if(b===0){const was=recording;stop();if(!was){events=[];recording=true;started=clock();toast('正在录制 · 最长 30 秒');}}if(b===1){const was=playing;stop();if(!was&&events.length){playing=true;started=clock();replayIndex=0;}else toast('先录一段池塘单曲吧');}if(b===2){stop();challenge=true;score=total=0;octave=4;started=clock()+2;toast('两秒后开始：跟着音轨弹小星星');}if(b===3)importSample();}}
function move(x,y,id){if(pointer===id)note(C.keyAt(x,16,W-32),y);}
function up(id){if(pointer===id){endNote();pointer=null;}}
if(isWX){wx.onTouchStart(e=>{const t=e.changedTouches[0];down(t.clientX,t.clientY,t.identifier);});wx.onTouchMove(e=>{for(const t of e.changedTouches)move(t.clientX,t.clientY,t.identifier);});wx.onTouchEnd(e=>{for(const t of e.changedTouches)up(t.identifier);});wx.onTouchCancel(()=>{endNote();pointer=null;});wx.onHide(stop);wx.onWindowResize(e=>{stop();W=e.windowWidth;H=e.windowHeight;size();});}
else{canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);const r=canvas.getBoundingClientRect();down(e.clientX-r.left,e.clientY-r.top,e.pointerId);});canvas.addEventListener('pointermove',e=>{const r=canvas.getBoundingClientRect();move(e.clientX-r.left,e.clientY-r.top,e.pointerId);});for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,e=>up(e.pointerId));window.addEventListener('blur',stop);document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});window.addEventListener('resize',()=>{stop();W=Math.min(innerWidth,520);H=innerHeight;size();});document.querySelector('#sample').addEventListener('change',async e=>{const f=e.target.files[0];if(!f)return;try{if(f.size>10*1024*1024)throw Error('请选择小于 10 MB 的素材');await audio.import(await f.arrayBuffer());toast('原声已载入 · 基准音 C4');}catch(err){toast(err.message||'音频无法读取');}e.target.value='';});}
function frog(i,x,y,s,t){const active=key===i,bob=active?Math.sin(t*22)*3:Math.sin(t*2+i)*2;ctx.save();ctx.translate(x,y+bob);ellipse(0,23*s,30*s,7*s,'#d0d8b5');ellipse(0,3*s,27*s,29*s,colors[i]);ellipse(-15*s,-19*s,12*s,12*s,colors[i]);ellipse(15*s,-19*s,12*s,12*s,colors[i]);for(const a of [-15,15]){ellipse(a*s,-20*s,8*s,9*s,'#fffce9');ellipse((a+1)*s,-19*s,3*s,4*s,'#233d31');}ellipse(-19*s,1*s,5*s,3*s,'#e9a88b');ellipse(19*s,1*s,5*s,3*s,'#e9a88b');ellipse(0,10*s,(active?10:7)*s,(active?10+Math.sin(t*28)*3:2)*s,'#29473c');if(active){ellipse(0,16*s,5*s,3*s,'#efac97');text('♪',29*s,-24*s,21,'#567245');}if(i===0){round(-9*s,-6*s,18*s,5*s,2,'#29473c');}ctx.restore();text(names[i],x,y+44*s,10,'#526448','center');}
function frame(){const now=clock(),dt=Math.min(now-last,.05);last=now;const l=layout(),elapsed=now-started;
if(recording&&elapsed>=30){stop();toast('30 秒小样已完成，点回放欣赏');}
if(playing){const e=events[replayIndex];if(!e){stop();toast('演出完毕，池塘掌声响起来！');}else if(elapsed>=e.start+e.duration){endNote();replayIndex++;}else if(elapsed>=e.start){if(key!==e.key){endNote();key=e.key;audio.start(C.frequency(key,e.octave),key);}const b=(e.bends||[]).filter(b=>b.at<=elapsed-e.start).pop();audio.pitch(C.frequency(key,e.octave),b?b.value:0);}}
if(challenge&&elapsed>=0){const target=C.melody.find(n=>elapsed>=n.start&&elapsed<n.start+n.duration);if(target){total+=dt;if(C.judge(key,octave,elapsed)&&Math.abs(bend)<70)score+=dt;}if(elapsed>9.2){const result=Math.round(score/Math.max(total,.01)*100);stop();toast('合唱完成 · '+result+' 分 · '+(result>75?'池塘天团出道！':'跑调也是一种风格！'));}}
ctx.fillStyle='#f1f1df';ctx.fillRect(0,0,W,H);text('呱唧',20,isWX?l.top-20:34,28,'#29493c','left','bold');text('GUAJI / POND SESSIONS',88,isWX?l.top-21:31,9,'#75836a');round(W-88,isWX?l.top-41:15,70,25,12,'#dce5bb');text('● 排练中',W-53,isWX?l.top-24:32,10,'#536a3f','center');
round(16,l.top,W-32,l.trackH,16,'#263f37');text(challenge?'小星星 / 跟唱挑战':'池塘不打烊 / 自由排练',30,l.top+25,12,'#e7edd6');text(challenge?'C4 · 92 BPM':'七位成员，一场即兴',W-29,l.top+25,9,'#afbea4','right');
const trackY=l.top+40,row=(l.trackH-54)/7,left=70,right=W-27,playX=left+35;
for(let i=0;i<7;i++){text(sol[i],31,trackY+row*(i+.7),9,'#b5c7ae');ctx.strokeStyle='#39544a';ctx.beginPath();ctx.moveTo(left,trackY+row*(i+1));ctx.lineTo(right,trackY+row*(i+1));ctx.stroke();}
for(let x=left;x<right;x+=34){ctx.strokeStyle='#334f43';ctx.beginPath();ctx.moveTo(x,trackY);ctx.lineTo(x,trackY+7*row);ctx.stroke();}
const view=challenge?C.melody:events,tempo=34;ctx.save();ctx.beginPath();ctx.rect(left,trackY,right-left,7*row);ctx.clip();for(const n of view){const x=playX+(n.start-((recording||playing||challenge)?elapsed:0))*tempo;round(x,trackY+n.key*row+3,Math.max(5,(n===current?now-n.wall:n.duration)*tempo),row-5,3,colors[n.key]);}ctx.restore();ctx.strokeStyle='#e9c582';ctx.beginPath();ctx.moveTo(playX,trackY-3);ctx.lineTo(playX,trackY+7*row);ctx.stroke();
const labels=[recording?'■ 停止':'● 录制',playing?'■ 回放中':'▷ 回放',challenge?'♪ 挑战中':'☆ 跟唱','＋ 原声'];for(let i=0;i<4;i++){const bw=(W-32)/4;round(16+i*bw,l.top+l.trackH+12,bw-5,32,9,i===0&&recording?'#d9a78d':'#e4e7cf');text(labels[i],16+i*bw+(bw-5)/2,l.top+l.trackH+32,11,'#3c5542','center');}
const stageTop=l.top+l.trackH+57,stageBottom=l.ky-42,stageH=stageBottom-stageTop,scale=Math.min(.95,(stageH-22)/150,W/400);text('THE LILY PAD CLUB',W/2,stageTop+8,9,'#8c987a','center');for(let i=0;i<7;i++){const back=i<3,j=back?i:i-3,count=back?3:4;frog(i,W*(j+1)/(count+1),stageTop+35+(back?0:stageH*.48),scale,now);} 
text(now<messageUntil?message:(key>=0?names[key]+'：'+sol[key]+' ～  '+Math.round(bend)+' cents':'长按开唱 · 左右滑奏 · 上下颤音'),W/2,l.ky-16,11,'#63744f','center');
const kw=(W-32)/7;for(let i=0;i<7;i++){const active=key===i;round(16+i*kw,l.ky,kw-3,l.kh,10,active?colors[i]:'#fffdf0','#d5dac2');round(16+i*kw,l.ky,kw-3,5,2,colors[i]);text(String(i+1),16+i*kw+(kw-3)/2,l.ky+l.kh*.47,22,active?'#253e30':'#425b42','center','bold');text(sol[i],16+i*kw+(kw-3)/2,l.ky+l.kh*.74,11,'#748165','center');}
text('音区',19,l.octY-8,9,'#778466');text('C4 = 中央 C',W-20,l.octY-8,9,'#778466','right');const ow=(W-32)/11;for(let i=0;i<11;i++){round(16+i*ow,l.octY,ow-2,31,6,octave===i-2?'#344e3c':'#e1e5ce');text('C'+(i-2>0?'+':'')+(i-2),16+i*ow+(ow-2)/2,l.octY+20,9,octave===i-2?'#f5f4dd':'#778466','center');}text('不必完美，呱得开心。',W/2,H-13,9,'#899478','center');
(isWX?requestAnimationFrame:window.requestAnimationFrame)(frame);}
frame();
}
if(typeof module!=='undefined')module.exports=boot;else boot({Core:root.GuajiCore,FrogAudio:root.FrogAudio});
})(typeof globalThis!=='undefined'?globalThis:this);

