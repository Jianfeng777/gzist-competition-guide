(function () {
  "use strict";

  const { escapeHTML, cleanIntro, levelClass, levelRank, shanghaiMonth } = window.Guide;
  const items = Array.isArray(window.COMPETITIONS) ? window.COMPETITIONS : [];
  const coreItems = Array.isArray(window.CORE_COMPETITIONS) ? window.CORE_COMPETITIONS : [];
  const month = shanghaiMonth();
  const CLOSED_RE = /已结束|已收官|报名已截止|新报名已结束|报名窗口基本已过/;
  const ACTIVE_RE = /仍可|正在进行|正在组织|已发布|已上线|开放|启动/;

  document.getElementById("annual-count").textContent = String(items.length);
  document.getElementById("core-count").textContent = String(coreItems.length);
  document.getElementById("month-eyebrow").textContent = `${month}月关注`;

  function fallbackFeatures() {
    return items
      .filter((item) => item.startMonth === month || (item.months || []).includes(month))
      .map((item) => ({
        item,
        score:
          (item.startMonth === month ? 50 : 0) +
          (item.priority === "重点" ? 20 : 0) +
          (ACTIVE_RE.test(item.latestStatus || "") ? 12 : 0) -
          (CLOSED_RE.test(item.latestStatus || "") ? 30 : 0) -
          levelRank(item.level)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(({ item }) => ({ id: item.id, action: "查看本月安排", hint: item.startText }));
  }

  const configured = (window.HOME_FEATURES || {})[month] || fallbackFeatures();
  const list = document.getElementById("home-focus-list");
  list.innerHTML = configured.map((feature) => {
    const item = items.find((candidate) => candidate.id === feature.id);
    if (!item) return "";
    return `
      <article class="focus-card">
        <div class="badge-row">
          <span class="badge ${levelClass(item.level)}">${escapeHTML(item.level)}</span>
          <span class="badge">${escapeHTML(item.category)}</span>
        </div>
        <h3>${escapeHTML(item.name)}</h3>
        <p class="focus-action">${escapeHTML(feature.action)}</p>
        <p class="focus-hint">${escapeHTML(feature.hint || cleanIntro(item.intro))}</p>
        <a class="text-link" href="competitions.html?id=${encodeURIComponent(item.id)}">查看详情 <span aria-hidden="true">→</span></a>
      </article>`;
  }).join("");
})();
