(function () {
  'use strict';
  const ORIGIN = 'https://tools.basealpha.ai';
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const VERSION = '20261123';

  function pagePath(path) { return path === '/' ? '/index.html' : path; }
  function publicPage(path, config) {
    return /^\/[a-z0-9_-]+\.html$/.test(path) && !path.startsWith('/s2-dash-')
      && Array.isArray(config.pages) && config.pages.includes(path);
  }
  function analyticsAllowed(config, location, navigator, referrer) {
    if (!/^[a-f0-9]{32}$/i.test(config.analytics_token || '') || location.origin !== ORIGIN
        || location.search || navigator.globalPrivacyControl || navigator.doNotTrack === '1') return false;
    if (referrer) {
      try {
        const source = new URL(referrer);
        if (source.origin === ORIGIN && !publicPage(pagePath(source.pathname), config)) return false;
      } catch { return false; }
    }
    return true;
  }
  function loadChoice(storage, key) {
    try {
      const value = JSON.parse(storage.getItem(key));
      if (value && UUID.test(value.id)) return {id: value.id, sent: value.sent === true};
    } catch { /* Storage can be unavailable in private browsing. */ }
    return null;
  }
  function saveChoice(storage, key, choice) {
    try { storage.setItem(key, JSON.stringify(choice)); return true; }
    catch { return false; }
  }
  async function fetchJSON(url, options) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(url, {...options, credentials: 'omit', cache: 'no-store', signal: controller.signal});
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return await response.json();
    } finally { clearTimeout(timer); }
  }
  function countResult(data, page) {
    if (data.page !== page || !Number.isSafeInteger(data.count) || data.count < 0) throw new Error('Invalid count');
    return data.count;
  }

  async function init() {
    if (document.querySelector('basealpha-reader-feedback')) return;
    if (location.origin !== ORIGIN && !['localhost', '127.0.0.1'].includes(location.hostname)) return;
    const page = pagePath(location.pathname);
    if (!/^\/[a-z0-9_-]+\.html$/.test(page) || page.startsWith('/s2-dash-')) return;
    let config;
    try { config = await fetchJSON('/reader-feedback.config.json?v=' + VERSION); }
    catch { return; }
    if (config.enabled !== true || !publicPage(page, config) || config.feedback_endpoint !== '/api/reader-feedback') return;

    if (analyticsAllowed(config, location, navigator, document.referrer)
        && !document.querySelector('script[data-cf-beacon],script[src*="cloudflareinsights.com/beacon"]')) {
      const beacon = document.createElement('script');
      beacon.src = 'https://static.cloudflareinsights.com/beacon.min.js';
      beacon.type = 'module';
      beacon.dataset.cfBeacon = JSON.stringify({token: config.analytics_token});
      document.head.append(beacon);
    }

    const host = document.createElement('basealpha-reader-feedback');
    const shadow = host.attachShadow({mode: 'open'});
    shadow.innerHTML = `<style>
      :host{display:block;max-width:960px;margin:28px auto;padding:0 16px;color:inherit;font:inherit;box-sizing:border-box}
      *{box-sizing:border-box}.panel{border:1px solid color-mix(in srgb,currentColor 22%,transparent);border-radius:12px;padding:18px 20px;background:color-mix(in srgb,currentColor 3%,transparent)}
      .row{display:flex;align-items:center;gap:12px;flex-wrap:wrap}.button{font:inherit;font-size:16px;line-height:1.5;color:inherit;background:transparent;border:1px solid currentColor;border-radius:8px;padding:9px 15px;cursor:pointer;min-height:44px}
      .button:hover:not(:disabled){background:color-mix(in srgb,currentColor 9%,transparent)}.button:focus-visible{outline:3px solid #d38b35;outline-offset:3px}.button:disabled{cursor:default;opacity:.75}
      .count,.status,details{font-size:14px;line-height:1.65}.status{margin:8px 0 0;min-height:1.65em}details{margin-top:6px}summary{cursor:pointer}details p{margin:7px 0 0;max-width:70ch}
      @media(max-width:480px){.panel{padding:16px}.row{align-items:flex-start;flex-direction:column}}
      @media print{:host{display:none}}
    </style><section class="panel" aria-label="读者反馈">
      <div class="row"><button class="button" type="button">这篇对我有帮助</button><span class="count">正在读取反馈…</span></div>
      <p class="status" role="status" aria-live="polite">你的反馈能帮助黑森船长了解哪些整理值得继续。</p>
      <details><summary>匿名反馈与访问统计说明</summary><p>无需登录。反馈只保存本页、反馈时间和防重复的随机标记，不保存姓名、邮箱或 IP。本浏览器会记住本页是否已反馈；清除浏览器数据后可能再次提交，反馈次数不等于独立人数。访问统计沿用本站已有的 Cloudflare 配置，本反馈组件不新增访问追踪。访问次数不等于真人阅读人数，历史统计可能抽样。</p></details>
    </section>`;
    const button = shadow.querySelector('button');
    const count = shadow.querySelector('.count');
    const status = shadow.querySelector('.status');
    let storage;
    try { storage = window.localStorage; } catch { storage = null; }
    const key = 'basealpha:helpful:v1:' + page;
    let choice = loadChoice(storage, key);
    let persisted = Boolean(choice);
    if (choice?.sent) {
      button.textContent = '已收到你的支持';
      button.disabled = true;
      status.textContent = '谢谢！这个浏览器已经为本页留下过反馈。';
    }
    const mount = document.querySelector('main') || document.querySelector('body > .container') || document.body;
    mount.append(host);
    let revision = 0;
    const initialRevision = revision;
    fetchJSON(config.feedback_endpoint + '?page=' + encodeURIComponent(page)).then(data => {
      if (initialRevision === revision) count.textContent = '已收到 ' + countResult(data, page) + ' 次有帮助反馈';
    }).catch(() => { if (initialRevision === revision) count.textContent = '反馈总数暂时无法读取'; });

    button.addEventListener('click', async () => {
      if (button.disabled) return;
      button.disabled = true;
      revision += 1;
      try {
        if (!choice) {
          choice = {id: crypto.randomUUID(), sent: false};
          persisted = saveChoice(storage, key, choice);
        }
        // Save before the request so retries after a lost response stay idempotent.
        button.textContent = '正在记录…';
        status.textContent = '正在确认反馈已保存。';
        const data = await fetchJSON(config.feedback_endpoint, {
          method: 'POST', headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({page, vote_id: choice.id}),
        });
        const total = countResult(data, page);
        if (data.accepted !== true || total < 1) throw new Error('Vote not confirmed');
        choice.sent = true;
        persisted = saveChoice(storage, key, choice) || persisted;
        button.textContent = '已收到你的支持';
        count.textContent = '已收到 ' + total + ' 次有帮助反馈';
        status.textContent = persisted ? '谢谢！这份反馈已经记录。' : '谢谢！已记录。浏览器未允许保存本地标记，刷新后可能无法记住本次选择。';
      } catch {
        button.disabled = false;
        button.textContent = '重试：这篇对我有帮助';
        status.textContent = '暂未确认保存成功，请稍后重试；不会因同一次重试重复计数。';
      }
    });
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = {
    pagePath, publicPage, analyticsAllowed, loadChoice, saveChoice, countResult,
  };
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once: true});
    else init();
  }
})();
