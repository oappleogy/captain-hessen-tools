import {chainRows} from './chain-rows.mjs';
import {ASSETS,VENUES,loadBook,fill,fresh,compare} from './market.mjs';
import {collectChain} from './chain.bundle.mjs';
const $=id=>document.getElementById(id), esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=(v,d=2)=>Number.isFinite(v)?v.toLocaleString('en-US',{maximumFractionDigits:d,minimumFractionDigits:d}):'—';
const clock=t=>new Date(t).toLocaleTimeString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false});
let books=[],chain=null,chainQ=1,paused=false,busy=false,chainBusy=false,roundAt=null,chainError='',selected='ETH';
$('asset').innerHTML=ASSETS.map(a=>`<option ${a.id===selected?'selected':''}>${a.id}</option>`).join('');
fetch('./modes.json').then(r=>{if(!r.ok)throw Error();return r.json();}).then(d=>{$('mode-list').innerHTML=d.modes.map(m=>`<article><span class="tag ${m.state==='研究框架'?'pending':''}">${esc(m.state)}</span><h3>${esc(m.name)}</h3><p>${esc(m.desc)}</p><p class="watch">${esc(m.watch)}</p><a href="${esc(m.link)}">${esc(m.label)} →</a></article>`).join('');}).catch(()=>{$('mode-list').textContent='模式库加载失败，请刷新页面重试。';});
function render(){
 const now=Date.now();$('refresh').disabled=busy||paused;$('summary').innerHTML=ASSETS.map(a=>{const rows=books.filter(b=>b.asset===a.id),best=compare(rows,a.q,now),count=rows.filter(b=>b.quote==='USDT'&&fresh(b,now)&&fill(b.asks,a.q)&&fill(b.bids,a.q)).length;
 return `<tr><td><button data-asset="${a.id}" aria-label="查看 ${a.id} 场所覆盖">${a.id}</button><small>${num(a.q,a.q<1?2:0)} ${a.id}</small></td><td>${count} / 6</td><td>${best?`${best.buy} → ${best.sell}`:'—'}</td><td class="${best?.bps>0?'positive':''}">${best?num(best.bps)+' bps':'—'}</td><td>${best?num(best.gross):'—'}</td><td>${best?(best.bps>0?'正毛差 · 成本待核':'未见正毛差'):(busy?'采集中 / 数据不足':'无有效双腿')}</td></tr>`;}).join('');
 const q=ASSETS.find(a=>a.id===selected).q;
 $('venues').innerHTML=VENUES.map(v=>{const b=books.find(x=>x.asset===selected&&x.venue===v),ok=b&&fresh(b,now),buy=ok?fill(b.asks,q):null,sell=ok?fill(b.bids,q):null,t=b?.marketAt??b?.receivedAt;
 return `<tr><td><strong>${v}</strong><small>${selected}/${v==='Coinbase'?'USD':'USDT'}</small></td><td>${num(buy?.average,selected==='PEPE'?10:4)}</td><td>${num(sell?.average,selected==='PEPE'?10:4)}</td><td>${t?`${clock(t)} · ${Math.max(0,Math.floor((now-t)/1000))} 秒`:'—'}<small>${b?.marketAt?'盘口时间':'接收时间；源时间未知'}</small></td><td class="${ok?'good':'bad'}">${!b?'待采集':b.status==='error'?esc(b.error):!ok?'已过期':!buy||!sell?'当前规模深度不足':'已返回盘口'}</td><td>未核验<small>按资产 / 网络核验</small></td></tr>`;}).join('');
 $('run-state').textContent=(paused?'已暂停':busy?'采集中':'自动巡航')+(roundAt?` · 上轮完成 ${clock(roundAt)} 北京时间`:'');
 renderChain();
}
function metric(label,value,note){return `<div class="metric"><span>${label}</span><b>${value}</b><small>${note}</small></div>`;}
function renderChain(){
 $('chain-rows').innerHTML=chainRows(chain,books,chainQ).map(r=>`<tr><td><strong>${r.venue}</strong><small>${r.direction==='dex-sell'?'CEX 买 → DEX 卖':'DEX 买 → CEX 卖'} · ${chainQ} ETH</small></td><td>${num(r.input)}</td><td>${num(r.output)}</td><td class="${r.gross>0?'positive':''}">${num(r.gross)}<small>${num(r.bps)} bps</small></td><td>${r.valid?`${r.block}<small>${clock(r.cexTime)} · ${esc(r.cexTimeKind)}</small>`:'—'}</td><td>${esc(r.reason)}</td></tr>`).join('');
 const ok=chain&&Date.now()-chain.blockTime<=60000&&Date.now()-chain.blockTime>=-5000&&Date.now()-chain.receivedAt<=45000;
 $('chain-status').textContent=chainError?`RPC 覆盖缺口：${chainError}`:chain?`${ok?'报价有效':'报价已过期'} · 区块 ${chain.block} · 区块时间 ${clock(chain.blockTime)} 北京时间 · ${chainQ} ETH`:'正在读取公共 RPC…';
 const a=ok?chain.aave:null,venues=books.filter(b=>ok&&b.asset==='ETH'&&b.quote==='USDT'&&fresh(b)&&Math.abs((b.marketAt??b.receivedAt)-chain.blockTime)<=30000);
 let best=null;
 if(ok)for(const b of venues){const buy=fill(b.asks,chainQ),sell=fill(b.bids,chainQ);for(const x of [buy&&chain.sell?{gross:chain.sell.amount-buy.total,input:buy.total,label:`${b.venue} 买入 → 链上卖出`}:null,sell&&chain.buy?{gross:sell.total-chain.buy.amount,input:chain.buy.amount,label:`链上买入 → ${b.venue} 卖出`}:null])if(x){x.bps=x.gross/x.input*10000;if(!best||x.bps>best.bps)best=x;}}
 $('chain-cards').innerHTML=metric('链上卖出所得',ok?num(chain.sell?.amount)+' U':'—',`${chainQ} ETH · U = USDT`)+metric('链上买入成本',ok?num(chain.buy?.amount)+' U':'—','池费 / 价格影响已含；Gas 未含')+metric('链上 / 所内最高毛差',best?num(best.bps)+' bps':'—',best?`${best.label} · ${num(best.gross)} USDT`:'等待同规模、时间匹配的两条腿')+metric('主网参考 Gas',ok?num(chain.gasGwei,3)+' Gwei':'—','不是完整执行费用')+metric('Aave ETH 借款 APR',a?num(a.borrowApr)+'%':'—','当前变量利率，非固定收益')+metric('ETH 可借量上界',a?num(a.availableUpperBound,0)+' ETH':'—','受现金、虚拟余额与借款上限约束')+metric('USDT 抵押 LTV',a?num(a.collateralLtv)+'%':'—',a?(a.newCollateralBorrowEnabled?'新增抵押借款参数允许；仍需个人资格':'不能据此新增抵押借款'):'未取得参数')+metric('ETH 储备状态',a?(a.paused?'暂停':a.frozen?'冻结':!a.active?'不活跃':!a.borrowEnabled?'不可借款':'借款参数开放'):'—','参数开放不代表个人可借');
}
async function refreshChain(){if(chainBusy||paused)return;chainBusy=true;const q=Number($('chain-size').value);try{const c=await collectChain(q);if(Number($('chain-size').value)===q){chain=c;chainQ=q;chainError='';}}catch(e){chain=null;chainError=String(e.message).slice(0,100);}finally{chainBusy=false;renderChain();if(!paused&&Number($('chain-size').value)!==q)refreshChain();}}
async function refresh(){if(busy||paused)return;busy=true;$('refresh').disabled=true;render();const jobs=ASSETS.flatMap(a=>VENUES.map(v=>({a:a.id,v})));let cursor=0;
 // Bounded concurrency; every asset and venue remains visible even when an upstream fails.
 await Promise.all(Array.from({length:7},async()=>{while(cursor<jobs.length&&!paused){const j=jobs[cursor++],b=await loadBook(j.v,j.a);books=books.filter(x=>!(x.asset===j.a&&x.venue===j.v));books.push(b);render();}}));
 roundAt=Date.now();busy=false;$('refresh').disabled=false;render();}
$('pause').onclick=()=>{paused=!paused;$('pause').textContent=paused?'恢复巡航':'暂停巡航';if(!paused){refresh();refreshChain();}render();};
$('refresh').onclick=()=>{refresh();refreshChain();};$('asset').onchange=()=>{selected=$('asset').value;render();};
$('summary').onclick=e=>{const b=e.target.closest('[data-asset]');if(b){selected=b.dataset.asset;$('asset').value=selected;render();document.querySelector('.detail-head').scrollIntoView({behavior:'smooth',block:'start'});}};
$('chain-size').onchange=()=>{chain=null;chainError='';chainQ=Number($('chain-size').value);renderChain();if(!paused){if(chainBusy){$('chain-status').textContent='等待当前 RPC 完成后刷新新规模';}else refreshChain();}};
$('export').onclick=()=>{const payload={exportedAt:new Date().toISOString(),roundAt,mode:'browser_poll',scope:'public_market_only',costs:'unknown',channels:'unknown',books,chain,chainQuantity:chainQ};const u=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=u;a.download='basealpha-arbitrage-snapshot.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);};
render();refresh();refreshChain();setInterval(()=>{refresh();refreshChain();},30000);setInterval(render,1000);
