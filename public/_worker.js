// Configure only after the CEC feed URL and its actual format have been confirmed.
// A raw CEC format requires a reviewed adapter; never infer 2026 paths from old elections.
const countyNames=['臺北市','新北市','基隆市','桃園市','新竹市','新竹縣','苗栗縣','臺中市','彰化縣','南投縣','雲林縣','嘉義市','嘉義縣','臺南市','高雄市','屏東縣','宜蘭縣','花蓮縣','臺東縣','澎湖縣','金門縣','連江縣'];
const record=r=>Array.isArray(r)&&r.length===4&&typeof r[0]==='string'&&r[0].trim()&&typeof r[1]==='string'&&r[1].trim()&&(r[2]===null||(Number.isSafeInteger(r[2])&&r[2]>=0))&&typeof r[3]==='boolean'&&(!r[3]||r[2]!==null);
export function validFeed(p){
 const object=x=>x&&typeof x==='object'&&!Array.isArray(x);
 if(!p||p.schemaVersion!==1||p.electionYear!==2026||!['live_count','final_results'].includes(p.status)||!Number.isFinite(Date.parse(p.updatedAt))||!object(p.results)||!Object.keys(p.results).length)return false;
 if(!Object.entries(p.results).every(([c,e])=>countyNames.includes(c)&&object(e)&&Object.keys(e).length&&Object.entries(e).every(([k,v])=>k==='mayor'?Array.isArray(v)&&v.every(record):['mayorByTown','mayorByLeg','council','townMayor'].includes(k)&&object(v)&&Object.values(v).every(rows=>Array.isArray(rows)&&rows.every(record)))))return false;
 return !p.referendum||(p.referendum.id===22&&['support','oppose'].every(k=>Number.isSafeInteger(p.referendum[k])&&p.referendum[k]>=0));
}
export async function onRequestGet({env}){
 const reply=(payload,status=200)=>Response.json(payload,{status,headers:{'Cache-Control':'public, max-age=60','Access-Control-Allow-Origin':'*'}});
 const base={schemaVersion:1,electionYear:2026,source:'中央選舉委員會',sourceUrl:'https://www.cec.gov.tw/'};
 if(!env.CEC2026_FEED_URL)return reply({...base,status:'awaiting_official_feed',message:'中選會即時計票資料尚未接入'});
 try{
  const url=new URL(env.CEC2026_FEED_URL);
  if(url.protocol!=='https:'||url.username||url.password||!(url.hostname==='cec.gov.tw'||url.hostname.endsWith('.cec.gov.tw')))throw Error('Invalid official source');
  const headers={Accept:'application/json'};
  if(env.CEC2026_FEED_TOKEN)headers.Authorization='Bearer '+env.CEC2026_FEED_TOKEN;
  const upstream=await fetch(url,{headers,redirect:'error',signal:AbortSignal.timeout(10000),cf:{cacheTtl:60,cacheEverything:true}});
  if(!upstream.ok)throw Error('Upstream unavailable');
  const payload=await upstream.json();
  if(!validFeed(payload))throw Error('Unconfirmed source format');
  return reply({...base,status:payload.status,updatedAt:payload.updatedAt,results:payload.results,...(payload.referendum?{referendum:payload.referendum}:{})});
 }catch{return reply({...base,status:'source_unavailable',message:'中選會來源暫不可用或格式尚未確認，保留上次資料'},503);}
}

export async function handleVisitors(request,env){
 const headers={'Cache-Control':'no-store','Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Origin':'https://taiwan-election-atlas.pages.dev'};
 const reply=(data,status=200)=>Response.json(data,{status,headers});
 if(!['GET','POST'].includes(request.method))return reply({error:'Method not allowed'},405);
 if(!env.VISITORS)return reply({error:'Counter storage unavailable'},503);
 try{
  if(request.method==='POST'){
   const origin=request.headers.get('Origin');
   if(origin&&origin!=='https://taiwan-election-atlas.pages.dev')return reply({error:'Invalid origin'},403);
   if(!request.headers.get('Content-Type')?.startsWith('application/json'))return reply({error:'Expected JSON'},415);
   if(Number(request.headers.get('Content-Length'))>256)return reply({error:'Payload too large'},413);
   const text=await request.text();if(text.length>256)return reply({error:'Payload too large'},413);
   let payload;try{payload=JSON.parse(text);}catch{return reply({error:'Invalid JSON'},400);}
   if(typeof payload?.id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(payload.id))return reply({error:'Invalid visitor ID'},400);
   const result=await env.VISITORS.batch([env.VISITORS.prepare('INSERT OR IGNORE INTO visitor_ids(id) VALUES (?)').bind(payload.id.toLowerCase()),env.VISITORS.prepare('SELECT total FROM visitor_counter WHERE id=1')]);
   return reply({count:result[1].results[0].total});
  }
  const row=await env.VISITORS.prepare('SELECT total FROM visitor_counter WHERE id=1').first();
  return reply({count:row.total});
 }catch{return reply({error:'Counter temporarily unavailable'},503);}
}
export default {async fetch(request,env){const u=new URL(request.url);if(u.pathname==='/api/visitors')return handleVisitors(request,env);if(u.pathname==='/api/live2026'){if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405});const r=await onRequestGet({env});return request.method==='HEAD'?new Response(null,{status:r.status,headers:r.headers}):r;}return env.ASSETS.fetch(request);}};
