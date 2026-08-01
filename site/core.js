(function () {
  "use strict";

  const {
    escapeHTML,
    levelClass,
    levelRank,
    registrationFor,
    registrationButton,
    officialLink,
    setupDialog,
    openDialog
  } = window.Guide;

  const coreItems = Array.isArray(window.CORE_COMPETITIONS) ? [...window.CORE_COMPETITIONS] : [];
  const annualItems = Array.isArray(window.COMPETITIONS) ? window.COMPETITIONS : [];
  const annualMap = window.CORE_TO_ANNUAL || {};
  const groupInfo = {
    "常年主攻": "适合从秋季开始长期建设",
    "精英项目": "适合工程能力较强的少数队伍",
    "成果转投": "适合复用已经完成的课程或社团项目"
  };

  coreItems.sort((a, b) => a.roleOrder - b.roleOrder || levelRank(a.level) - levelRank(b.level) || a.name.localeCompare(b.name, "zh-CN"));
  const groups = coreItems.reduce((map, item) => {
    if (!map.has(item.role)) map.set(item.role, []);
    map.get(item.role).push(item);
    return map;
  }, new Map());

  function annualFor(core) {
    return annualItems.find((item) => item.id === annualMap[core.key]) || {
      id: annualMap[core.key] || "",
      website: core.website,
      registration: core.window,
      latestStatus: "请查看赛事官网的最新通知。"
    };
  }

  function cardHTML(item) {
    const annual = annualFor(item);
    const registration = registrationFor(annual);
    return `
      <article class="core-card">
        <div class="badge-row">
          <span class="badge ${levelClass(item.level)}">${escapeHTML(item.level)}</span>
          <span class="badge">${escapeHTML(item.strategicPosition)}</span>
        </div>
        <h3>${escapeHTML(item.name)}</h3>
        <p class="core-position">${escapeHTML(item.role)}</p>
        <p class="core-why">${escapeHTML(item.why)}</p>
        <div class="core-window"><strong>常见时间</strong>${escapeHTML(item.window)}</div>
        <div class="card-actions">
          <button class="button button-secondary button-small details-button" type="button" data-core-key="${escapeHTML(item.key)}">查看详情</button>
          ${registrationButton(annual)}
          ${officialLink(annual)}
          ${registration.url ? "" : `<p class="registration-hint">${escapeHTML(registration.expectedWindow)}</p>`}
        </div>
      </article>`;
  }

  document.getElementById("core-groups").innerHTML = Array.from(groups.entries()).map(([role, values]) => `
    <section class="core-group" aria-labelledby="group-${escapeHTML(role)}">
      <div class="core-group-heading"><h3 id="group-${escapeHTML(role)}">${escapeHTML(role)}</h3><p>${escapeHTML(groupInfo[role] || "")}</p></div>
      <div class="core-grid">${values.map(cardHTML).join("")}</div>
    </section>`).join("");

  const dialog = document.getElementById("core-dialog");
  setupDialog(dialog);

  function detailItem(title, text, full = false) {
    return `<section class="detail-item ${full ? "full" : ""}"><h3>${escapeHTML(title)}</h3><p>${escapeHTML(text)}</p></section>`;
  }

  function showDetail(key) {
    const item = coreItems.find((candidate) => candidate.key === key);
    if (!item) return;
    const annual = annualFor(item);
    const registration = registrationFor(annual);
    document.getElementById("core-dialog-title").textContent = item.name;
    document.getElementById("core-dialog-badges").innerHTML = `
      <span class="badge ${levelClass(item.level)}">${escapeHTML(item.level)}</span>
      <span class="badge">${escapeHTML(item.role)}</span>`;
    document.getElementById("core-dialog-body").innerHTML = `
      <div class="detail-lead"><strong>${escapeHTML(item.strategicPosition)}</strong><p>${escapeHTML(item.why)}</p></div>
      <div class="detail-grid">
        ${detailItem("重点项目方向", item.projects, true)}
        ${detailItem("什么时候开始", item.start)}
        ${detailItem("怎样组队", item.team)}
        ${detailItem("需要完成什么", item.deliverables, true)}
        <p class="detail-item full"><a class="text-link" href="competitions.html?id=${encodeURIComponent(annual.id)}">查看这项赛事的年度安排 <span aria-hidden="true">→</span></a></p>
      </div>`;
    document.getElementById("core-dialog-footer").innerHTML = `
      ${registrationButton(annual)}
      ${officialLink(annual)}
      <p class="dialog-registration-note">${escapeHTML(registration.expectedWindow)}</p>`;
    openDialog(dialog);
  }

  document.getElementById("core-groups").addEventListener("click", (event) => {
    const button = event.target.closest("[data-core-key]");
    if (button) showDetail(button.dataset.coreKey);
  });
})();
