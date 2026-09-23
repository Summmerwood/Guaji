const test=require('node:test'),assert=require('node:assert/strict'),C=require('../core');
test('concert tuning and all eleven registers',()=>{assert.ok(Math.abs(C.frequency(5,4)-440)<1e-10);assert.ok(Math.abs(C.frequency(0,4)-261.625565)<.00001);for(let o=-2;o<8;o++)assert.equal(C.frequency(0,o+1),2*C.frequency(0,o));});
test('sliding is clamped at both screen edges',()=>{assert.equal(C.keyAt(-30,16,350),0);assert.equal(C.keyAt(366,16,350),6);assert.equal(C.keyAt(67,16,350),1);});
test('challenge requires correct note, register and timing',()=>{assert.equal(C.judge(0,4,.1),true);assert.equal(C.judge(1,4,.1),false);assert.equal(C.judge(0,3,.1),false);assert.equal(C.judge(0,4,.6),false);assert.equal(C.judge(0,4,-1),false);});
