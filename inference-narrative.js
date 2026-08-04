const state = { data: null, platform: "Reddit", narrativeFilter: "all" };

const escapeHtml = (value = "") => String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));

function renderNarrativeMetrics() {
  document.querySelector("#narrative-metrics").innerHTML = state.data.narrativeMetrics.map((item) => `
    <article class="narrative-stat ${escapeHtml(item.tone)}">
      <span>${escapeHtml(item.label)}</span><strong>${escapeHtml(item.value)}</strong><small>${escapeHtml(item.note)}</small>
    </article>`).join("");
}

function renderNarratives() {
  const items = state.data.narratives.filter((item) => state.narrativeFilter === "all" || item.type === state.narrativeFilter);
  document.querySelector("#narrative-grid").innerHTML = items.map((item) => `
    <article class="narrative-card ${escapeHtml(item.type)}">
      <div class="narrative-top"><span>${item.type === "positive" ? "强化叙事" : "反叙事"}</span><strong>${item.strength}</strong></div>
      <h3>${escapeHtml(item.title)}</h3>
      <p><b>传播载体</b>${escapeHtml(item.carrier)}</p>
      <p><b>证据锚点</b>${escapeHtml(item.evidence)}</p>
      <p class="risk"><b>失效条件</b>${escapeHtml(item.risk)}</p>
      <div class="strength"><i style="width:${Number(item.strength)}%"></i></div>
    </article>`).join("");
}

function renderSignals() {
  document.querySelector("#hard-signals").innerHTML = state.data.hardSignals.map((item) => `
    <a class="signal" href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">
      <span class="grade">${escapeHtml(item.grade)}</span>
      <div><strong>${escapeHtml(item.value)}</strong><p>${escapeHtml(item.label)}</p><small>${escapeHtml(item.change)}</small></div>
      <em>${escapeHtml(item.source)} ↗</em>
    </a>`).join("");
}

function renderPlatformTabs() {
  const platforms = Object.keys(state.data.social);
  document.querySelector("#platform-tabs").innerHTML = platforms.map((platform) => `<button class="platform-tab ${platform === state.platform ? "is-active" : ""}" data-platform="${escapeHtml(platform)}">${escapeHtml(platform)}</button>`).join("");
  document.querySelectorAll(".platform-tab").forEach((button) => button.addEventListener("click", () => {
    state.platform = button.dataset.platform;
    renderPlatformTabs();
    renderSocial();
  }));
}

function renderSocial() {
  document.querySelector("#social-samples").innerHTML = state.data.social[state.platform].map((item) => `
    <a class="sample ${escapeHtml(item.tone)}" href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">
      <span class="tone-dot"></span><div><div class="sample-title"><strong>${escapeHtml(item.title)}</strong><em>${escapeHtml(item.engagement)}</em></div><p>${escapeHtml(item.detail)}</p></div>
    </a>`).join("");
}

function renderTransmission() {
  document.querySelector("#transmission-grid").innerHTML = state.data.transmission.map((item, index) => `
    <article class="transmission-card">
      <div class="transmission-head"><span>0${index + 1}</span><p>${escapeHtml(item.stage)}</p><strong>${escapeHtml(item.status)}</strong></div>
      <div class="transmission-score"><b>${item.score}</b><div><i style="width:${Number(item.score)}%"></i></div></div>
      <p>${escapeHtml(item.detail)}</p><small>跟踪：${escapeHtml(item.watch)}</small>
    </article>`).join("");
}

function bindNavigation() {
  document.querySelectorAll(".nav-link").forEach((button) => button.addEventListener("click", () => {
    document.querySelector(`#${button.dataset.target}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }));
  const sections = [...document.querySelectorAll(".section-anchor")];
  const observer = new IntersectionObserver((entries) => {
    const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!visible) return;
    document.querySelectorAll(".nav-link").forEach((button) => button.classList.toggle("is-active", button.dataset.target === visible.target.id));
  }, { rootMargin: "-20% 0px -65%", threshold: [0.1, 0.4] });
  sections.forEach((section) => observer.observe(section));
}

function renderApp() {
  const { data } = state;
  document.querySelector("#asof").textContent = `截至 ${data.asOf}`;
  document.querySelector("#footer-date").textContent = data.asOf;
  document.querySelector("#total-score").textContent = data.totalScore;
  document.querySelector("#score-ring").style.setProperty("--score", data.totalScore);
  document.querySelector("#domestic-score").textContent = `${data.scores.domestic}/40`;
  document.querySelector("#adoption-score").textContent = `${data.scores.adoption}/35`;
  document.querySelector("#social-score").textContent = `${data.scores.social}/25`;
  document.querySelector("#verdict strong").textContent = data.verdict.title;
  document.querySelector("#verdict p").textContent = data.verdict.detail;
  renderNarrativeMetrics(); renderNarratives(); renderSignals(); renderPlatformTabs(); renderSocial(); renderTransmission(); bindNavigation();
  document.querySelector("#loading").classList.add("is-hidden");
}

document.querySelectorAll(".filter").forEach((button) => button.addEventListener("click", () => {
  state.narrativeFilter = button.dataset.filter;
  document.querySelectorAll(".filter").forEach((item) => item.classList.toggle("is-active", item === button));
  renderNarratives();
}));

fetch(`inference-narrative-data.json?t=${Date.now()}`, { cache: "no-store" })
  .then((response) => { if (!response.ok) throw new Error("数据载入失败"); return response.json(); })
  .then((data) => { state.data = data; renderApp(); })
  .catch(() => { document.querySelector("#loading p").textContent = "数据暂时无法载入，请稍后刷新"; });
