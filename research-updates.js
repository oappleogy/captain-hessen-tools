(function () {
  'use strict';
  const cadenceNames = {daily: '每日', weekly: '每周', monthly: '每月', quarterly: '每季'};
  const states = {partial: '已补增量 · 底稿待复核', needs_research: '待补研究', pipeline: '管线运行 · 指标仍需核验', backfill: '已补发旧期 · 后续待补', archive: '历史档案 / 情景模型'};
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function today() {
    const p = new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
    const v = type => p.find(x => x.type === type).value;
    return `${v('year')}-${v('month')}-${v('day')}`;
  }
  function status(t, date = today()) {
    const due = t.next_due < date ? '逾期' : t.next_due === date ? '今日到期' : '已排期';
    return {due, overdue: t.next_due < date, text: states[t.review_state] || '状态待核验'};
  }
  function sorted(topics, key = 'next_due', direction = 1) {
    return [...topics].sort((a,b) => String(a[key] || '').localeCompare(String(b[key] || ''), 'zh-CN') * direction || a.id.localeCompare(b.id));
  }
  function sourceLink(s) {
    if (!/^https:\/\//.test(s.url)) return esc(s.title);
    return `<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)}</a> <small>(${esc(s.date)})</small>`;
  }
  function details(t) {
    const updates = [...t.updates].sort((a,b)=>b.date.localeCompare(a.date)).map(n => `<article class="ru-note"><h4>${esc(n.title)}</h4><p>${esc(n.body)}</p><p class="ru-meta">复核 ${esc(n.date)} · 证据观察期 ${esc(n.source_period)}</p><div class="ru-sources">${n.sources.map(sourceLink).join(' · ')}</div></article>`).join('');
    const checks = (t.checks || []).slice(-3).reverse().map(c=>`<li><b>${esc(c.date)}</b> · ${esc(c.result)}</li>`).join('');
    return `${updates || '<p>尚未补齐新一轮研究。旧数据不可视作当前结论。</p>'}${checks ? `<h4>最近检查（不等于研究已更新）</h4><ul>${checks}</ul>` : ''}<h4>尚待完成</h4><ul>${t.pending.map(p=>`<li>${esc(p)}</li>`).join('')}</ul><details class="ru-rhythm"><summary>日 / 周 / 月 / 季如何更新</summary><dl>${Object.entries(t.schedule).map(([k,v])=>`<dt>${esc(cadenceNames[k])}</dt><dd>${esc(v)}</dd>`).join('')}</dl></details>`;
  }
  function heading(t) {
    const s = status(t);
    return `<div class="ru-label">专题持续跟踪 <span class="ru-badge${s.overdue ? ' ru-overdue' : ''}">${esc(s.due)}</span></div><h2>${esc(t.title)}</h2><p class="ru-meta">${esc(s.text)} · 底稿 ${esc(t.baseline_as_of)} · 增量研究 ${esc(t.last_research_update || '尚未补齐')} · 巡检 ${esc(t.last_checked)} · 下次 ${esc(t.next_due)}</p>`;
  }
  async function init() {
    const board = document.getElementById('research-board');
    let data;
    try {
      const response = await fetch('data/research-topics.json', {cache:'no-store'});
      if (!response.ok) throw new Error('HTTP '+response.status);
      data = await response.json();
      if (!Array.isArray(data.topics)) throw new Error('专题清单格式不正确');
    } catch (e) {
      const warning = document.createElement('aside');
      warning.className = 'ru-panel ru-overdue';
      warning.setAttribute('role','alert');
      warning.textContent = '专题跟踪状态暂时无法加载。请勿将原页历史数据当作最新数据。'+e.message;
      if (board) board.replaceChildren(warning); else document.body.prepend(warning);
      return;
    }
    const page = decodeURIComponent(location.pathname.split('/').pop() || 'index.html');
    if (page === 'index.html') {
      for (const card of document.querySelectorAll('.archive-card')) {
        const t = data.topics.find(t => t.pages.includes(card.getAttribute('href')));
        if (!t) continue;
        const date = card.querySelector('.archive-date');
        if (date) date.textContent = `${cadenceNames[t.cadence]}主更 · ${status(t).text} · 下次 ${t.next_due}`;
      }
      return;
    }
    if (board) {
      const cad = document.getElementById('research-cadence');
      const state = document.getElementById('research-state');
      const query = document.getElementById('research-search');
      const sort = document.getElementById('research-sort');
      function render() {
        const rows = sorted(data.topics.filter(t => (!cad.value || t.cadence === cad.value) && (!state.value || (state.value === 'overdue' ? status(t).overdue : t.review_state === state.value)) && (!query.value || `${t.title} ${t.pending.join(' ')}`.includes(query.value.trim()))), sort.value, sort.value === 'last_research_update' ? -1 : 1);
        document.getElementById('research-count').textContent = `覆盖 ${data.topics.length} 个专题 / ${data.topics.reduce((n,t)=>n+t.pages.length,0)} 个页面 · 本次显示 ${rows.length} 项 · ${data.topics.filter(t=>t.updates.length).length} 项已补增量 · ${data.topics.filter(t=>['needs_research','backfill'].includes(t.review_state)).length} 项待补研究 · ${data.topics.filter(t=>status(t).overdue).length} 项排期逾期`;
        board.innerHTML = rows.map(t => `<section class="ru-panel" id="topic-${esc(t.id)}">${heading(t)}<p><a class="ru-open" href="${esc(t.pages[0])}">打开原专题</a> <span class="ru-meta">${esc(cadenceNames[t.cadence])}主更 · ${esc(t.owner)}</span></p><details class="ru-detail"${location.hash === '#topic-'+t.id ? ' open' : ''}><summary>查看最新证据、缺口和完整排期${t.updates.length ? `（${t.updates.length}条增量）` : ''}</summary>${details(t)}</details></section>`).join('') || '<p>没有匹配的专题。</p>';
      }
      [cad,state,sort].forEach(x=>x.addEventListener('change',render));
      query.addEventListener('input',render);
      render();
      const target = document.getElementById(location.hash.slice(1));
      if (target) target.scrollIntoView();
      return;
    }
    const t = data.topics.find(t => t.pages.includes(page));
    if (!t) return;
    const panel = document.createElement('aside');
    panel.className = 'ru-panel ru-inline';
    panel.setAttribute('aria-label','专题研究时效与跟踪');
    panel.innerHTML = `${heading(t)}<p><strong>以下原页面仍保留历史底稿。新证据不会自动重算旧表格、估值或排名。</strong></p><details class="ru-detail"${t.id === 'robotics' ? ' open' : ''}><summary>查看本次跟踪、待办与更新频率</summary>${details(t)}</details><p><a href="research-schedule.html#topic-${esc(t.id)}">查看全部专题更新计划</a></p>`;
    document.body.prepend(panel);
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = {esc,status,sorted,today};
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init); else init();
  }
})();
