import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
for(const file of ['index.html','embed.html']){
 const html=await readFile(new URL('../public/'+file,import.meta.url),'utf8');
 const app=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)][0][1];
 const data=html.match(/<script id="map-data" type="application\/json">([\s\S]*?)<\/script>/)[1];
 const elements=new Map(['map-data','preset','detail','heading','panel-kicker','subheading'].map(id=>[id,{textContent:id==='map-data'?data:id==='preset'?'{}':'',innerHTML:'',querySelectorAll:()=>[]} ]));
 const context=vm.createContext({document:{documentElement:{classList:{add(){}}},addEventListener(){},getElementById:id=>elements.get(id)||null},location:{pathname:'/'+file,search:''},URLSearchParams,localStorage:{getItem:()=>null}});
 vm.runInContext(app.slice(0,app.indexOf('function navigate('))+app.slice(app.indexOf('const mayorPortrait ='),app.indexOf('function districtButtons('))+app.slice(app.indexOf('function renderDetail(){'),app.indexOf('function render(){')),context);
 vm.runInContext('renderDetail()',context);
 assert.equal((elements.get('detail').innerHTML.match(/data-c="/g)||[]).length,22,file+' national county list');
 assert.ok(elements.get('detail').innerHTML.includes('蔣萬安'),file+' candidate names');
 vm.runInContext("county='臺北市';tab='mayor';renderDetail()",context);
 assert.ok(elements.get('detail').innerHTML.includes('蔣萬安'),file+' mayor list');
 assert.equal((elements.get('detail').innerHTML.match(/class="candidate-portrait"/g)||[]).length,6);
 vm.runInContext("county='連江縣';tab='townMayor';renderDetail()",context);
 assert.ok(elements.get('detail').innerHTML.includes('東引鄉'),file+' township list');
 vm.runInContext("county='臺北市';tab='council';renderDetail()",context);
 assert.ok(elements.get('detail').innerHTML.includes('第 1 選區'),file+' council list');
 console.log('PASS '+file+': national list, mayor names/portraits, township mayors and council render');
}
