/* Replays frozen observations, not generated combat fixtures; writes diagnostic evidence only. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {analyze}=require('./analyze-wave-snapshot.cjs'),{planWavePoints}=require('./route-planner.cjs');
const C=require('../config.js'),S=require('../simulation.js');
const out=path.join(__dirname,'artifacts','wave-investigation'),report={seed:'0xdead1e',runs:[],frozen:[]};
for(const name of fs.readdirSync(out).filter(n=>n.endsWith('-result.json'))){
 const result=JSON.parse(fs.readFileSync(path.join(out,name),'utf8')),label=name.replace('-result.json','');
 const w=JSON.parse(fs.readFileSync(path.join(out,label+'-7.json'),'utf8'));
 const physical={player:w.player,enemies:w.enemies,bullets:w.bullets};
 report.runs.push({label,passedWave7:result.waves.length===7,completedWaves:result.waves.length,worldTime:w.time,player:w.player,bullets:w.bullets.length,
  nearestBullet:Math.min(...w.bullets.map(b=>S.distance(w.player,b))),physicalHash:crypto.createHash('sha256').update(JSON.stringify(physical)).digest('hex'),errors:result.errors});
}
for(const name of ['wave7-grid-trap','wave7-padding-trap']){
 const captured=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures',name+'.json'),'utf8'));
 const result={fixture:name,repetitions:20,oldPlannerFailures:0,fixedClears:0,physicalHash:crypto.createHash('sha256').update(JSON.stringify(captured)).digest('hex')};
 for(let i=0;i<20;i++){
  if(analyze(captured).failure)result.oldPlannerFailures++;
  const w=structuredClone(captured),points=planWavePoints(w),route=S.compileRoute(points,w);
  if(route.danger.length||route.locks.length!==5)throw Error('Invalid fixed route');
  w.route=route;S.executeRoute(w);for(let step=0;step<3000&&w.phase==='executing';step++)S.step(w,C.world.fixedStep);
  if(w.phase==='wave-clear'&&!w.failed&&w.lastKills===5)result.fixedClears++;
 }
 report.frozen.push(result);console.log(result);
}
fs.writeFileSync(path.join(out,'analysis.json'),JSON.stringify(report,null,2));
console.log(report.runs);
