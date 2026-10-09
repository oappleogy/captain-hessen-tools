(function () {
  'use strict';
  const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function value(row, key) {
    if (key !== 'premium') return row[key] ?? null;
    if (row.nav_status !== 'reported' || !row.nav_date || row.nav_date !== row.price_date ||
        !Number.isFinite(row.nav) || row.nav <= 0 || !Number.isFinite(row.price) || row.price < 0) return null;
    return (row.price / row.nav - 1) * 100;
  }
  function sorted(rows, key, direction) {
    return [...rows].sort((a, b) => {
      const av = value(a, key), bv = value(b, key);
      if (av == null) return bv == null ? 0 : 1;
      if (bv == null) return -1;
      return (typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv), 'zh-CN')) * direction;
    });
  }
  function format(v, kind) {
    if (v == null) return '未核验 / 不计算';
    if (!kind) return esc(v);
    if (!Number.isFinite(v)) return '数值异常';
    const n = v.toLocaleString('en-US', {minimumFractionDigits: kind === 'number' ? 0 : 2, maximumFractionDigits:2});
    return kind === 'usd' ? '$' + n : kind === 'pct' ? (v > 0 ? '+' : '') + n + '%' : n;
  }
  function sources(rows) {
    return rows.map(s => /^https:\/\//.test(s.url) ? `<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)}</a>` : esc(s.title)).join(' · ');
  }
  async function init(panel) {
    try {
      const response = await fetch(panel.dataset.evidence, {cache:'no-store'});
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const d = await response.json();
      if (d.schema_version !== 1 || !d.rows?.length || !d.columns?.length) throw new Error('证据格式异常');
      let key = 'label', direction = 1;
      panel.innerHTML = `<p class="ev-kicker">原始披露核验 · 检查日 ${esc(d.checked_on)}</p><h2>${esc(d.title)}</h2><p>${esc(d.scope)}</p><p class="ev-caption">点击列名排序；缺失值始终置后。观察日与披露日分别保留。</p><div class="ev-scroll"><table><thead><tr>${d.columns.map(c=>`<th scope="col" aria-sort="none"><button type="button" data-key="${esc(c.key)}">${esc(c.label)} <span aria-hidden="true">↕</span></button></th>`).join('')}</tr></thead><tbody></tbody></table></div><div class="ev-findings">${d.rows.map(r=>`<article><h3>${esc(r.label)}</h3>${r.preliminary ? `<p class="ev-warning">管理层初估，非正式季报：${esc(r.preliminary.period_end)} NAV $${esc(r.preliminary.nav_low)}—$${esc(r.preliminary.nav_high)}；公告 ${esc(r.preliminary.announced)}。不与已披露NAV混列，不计算当前溢价。</p>` : ''}<p><strong>已知：</strong>${esc(r.known)}</p>${r.guidance ? `<p><strong>预测 / 指引：</strong>${esc(r.guidance)}</p>` : ''}<p><strong>未知：</strong>${esc(r.unknown)}</p><p><strong>对旧结论的改变（分析）：</strong>${esc(r.impact)}</p><div class="ev-sources">${sources(r.sources)}</div></article>`).join('')}</div><h3>尚待补齐</h3><ul>${d.pending.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`;
      const buttons = [...panel.querySelectorAll('th button')];
      function render() {
        panel.querySelector('tbody').innerHTML = sorted(d.rows, key, direction).map(r=>`<tr>${d.columns.map(c=>`<td>${format(value(r,c.key),c.format)}</td>`).join('')}</tr>`).join('');
        for (const button of buttons) button.parentElement.setAttribute('aria-sort', button.dataset.key === key ? direction === 1 ? 'ascending' : 'descending' : 'none');
      }
      for (const button of buttons) button.addEventListener('click', () => {
        const next = button.dataset.key;
        direction = next === key ? -direction : d.columns.find(c=>c.key === next).format ? -1 : 1;
        key = next;
        render();
      });
      render();
    } catch (error) {
      panel.innerHTML = `<h2>本轮证据暂时无法加载</h2><p role="alert">${esc(error.message)}。下方历史底稿不是最新行情，请勿据此交易。</p>`;
    }
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = {value, sorted, format};
  if (typeof document !== 'undefined') {
    const start = () => document.querySelectorAll('[data-evidence]').forEach(init);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  }
})();
