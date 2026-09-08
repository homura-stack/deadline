/* Diagnostic runner: unchanged campaign rules, selected test planner, exact STOP captures. Not a release suite. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const root=path.join(__dirname,'..'),out=path.join(__dirname,'artifacts','wave-investigation');
fs.mkdirSync(out,{recursive:true});
const label=process.env.WAVE_RUN||`run-${Date.now()}`;
if(process.env.WAVE_LEGACY==='1'){
 const filename=path.join(__dirname,'browser.cjs'),legacy=new Module(filename,module);
 legacy.filename=filename;legacy.paths=module.paths;
 legacy._compile(fs.readFileSync(path.join(out,'legacy-browser.cjs'),'utf8'),filename);
 require.cache[filename]=legacy;
}
let source=fs.readFileSync(path.join(__dirname,'wave-k-browser.cjs'),'utf8');
source=source.replace('await surviveUntilReady(p);await p.keyboard.press',"await surviveUntilReady(p);if(wave===7&&process.env.WAVE_STOP_DELAY)await p.waitForTimeout(Number(process.env.WAVE_STOP_DELAY));await p.keyboard.press");
source=source.replace("await p.addInitScript", `
  if(process.env.WAVE_DISABLE_Q==='1')await p.route('**/game.js',route=>route.fulfill({contentType:'application/javascript',body:fs.readFileSync(${JSON.stringify(path.join(root,'game.js'))},'utf8').replaceAll('restoreCheckpoint();','').replaceAll('saveProgress();','')}));
  await p.addInitScript`);
source=source.replace('wave<=10','wave<=7');
source=source.replace('let points;',`fs.writeFileSync(${JSON.stringify(path.join(out,label+'-'))}+wave+'.json',JSON.stringify(stopped,null,2));
   let points;`);
source=source.replace("await p.waitForFunction(()=>Deadline.inspect().journey.mode==='ending',{}, {timeout:15000});",'');
source=source.replace("path.join(out,'standard-waves.json')",JSON.stringify(path.join(out,label+'-result.json')));
const diagnostic=new Module(path.join(__dirname,'wave-k-browser.cjs'),module);
diagnostic.filename=path.join(__dirname,'wave-k-browser.cjs');diagnostic.paths=module.paths;
diagnostic._compile(source,diagnostic.filename);
