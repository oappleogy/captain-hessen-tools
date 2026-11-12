const el=id=>document.getElementById(id);
const text=(tag,value)=>{const n=document.createElement(tag);n.textContent=value;return n;};
const time=v=>v?new Date(v).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false})+' 北京时间':'未知（未采得可靠时间）';
async function refresh(){
 try{
 const r=await fetch('./monitor.json',{cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);const d=await r.json();
 el('load').textContent=d.status;
 const age=(Date.now()-Date.parse(d.updated_at))/3600000;
 el('freshness').textContent=`页面快照生成：${time(d.updated_at)}；最近研究审核：${time(d.last_research_at)}；固定块元数据时间：${time(d.last_metadata_at)}；最近可靠行情时间：${time(d.last_market_observation_at)}。${age>2?'快照超过2小时未更新，请按陈旧状态阅读。':'页面更新时间不等于行情时间。'}`;
 el('summary').replaceChildren();const metrics=text('div','');metrics.className='metrics';
 for(const [key,label]of [['pool_addresses','目录池地址'],['verified_pairs','身份核验池对'],['two_leg_quotes','双腿规模报价'],['verified_opportunities','已核验机会']]){const a=text('p',label);a.prepend(text('strong',d[key]??'未知'));metrics.append(a);}el('summary').append(metrics);
 el('markets').replaceChildren(...d.markets.map(m=>{const a=text('article','');a.append(text('h3',m.network+' · '+m.asset),text('p',m.pool),text('p','factory 查询费率输入：'+m.fee_input),text('p',m.status));return a;}));
 el('candidates').replaceChildren();if(!d.candidates.length)el('candidates').append(text('p','尚无具备双腿报价的候选。数据不足，不等于全市场没有机会；当前净收益：未知。'));
 else for(const c of d.candidates){const a=text('article','');for(const [label,key]of [['候选','id'],['状态','status'],['方向','direction'],['观察时间','observed_at'],['研究规模','size'],['净边际','net_edge'],['缺失成本','unknown_costs'],['有效期','expires_at'],['失效风险','risks']])a.append(text('p',label+'：'+(c[key]??'未知')));el('candidates').append(a);}
 for(const k of ['gaps','recent','next'])el(k).replaceChildren(...d[k].map(v=>text('li',v)));
 }catch(e){el('load').textContent='监控快照读取失败；下方如有数据为上次已显示内容，不能视为最新。';}
}
el('refresh').addEventListener('click',refresh);refresh();setInterval(refresh,60000);
