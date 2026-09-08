/* Offline diagnosis of the exact original browser planner; never changes the game. */
'use strict';
const fs=require('node:fs'),path=require('node:path');
const C=require('../config.js'),S=require('../simulation.js');
const source=fs.readFileSync(path.join(__dirname,'artifacts','wave-investigation','legacy-browser.cjs'),'utf8');
function planner(extra=3,grid=16){
 let code=source.slice(source.indexOf('function detour('),source.indexOf('async function charge('))+
 source.slice(source.indexOf('function pathLength('),source.indexOf('async function planWave('));
 code=code.replace('grid=16,cols=58,rows=35',`grid=${grid},cols=${Math.floor(912/grid)+1},rows=${Math.floor(552/grid)+1}`).replace('C.shooting.bulletRadius+3',`C.shooting.bulletRadius+${extra}`);
 return new Function('C','S',code+';return {detour,approach,pathLength};')(C,S);
}
function analyze(w,extra=3,grid=16){
 const p=planner(extra,grid),points=[w.player];let from=w.player,remaining=w.enemies.filter(e=>e.alive),failure=null;
 while(remaining.length){let choice=null;for(const target of remaining){const route=p.approach(w,from,target);if(route&&(!choice||p.pathLength(route)<p.pathLength(choice.path)))choice={target,path:route};}
  if(!choice){failure={from,remaining:remaining.map(e=>e.id),nearestBullet:Math.min(...w.bullets.map(b=>S.distance(from,b)))};break;}
  points.push(...choice.path.slice(1));from=choice.path.at(-1);remaining=remaining.filter(e=>e.id!==choice.target.id);
 }
 const compiled=S.compileRoute(points,w),clone=structuredClone(w);clone.route=compiled;S.executeRoute(clone);for(let i=0;i<3000&&clone.phase==='executing';i++)S.step(clone,C.world.fixedStep);
 return {extra,grid,failure,points,locks:compiled.locks.length,danger:compiled.danger.length,phase:clone.phase,failed:clone.failed,kills:clone.lastKills};
}
if(require.main===module){
 const w=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
 for(const [extra,grid] of [[3,16],[0,16],[3,8],[0,8]]){const r=analyze(w,extra,grid);console.log(JSON.stringify({...r,points:r.points.length}));}
}
module.exports={analyze,planner};
