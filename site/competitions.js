(function () {
  "use strict";

  const {
    escapeHTML,
    cleanIntro,
    levelClass,
    levelRank,
    shanghaiMonth,
    stageFor,
    registrationFor,
    officialLink,
    registrationButton,
    setupDialog,
    openDialog
  } = window.Guide;

  const items = Array.isArray(window.COMPETITIONS) ? window.COMPETITIONS : [];
  const params = new URLSearchParams(window.location.search);
  const initialMonth = params.get("view") === "all" ? null : shanghaiMonth();
  const state = {
    month: initialMonth,
    query: "",
    level: "all",
    category: "all"
  };

  const monthStrip = document.getElementById("month-strip");
  const list = document.getElementById("competition-list");
  const empty = document.getElementById("empty-state");
  const summary = document.getElementById("result-summary");
  const monthHeading = document.getElementById("month-heading");
  const search = document.getElementById("search-input");
  const level = document.getElementById("level-filter");
  const category = document.getElementById("category-filter");
  const dialog = document.getElementById("competition-dialog");
  setupDialog(dialog);

  function monthCount(month) {
    return items.filter((item) => item.startMonth === month).length;
  }

  function renderMonths() {
    monthStrip.innerHTML = Array.from({ length: 12 }, (_, index) => {
      const month = index + 1;
      const active = state.month === month;
      return `<button class="month-button" type="button" data-month="${month}" aria-pressed="${active}"><span>${month}月</span><small>${monthCount(month)}项</small></button>`;
    }).join("");

    window.requestAnimationFrame(() => {
      monthStrip.querySelector('[aria-pressed="true"]')?.scrollIntoView({ block: "nearest", inline: "center" });
    });
  }

  function filteredItems() {
    const keyword = state.query.trim().toLocaleLowerCase("zh-CN");
    return items
      .filter((item) => state.month === null || item.startMonth === state.month)
      .filter((item) => state.level === "all" || item.level === state.level)
      .filter((item) => state.category === "all" || item.categoryKey === state.category)
      .filter((item) => {
        if (!keyword) return true;
        const haystack = [item.name, (window.SEARCH_ALIASES || {})[item.id], item.category, item.intro, item.tasks, item.latestStatus].join(" ").toLocaleLowerCase("zh-CN");
        return haystack.includes(keyword);
      })
      .sort((a, b) => levelRank(a.level) - levelRank(b.level) || a.startMonth - b.startMonth || a.name.localeCompare(b.name, "zh-CN"));
  }

  function cardHTML(item) {
    const stage = stageFor(item, state.month || item.startMonth);
    const registration = registrationFor(item);
    return `
      <article class="competition-card ${item.level === "C" ? "is-c-tier" : ""}">
        <div class="badge-row">
          <span class="badge ${levelClass(item.level)}">${escapeHTML(item.level)}</span>
          <span class="badge">${escapeHTML(item.category)}</span>
          ${item.level === "C" ? '<span class="badge">更多可选</span>' : ""}
        </div>
        <h3>${escapeHTML(item.name)}</h3>
        <p class="card-intro">${escapeHTML(cleanIntro(item.intro))}</p>
        <div class="card-stage">
          <span class="stage-dot ${escapeHTML(stage.tone)}" aria-hidden="true"></span>
          <div><strong>${escapeHTML(stage.label)}</strong><span>${escapeHTML(item.startText)}</span></div>
        </div>
        <div class="card-actions">
          <button class="button button-secondary button-small details-button" type="button" data-detail-id="${escapeHTML(item.id)}">查看详情</button>
          ${registrationButton(item)}
          ${officialLink(item)}
          ${registration.url ? "" : `<p class="registration-hint">${escapeHTML(registration.expectedWindow)}</p>`}
        </div>
      </article>`;
  }

  function render() {
    const visible = filteredItems();
    monthHeading.textContent = state.month === null ? "全年" : `${state.month}月`;
    summary.textContent = `${visible.length} 项符合当前条件`;
    list.innerHTML = visible.map(cardHTML).join("");
    empty.hidden = visible.length > 0;
    list.hidden = visible.length === 0;
    renderMonths();
  }

  function detailItem(title, text, full = false) {
    if (!text) return "";
    return `<section class="detail-item ${full ? "full" : ""}"><h3>${escapeHTML(title)}</h3><p>${escapeHTML(text)}</p></section>`;
  }

  function showDetail(id) {
    const item = items.find((candidate) => candidate.id === id);
    if (!item) return;
    const registration = registrationFor(item);
    document.getElementById("dialog-title").textContent = item.name;
    document.getElementById("dialog-badges").innerHTML = `
      <span class="badge ${levelClass(item.level)}">${escapeHTML(item.level)}</span>
      <span class="badge">${escapeHTML(item.category)}</span>`;
    document.getElementById("dialog-body").innerHTML = `
      <div class="detail-lead"><strong>现在是什么阶段</strong><p>${escapeHTML(item.latestStatus)}</p></div>
      <div class="detail-grid">
        ${detailItem("一般什么时候参加", item.registration, true)}
        ${detailItem("适合做什么", item.tasks, true)}
        ${detailItem("谁可以参加", item.eligibility)}
        ${detailItem("怎么准备", item.preparation)}
        <details class="detail-more"><summary>查看更多赛事说明</summary><p>${escapeHTML(item.competition || "")}</p><p>${escapeHTML(item.resources || "")}</p></details>
      </div>`;
    document.getElementById("dialog-footer").innerHTML = `
      ${registrationButton(item)}
      ${officialLink(item)}
      <p class="dialog-registration-note">${escapeHTML(registration.expectedWindow)}</p>`;
    const nextParams = new URLSearchParams(window.location.search);
    nextParams.set("id", item.id);
    window.history.replaceState(null, "", `${window.location.pathname}?${nextParams.toString()}`);
    openDialog(dialog);
  }

  monthStrip.addEventListener("click", (event) => {
    const button = event.target.closest("[data-month]");
    if (!button) return;
    state.month = Number(button.dataset.month);
    render();
  });

  list.addEventListener("click", (event) => {
    const button = event.target.closest("[data-detail-id]");
    if (button) showDetail(button.dataset.detailId);
  });

  search.addEventListener("input", () => {
    state.query = search.value;
    if (state.query.trim()) state.month = null;
    render();
  });
  level.addEventListener("change", () => {
    state.level = level.value;
    render();
  });
  category.addEventListener("change", () => {
    state.category = category.value;
    render();
  });
  document.getElementById("all-months-button").addEventListener("click", () => {
    state.month = null;
    render();
  });
  document.getElementById("reset-filters").addEventListener("click", () => {
    state.month = shanghaiMonth();
    state.query = "";
    state.level = "all";
    state.category = "all";
    search.value = "";
    level.value = "all";
    category.value = "all";
    render();
  });

  render();
  const requestedId = params.get("id");
  if (requestedId) showDetail(requestedId);
})();
