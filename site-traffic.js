(function(){
  'use strict';
  const number=new Intl.NumberFormat('zh-CN');
  const root=document.querySelector('[data-site-traffic]');
  if(!root) return;
  let catalog={};
  let lastData=null;
  function text(selector,value){const node=root.querySelector(selector);if(node)node.textContent=value;}
  function count(name,value){text('[data-metric="'+name+'"]',Number.isSafeInteger(value)&&value>=0?number.format(value):'暂不可用');}
  function date(value){return new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(value));}
  function el(tag,value){const node=document.createElement(tag);if(value!==undefined)node.textContent=value;return node;}
  function dailyRows(analytics){
    const byDay=new Map(analytics.daily.map(x=>[x.date,x]));
    const rows=[];
    for(let ms=Date.parse(analytics.window.start.slice(0,10)+'T00:00:00Z');ms<=Date.parse(analytics.window.end.slice(0,10)+'T00:00:00Z');ms+=86400000){
      const day=new Date(ms).toISOString().slice(0,10);
      rows.push(byDay.get(day)||{date:day,page_views:0,visits:0});
      if(rows.length>32)break;
    }
    return rows;
  }
  function detail(analytics){
    const chart=root.querySelector('[data-traffic-chart]');if(!chart)return;
    chart.replaceChildren();
    const rows=dailyRows(analytics),max=Math.max(1,...rows.map(x=>x.page_views));
    const days=root.querySelector('[data-traffic-days]');days.replaceChildren();
    for(const row of rows){
      const bar=el('span');bar.className='ba-traffic-bar';bar.style.height=Math.max(2,row.page_views/max*100)+'%';bar.dataset.empty=String(row.page_views===0);bar.title=row.date+'：记录到 '+number.format(row.page_views)+' 次浏览';bar.setAttribute('aria-label',bar.title);chart.append(bar);
      const tr=el('tr');tr.append(el('td',row.date));for(const key of ['page_views','visits']){const td=el('td',number.format(row[key]));td.className='numeric';tr.append(td);}days.append(tr);
    }
    text('[data-chart-start]',rows[0]?.date||'');text('[data-chart-end]',rows.at(-1)?.date||'');
    const list=root.querySelector('[data-traffic-pages]');list.replaceChildren();
    for(const row of analytics.top_pages){
      // A second allowlist check keeps unexpected server paths out of links and text.
      if(!Object.hasOwn(catalog,row.path))continue;
      const tr=el('tr'),name=el('td'),link=el('a',catalog[row.path]);link.href=row.path;name.append(link,el('small',row.path));const value=el('td',number.format(row.page_views));value.className='numeric';tr.append(name,value);list.append(tr);
    }
    if(!list.children.length){const tr=el('tr'),td=el('td','当前统计窗口没有可展示的公开页面记录。');td.colSpan=2;tr.append(td);list.append(tr);}
  }
  function render(data){
    if(data.schema_version!==1||data.site!=='tools.basealpha.ai')throw Error('Invalid statistics');
    const a=data.analytics;
    count('helpful',data.feedback?.status==='available'?data.feedback.total:null);
    if(!a){for(const key of ['views','visits','day','week'])count(key,null);text('[data-traffic-status]','访问统计暂时不可用；这不代表没有人访问。');return;}
    count('views',a.totals.page_views);count('visits',a.totals.visits);count('day',a.last_24h.page_views);count('week',a.last_7d.page_views);
    const mode=a.status==='snapshot'?'已读取快照，尚未启用自动更新':a.status==='stale'?'上次有效记录，更新可能延迟':'已更新';
    text('[data-traffic-status]',mode+' · '+date(a.updated_at)+'（北京时间） · 访问数据含抽样，不等于真人数。'+(data.feedback?.status!=='available'?' 反馈总数暂不可用。':''));
    text('[data-refresh-policy]',data.automatic_update?'每次有人打开页面时检查更新，访问统计最多每小时刷新一次；反馈总数在打开时读取。失败保留上次记录和原时间。':'目前显示已读取的真实快照，尚未启用自动更新；不会把快照日期改成今天。反馈总数在打开时读取。');
    detail(a);
  }
  async function json(url){const response=await fetch(url,{credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(18000)});const data=await response.json();if(!response.ok&&!data.analytics&&data.schema_version!==1)throw Error('Unavailable');return data;}
  async function load(retry){
    try{const data=await json('/api/site-traffic');render(data);lastData=data;if(data.refreshing&&!retry)setTimeout(()=>load(true),2500);}
    catch{if(lastData?.analytics){text('[data-traffic-status]','刷新暂未成功，保留 '+date(lastData.analytics.updated_at)+'（北京时间）的有效记录。');return;}for(const name of ['views','visits','helpful','day','week'])count(name,null);text('[data-traffic-status]','统计暂时无法读取，请稍后再试；研究内容不受影响。');text('[data-traffic-pages]','排行暂时无法读取。');}
  }
  async function start(){
    if(root.dataset.siteTraffic==='full'){
      try{catalog=await json('/data/site-traffic-pages.json?v=20261123');}catch{/* Aggregate statistics remain useful if names fail to load. */}
    }
    load(false);
  }
  start();
})();
