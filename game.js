const Core=require('./core');
const FrogAudio=require('./audio');
const BandSession=require('./session');
require('./app')({Core,FrogAudio,BandSession,wx});
