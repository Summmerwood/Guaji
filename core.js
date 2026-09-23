/* Shared by browsers and WeChat Mini Game. */
(function(root){
const STEPS=[0,2,4,5,7,9,11];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const frequency=(key,octave)=>440*Math.pow(2,((octave+1)*12+STEPS[key]-69)/12);
const keyAt=(x,left,width)=>clamp(Math.floor((x-left)/(width/7)),0,6);
const melody=[0,0,4,4,5,5,4,3,3,2,2,1,1,0].map((key,i)=>({key,start:i*.65,duration:i===6||i===13?.60:.48}));
function judge(key,octave,time){const target=melody.find(n=>time>=n.start&&time<n.start+n.duration);return !!target&&target.key===key&&octave===4;}
const api={STEPS,clamp,frequency,keyAt,melody,judge};
if(typeof module!=='undefined')module.exports=api;else root.GuajiCore=api;
})(typeof globalThis!=='undefined'?globalThis:this);
