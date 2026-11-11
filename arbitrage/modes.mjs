const $=id=>document.getElementById(id), esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
fetch('./modes.json?v=20261111-mechanisms1').then(r=>{if(!r.ok)throw Error();return r.json();}).then(d=>{
 $('mode-list').innerHTML=d.modes.map(m=>`<article><span class="tag ${m.state==='研究框架'?'pending':''}">${esc(m.state)}</span><h3>${esc(m.name)}</h3><p>${esc(m.desc)}</p><p class="watch">${esc(m.watch)}</p><a href="${esc(m.link)}">${esc(m.label)} →</a></article>`).join('');
 const items=d.mechanisms||[], group=$('mechanism-group'), search=$('mechanism-search');
 for(const name of new Set(items.map(m=>m.group))){const o=document.createElement('option');o.value=name;o.textContent=name;group.append(o)}
 function render(){const q=search.value.trim().toLowerCase(), selected=items.filter(m=>(!group.value||m.group===group.value)&&JSON.stringify(m).toLowerCase().includes(q));
 $('mechanism-count').textContent=`显示 ${selected.length} / ${items.length} 项 · 目录整理：${d.updated_on} · 非行情时间`;
 $('mechanism-list').innerHTML=selected.length?selected.map(m=>`<article id="${esc(m.id)}"><span class="tag pending">${esc(m.group)}</span><h3>${esc(m.name)}</h3><p>${esc(m.mechanism)}</p><p class="mechanism-state">研究状态：${esc(m.status)}</p><p><strong>发现信号：</strong>${esc(m.trigger)}</p><details><summary>验证、风险与分工</summary><p><strong>验证重点：</strong>${esc(m.verification)}</p><p><strong>主要风险：</strong>${esc(m.risks)}</p><p><strong>负责角色：</strong>${esc(m.owner)}</p><p><strong>下一步：</strong>${esc(m.next)}</p><p class="watch">${esc(m.evidence_note)}</p><p>当前净收益：未知；不构成已核验交易机会。</p></details></article>`).join(''):'<p>没有匹配的机制，请调整关键词或类别。</p>';
 }
 search.addEventListener('input',render);group.addEventListener('change',render);render();
}).catch(()=>{for(const id of ['mode-list','mechanism-list'])$(id).textContent='目录加载失败，请刷新页面重试。';});
