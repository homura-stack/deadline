/* Runs every Chrome suite; each owns an isolated browser profile. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const suites=fs.readdirSync(__dirname).filter(name=>/(?:^browser|-browser)\.cjs$/.test(name)).sort();
const out=path.join(__dirname,'artifacts',process.env.DEADLINE_REPORT_DIR||'browser-suite','suite-logs');fs.mkdirSync(out,{recursive:true});
const results=[];
for(const suite of suites){
 console.log(`RUN ${suite}`);const started=Date.now();
 const run=spawnSync(process.execPath,[path.join(__dirname,suite)],{encoding:'utf8',timeout:300000,maxBuffer:8*1024*1024});
 const output=(run.stdout||'')+(run.stderr||'')+(run.error?String(run.error):'');fs.writeFileSync(path.join(out,suite+'.log'),output);
 results.push({suite,passed:run.status===0,exitCode:run.status,seconds:(Date.now()-started)/1000});
 console.log(`${run.status===0?'PASS':'FAIL'} ${suite} (${results.at(-1).seconds.toFixed(1)}s)`);
 if(run.status!==0)console.log(output.slice(-3500));
}
fs.writeFileSync(path.join(out,'summary.json'),JSON.stringify(results,null,2));
console.log(`Chrome suites: ${results.filter(r=>r.passed).length}/${results.length} PASS`);
if(results.some(r=>!r.passed))process.exitCode=1;
