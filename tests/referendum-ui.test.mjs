import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
for(const file of ['index.html','embed.html']){
 const html=await readFile(new URL('../public/'+file,import.meta.url),'utf8'),app=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)][0][1];
 const elements=new Map(['map-data','preset','refSupport','refOppose','refNote','refOutcome','refThresholds'].map(id=>[id,{dataset:{},textContent:id==='map-data'?html.match(/<script id="map-data" type="application\/json">([\s\S]*?)<\/script>/)[1]:id==='preset'?'{}':''}]));
 const referendum={id:22,support:12345,oppose:6789,electorate:30000,progress:{completed:32,total:40,percent:80}};
 const context=vm.createContext({document:{hidden:false,documentElement:{classList:{add(){}}},addEventListener(){},getElementById:id=>elements.get(id)||null},location:{pathname:'/'+file,search:''},URLSearchParams,AbortSignal,localStorage:{getItem:()=>null},render(){},fetch:async url=>({ok:true,json:async()=>({schemaVersion:1,electionYear:2026,status:'live_count',updatedAt:'2026-11-28T12:00:00Z',results:url.includes('referendum')?{}:{'臺北市':{mayor:[['蔣萬安','中國國民黨',100,false]]}},...(url.includes('referendum')?{referendum}:{})})})});
 vm.runInContext(app.slice(0,app.indexOf('function navigate('))+app.slice(app.indexOf('let selfDeclarations='),app.indexOf('const nationalMayorSummary ='))+app.slice(app.indexOf('function validRecord('),app.indexOf('function showEmbedCode('))+app.slice(app.indexOf('async function syncOfficialCounts(){'),app.indexOf('\nsyncOfficialCounts();')),context);
 await vm.runInContext('syncOfficialCounts()',context);
 assert.ok(elements.get('refSupport').textContent.includes('12,345 票'));
 assert.ok(elements.get('refOppose').textContent.includes('6,789 票'));
 assert.ok(elements.get('refSupport').textContent.includes((100*12345/(12345+6789)).toFixed(2)+'%'));
 assert.ok(elements.get('refNote').textContent.includes('80.00%（32／40 所）'));
 assert.ok(elements.get('refNote').textContent.includes('每 30 秒更新'));
 assert.ok(elements.get('refOutcome').textContent.includes('目前符合通過條件'));
 assert.ok(elements.get('refThresholds').textContent.includes('7,500 票'));
 assert.equal(vm.runInContext("referendumOutcome({support:5000959,oppose:1,electorate:20003835},'final_results').passed",context),true);
 assert.equal(vm.runInContext("referendumOutcome({support:5000958,oppose:1,electorate:20003835},'final_results').passed",context),false);
 assert.equal(vm.runInContext("referendumOutcome({support:5000959,oppose:5000959,electorate:20003835},'final_results').passed",context),false);
 assert.equal(vm.runInContext("referendumOutcome({support:5000959,oppose:1},'final_results').passed",context),null);
 console.log('PASS '+file+': actual sync path renders referendum totals, percentages, progress and refresh notice');
}
