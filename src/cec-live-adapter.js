// Official 2026 HTML tables, not an undocumented JSON API.
const portal='https://vote.cec.gov.tw/home/zh-TW/';
const official=u=>u.protocol==='https:'&&u.hostname==='vote.cec.gov.tw'&&!u.username&&!u.password;
const clean=s=>s.replace(/<img\b[^>]*alt=["']([^"']*)["'][^>]*>/gi,' $1 ').replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(+n)).replace(/\s+/g,' ').trim();
const number=s=>/^\d[\d,]*$/.test(s)?Number(s.replaceAll(',','')):null;
export function parseProgress(html){
 const s=clean(html),pair=s.match(/已送投票所數\s*[/／]\s*總投票所數\s*[：:]?\s*([\d,]+)\s*[/／]\s*([\d,]+)/),completed=number(pair?.[1]||s.match(/已開票所數\s*[：:]?\s*([\d,]+)/)?.[1]||''),total=number(pair?.[2]||s.match(/(?:應開票所數|總投開票所數)\s*[：:]?\s*([\d,]+)/)?.[1]||'');
 if(Number.isSafeInteger(completed)&&Number.isSafeInteger(total)&&total>0&&completed>=0&&completed<=total)return {completed,total,percent:Math.round(completed/total*10000)/100};
 const m=s.match(/開票進度\s*[：:]?\s*(\d+(?:\.\d+)?)\s*[%％]/);
 return m&&Number(m[1])>=0&&Number(m[1])<=100?{percent:Number(m[1])}:null;
}
export function parseCandidateTable(html,target){
 if(/模擬|測試資料|演練/.test(clean(html)))throw Error('Non-production results');
 const title=clean(html.match(/<div\b[^>]*class=["'][^"']*vote-table-header-title[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)?.[1]||'');
 if(!title.includes(target.county)||!title.includes('得票')||(target.town&&!title.includes(target.town))||(target.kind==='mayor'&&!/市長|縣長/.test(title))||(target.kind==='council'&&(!title.includes('議員')||!new RegExp('第\\s*0*'+target.id+'\\s*選舉區').test(title))))throw Error('Wrong election table');
 const tables=[...html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)];
 for(const [,table] of tables){
  const head=table.match(/<thead\b[^>]*>([\s\S]*?)<\/thead>/i)?.[1]||'';
  const headers=[...head.matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/gi)].map(m=>clean(m[1]));
  const name=headers.findIndex(h=>h==='姓名'||h==='候選人姓名'),party=headers.findIndex(h=>/政黨/.test(h)),votes=headers.findIndex(h=>h==='得票數'),elected=headers.findIndex(h=>/當選/.test(h));
  if(name<0||party<0||votes<0)continue;
  const body=table.match(/<tbody\b[^>]*>([\s\S]*?)<\/tbody>/i)?.[1];if(!body)throw Error('Missing result rows');
  const rows=[];const seen=new Set();
  for(const [,tr] of body.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)){
   const cells=[...tr.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(m=>clean(m[1]));
   if(cells.length!==headers.length)throw Error('Unexpected columns');
   const n=cells[name],p=cells[party].replace('無黨籍及未經政黨推薦','無黨籍'),v=number(cells[votes]);
   if(!n||!p||!Number.isSafeInteger(v)||v<0||seen.has(n))throw Error('Invalid result row');
   if(target.names&&!target.names.includes(n))throw Error('Candidate identity mismatch');
   seen.add(n);rows.push([n,p,v,elected>=0&&/^(?:當選|當選人|\*|◎|●|○|(?:婦女|女性)(?:保障|應當選)?名額(?:調整)?當選)$/.test(cells[elected])]);
  }
  if(!rows.length||(target.names&&rows.length!==target.names.length))throw Error('Incomplete result table');
  return rows;
 }
 throw Error('Unconfirmed official table format');
}
export function parseCouncilMetadata(html,rows){
 const s=clean(html),notes=[];
 for(const [,tr] of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)){
  const cells=[...tr.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(m=>clean(m[1]));
  const reason=cells.find(c=>/^(?:婦女|女性)(?:保障|應當選)?名額(?:調整)?當選$/.test(c));
  if(reason){const r=rows.find(r=>r[3]&&cells.includes(r[0]));if(r)notes.push({name:r[0],reason});}
 }
 return {seats:number(s.match(/(?:^|\s)應選人數\s*[：:]\s*(\d+)/)?.[1]||''),womenSeats:number(s.match(/婦女應當選名額\s*[：:]\s*(\d+)/)?.[1]||''),officialWinnersAvailable:[...html.matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/gi)].some(m=>/當選/.test(clean(m[1]))),womenQuotaNotes:notes};
}
export function councilRevision(metadata,rows,previousRows,previousMetadata,updatedAt){
 const before=(previousRows||[]).filter(r=>r[3]).map(r=>r[0]).sort(),after=rows.filter(r=>r[3]).map(r=>r[0]).sort();
 const changed=metadata.officialWinnersAvailable&&before.length>0&&JSON.stringify(before)!==JSON.stringify(after);
 return {...metadata,...(changed?{revision:{updatedAt,previousWinners:before,currentWinners:after,message:'中選會當選名單已更新'}}:previousMetadata?.revision?{revision:previousMetadata.revision}:{})};
}
export function parseStage(html){
 const m=html.match(/\.api\.run\(\s*['"]zh-TW['"]\s*,\s*['"](prior|count|final)['"]/);
 if(!m||!/2026-local|2026-ref/.test(html))throw Error('Unconfirmed election stage');
 return m[1];
}
export function parseReferendumTable(html){
 if(/模擬|測試資料|演練/.test(clean(html))||!/(?:第\s*22\s*案)/.test(clean(html)))throw Error('Wrong referendum');
 const title=clean(html.match(/<div\b[^>]*class=["'][^"']*vote-table-header-title[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)?.[1]||'');
 const nationalTitle=/全國性公民投票\s*第\s*22\s*案\s*投票結果\s*[-－—]\s*全國$/.test(title);
 for(const [,table] of html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)){
  const rows=[...table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(m=>[...m[1].matchAll(/<t[hd]\b[^>]*>([\s\S]*?)<\/t[hd]>/gi)].map(c=>clean(c[1])));
  const h=rows.findIndex(r=>r.includes('同意票數')&&r.includes('不同意票數'));if(h<0)continue;
  const a=rows[h].indexOf('同意票數'),b=rows[h].indexOf('不同意票數');
  const dataRows=rows.slice(h+1);
  const totals=nationalTitle&&rows[h].length===2&&dataRows.length===1&&dataRows[0].length===2?dataRows:dataRows.filter(r=>r.some(c=>c==='全國'||c==='總計'||c==='合計'));
  if(totals.length!==1)throw Error('No unique national referendum total');
  const support=number(totals[0][a]||''),oppose=number(totals[0][b]||'');
  if(!Number.isSafeInteger(support)||!Number.isSafeInteger(oppose)||support<0||oppose<0)throw Error('Invalid referendum votes');
  return {id:22,support,oppose};
 }
 throw Error('Unconfirmed referendum format');
}
export function parseReferendumElectorate(html){
 for(const [,table] of html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)){
  const head=table.match(/<thead\b[^>]*>([\s\S]*?)<\/thead>/i)?.[1]||'';
  const headers=[...head.matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/gi)].map(m=>clean(m[1]));
  const i=headers.indexOf('投票權人總數');if(i<0)continue;
  const body=table.match(/<tbody\b[^>]*>([\s\S]*?)<\/tbody>/i)?.[1]||'';
  const rows=[...body.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)];if(rows.length!==1)throw Error('Ambiguous electorate');
  const cells=[...rows[0][1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(m=>clean(m[1]));
  const value=number(cells[i]||'');if(!Number.isSafeInteger(value)||value<=0)throw Error('Invalid electorate');
  return value;
 }
 return null;
}
async function text(url){
 if(!official(new URL(url)))throw Error('Untrusted source');
 const r=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(8000),cf:{cacheTtl:30,cacheEverything:true}});
 if(!r.ok)throw Error('Official HTTP '+r.status);
 const s=await r.text();if(s.length>1500000)throw Error('Unexpected response size');return s;
}
async function entry(instance,home){
 const links=[...home.matchAll(/href=["']([^"']+)["']/g)].map(m=>new URL(m[1],portal));
 const url=links.find(u=>official(u)&&u.pathname.startsWith('/'+instance+'/zh-TW/')&&/\/index[^/]*\.html$/.test(u.pathname));
 if(!url)throw Error('Official entry missing');
 return {url:url.href,stage:parseStage(await text(url.href))};
}
export async function official2026(request,env){
 const q=new URL(request.url).searchParams,county=q.get('county')||'',kind=q.get('kind')||(county?'council':'mayor');
 const config=await (await env.ASSETS.fetch(new Request('https://assets.local/data/cec-live-config.json'))).json();
 if((county&&!config.counties.includes(county))||!['mayor','mayorByTown','council','townMayor','referendum'].includes(kind)||(!county&&!['mayor','referendum'].includes(kind)))return Response.json({error:'Unknown scope'},{status:400});
 const base={schemaVersion:1,electionYear:2026,source:'中央選舉委員會',sourceUrl:portal,scope:(county||'national')+':'+kind};
 const key='cec-2026-'+base.scope;
 try{
  const home=await text(portal),local=await entry(kind==='referendum'?'2026-ref':'2026-local',home);
  if(local.stage==='prior')return reply({...base,status:'awaiting_counting',checkedAt:new Date().toISOString(),officialStage:'prior',message:'已連接中選會官方站，等待公布計票資料'});
  if(kind==='referendum'){
   const html=await text(new URL('F1/00000000000000000.html',local.url).href),referendum={...parseReferendumTable(html),progress:parseProgress(html),electorate:parseReferendumElectorate(html)};
   if(referendum.electorate!==null&&referendum.support+referendum.oppose>referendum.electorate)throw Error('Invalid referendum total');
   const payload={...base,status:local.stage==='final'?'final_results':'live_count',updatedAt:new Date().toISOString(),results:{},referendum};
   try{await env.VISITORS?.prepare('INSERT INTO election_feed_cache(scope,payload) VALUES (?,?) ON CONFLICT(scope) DO UPDATE SET payload=excluded.payload').bind(key,JSON.stringify(payload)).run();}catch{}
   return reply(payload);
  }
  const targets=config.targets.filter(t=>t.kind===kind&&(!county||t.county===county));
  if(!targets.length)return reply({...base,status:'not_applicable',message:'此行政區無此項選舉'});
  const results={},errors=[],progressByCounty={},councilMetadata={};let successful=0,previous=null;
  if(kind==='council')try{const row=await env.VISITORS?.prepare('SELECT payload FROM election_feed_cache WHERE scope=?').bind(key).first();if(row)previous=JSON.parse(row.payload);}catch{}
  // Limit concurrency and keep each request within the Workers Free subrequest limit.
  for(let start=0;start<targets.length;start+=5)await Promise.all(targets.slice(start,start+5).map(async t=>{
   try{
    const html=await text(new URL(t.path,local.url).href),rows=parseCandidateTable(html,t);
    if(kind==='mayor'){const progress=parseProgress(html);if(progress)progressByCounty[t.county]=progress;}
    if(kind==='council'){const meta=councilRevision(parseCouncilMetadata(html,rows),rows,previous?.results?.[t.county]?.council?.[t.id],previous?.councilMetadata?.[t.county]?.[t.id],new Date().toISOString());meta.sourceUrl=new URL(t.path,local.url).href;(councilMetadata[t.county]||={})[t.id]=meta;}
    const c=results[t.county]||={};
    if(t.kind==='mayor')c.mayor=rows;
    else(c[t.kind]||={})[t.id]=rows;
    successful++;
   }catch{errors.push({county:t.county,kind:t.kind,id:t.id||null});}
  }));
  if(!successful)throw Error('No verified count tables');
  if(errors.length)try{const cached=await env.VISITORS?.prepare('SELECT payload FROM election_feed_cache WHERE scope=?').bind(key).first();if(cached){const old=JSON.parse(cached.payload);for(const [c,e] of Object.entries(old.results||{})){const fresh=results[c]||={};for(const [k,v] of Object.entries(e))fresh[k]=Array.isArray(v)?fresh[k]||v:{...v,...fresh[k]};}}}catch{}
  if(kind==='council'&&previous?.councilMetadata)for(const [c,m] of Object.entries(previous.councilMetadata))councilMetadata[c]={...m,...councilMetadata[c]};
  const payload={...base,status:local.stage==='final'?'final_results':'live_count',updatedAt:new Date().toISOString(),results,partial:errors.length>0,unavailable:errors,...(kind==='mayor'?{progressByCounty}:kind==='council'?{councilMetadata}:{})};
  const ps=Object.values(progressByCounty);
  if(kind==='mayor'&&!county&&!errors.length&&ps.length===22&&ps.every(p=>Number.isSafeInteger(p.completed)&&Number.isSafeInteger(p.total))){const completed=ps.reduce((n,p)=>n+p.completed,0),total=ps.reduce((n,p)=>n+p.total,0);payload.progress={completed,total,percent:Math.round(completed/total*10000)/100};}
  try{await env.VISITORS?.prepare('INSERT INTO election_feed_cache(scope,payload) VALUES (?,?) ON CONFLICT(scope) DO UPDATE SET payload=excluded.payload').bind(key,JSON.stringify(payload)).run();}catch{}
  return reply(payload);
 }catch(error){
  try{const cached=await env.VISITORS?.prepare('SELECT payload FROM election_feed_cache WHERE scope=?').bind(key).first();if(cached){const p=JSON.parse(cached.payload);return reply({...p,stale:true,message:'官方來源暫不可用，保留上次驗證資料'});}}catch{}
  return reply({...base,status:'source_unavailable',diagnostic:/^Official HTTP \d+$/.test(error.message)?error.message:'Official data unavailable or unconfirmed',message:'官方計票資料尚未公布、暫不可用或格式待確認；不顯示推算票數'},503);
 }
}
function reply(p,status=200){return Response.json(p,{status,headers:{'Cache-Control':'public, max-age=30','Access-Control-Allow-Origin':'*'}});}
async function cachedOfficial2026(request,env){
 const u=new URL(request.url),key=new URL('https://taiwan-election-atlas.pages.dev/api/live2026');
 for(const name of ['county','kind'])if(u.searchParams.has(name))key.searchParams.set(name,u.searchParams.get(name));
 key.searchParams.set('_v','30s-referendum-threshold');
 const cache=globalThis.caches?.default,cacheRequest=new Request(key.href);
 const hit=await cache?.match(cacheRequest);if(hit)return hit;
 const response=await official2026(request,env);
 if(response.ok&&cache)try{await cache.put(cacheRequest,response.clone());}catch{}
 return response;
}
