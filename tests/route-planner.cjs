'use strict';
// Test-only path search. Uses production collision geometry; never modifies game tuning.
const C=require('../config.js'),S=require('../simulation.js');
const assert=require('node:assert/strict');
function detour(w, from, goal) {
 const margin=C.world.margin,grid=16,cols=Math.ceil((C.world.width-2*margin)/grid)+1,rows=Math.ceil((C.world.height-2*margin)/grid)+1,radius=C.player.radius+C.shooting.bulletRadius+3;
 // A near miss can start inside the optional 3px cushion, but outside the actual hitbox.
 // Keep the full cushion for other bullets, and never go below the production collision radius.
 const obstacles=w.bullets.map(shot=>({shot,radius:Math.max(C.player.radius+C.shooting.bulletRadius,Math.min(radius,S.distance(from,shot)-1e-6))}));
 const clear=(a,b)=>obstacles.every(({shot,radius:clearance})=>S.segmentCircleTime(a,b,shot,clearance)===null);
 // Include the exact playable edges even when the grid does not divide the field height.
 const position=id=>({x:Math.min(C.world.width-margin,margin+(id%cols)*grid),y:Math.min(C.world.height-margin,margin+Math.floor(id/cols)*grid)});
 const candidates=new Set(),cost=new Map(),parent=new Map();
 for(let id=0;id<cols*rows;id++){const p=position(id);if(S.distance(from,p)<32&&clear(from,p)){candidates.add(id);cost.set(id,S.distance(from,p));parent.set(id,null);}}
 let end=null;
 while(candidates.size){let current=null,best=Infinity;for(const id of candidates){const f=cost.get(id)+S.distance(position(id),goal);if(f<best){best=f;current=id;}}
  candidates.delete(current);const a=position(current);
  if(S.distance(a,goal)<32&&clear(a,goal)){end=current;break;}
  for(const dx of [-1,0,1])for(const dy of [-1,0,1]){if(!dx&&!dy)continue;const x=current%cols+dx,y=Math.floor(current/cols)+dy;if(x<0||x>=cols||y<0||y>=rows)continue;
   const id=y*cols+x,b=position(id),next=cost.get(current)+S.distance(a,b);if(next>=(cost.get(id)??Infinity)||!clear(a,b))continue;cost.set(id,next);parent.set(id,current);candidates.add(id);
  }
 }
 if(end===null)return null;const raw=[goal];for(let id=end;id!==null;id=parent.get(id))raw.push(position(id));raw.push(from);raw.reverse();
 const simple=[from];let i=0;while(i<raw.length-1){let j=raw.length-1;while(j>i+1&&!clear(raw[i],raw[j]))j--;simple.push(raw[j]);i=j;}return simple;
}

function pathLength(points){let total=0;for(let i=1;i<points.length;i++)total+=S.distance(points[i-1],points[i]);return total;}
function approach(w,from,target){let best=null;
 for(const radius of [36,44,0])for(let i=0;i<(radius?16:1);i++){const angle=i*Math.PI/8,goal={x:Math.max(24,Math.min(936,target.x+Math.cos(angle)*radius)),y:Math.max(24,Math.min(576,target.y+Math.sin(angle)*radius))};const path=detour(w,from,goal);if(path&&(!best||pathLength(path)<pathLength(best)))best=path;}
 return best;
}
function planWavePoints(w){const points=[w.player];let from=w.player,remaining=w.enemies.filter(e=>e.alive);
 while(remaining.length){let choice=null;for(const target of remaining){const path=approach(w,from,target);if(path&&(!choice||pathLength(path)<pathLength(choice.path)))choice={target,path};}assert.ok(choice,'No safe approach to a Wave enemy');points.push(...choice.path.slice(1));from=choice.path.at(-1);remaining=remaining.filter(e=>e.id!==choice.target.id);}
 for(const end of [{x:60,y:550},{x:60,y:60},{x:900,y:550}]){const tail=detour(w,from,end);if(tail){points.push(...tail.slice(1));break;}}
 return points;
}
module.exports={detour,approach,planWavePoints};
