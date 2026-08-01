(function () {
  "use strict";

  const {
    escapeHTML,
    levelClass,
    levelRank,
    shanghaiMonth,
    timingLabel,
    categoryLabel,
    officialButton,
    registrationButton
  } = window.Guide;
  const items = Array.isArray(window.COMPETITIONS) ? window.COMPETITIONS : [];
  const categories = Array.isArray(window.CATEGORIES) ? window.CATEGORIES : [];
  const params = new URLSearchParams(window.location.search);
  const initialMonth = Number(params.get("month"));
  const state = {
    month: initialMonth >= 1 && initialMonth <= 12 ? initialMonth : shanghaiMonth(),
    unknownOnly: params.get("mode") === "unknown",
    query: params.get("q") || "",
    level: params.get("level") || "all",
    category: params.get("category") || "all",
    kind: params.get("kind") || "all"
  };

  const tabs = document.getElementById("month-tabs");
  const search = document.getElementById("calendar-search");
  const level = document.getElementById("calendar-level");
  const category = document.getElementById("calendar-category");
  const kind = document.getElementById("calendar-kind");
  const results = document.getElementById("calendar-results");
  const empty = document.getElementById("calendar-empty");
  search.value = state.query;
  level.value = ["all", "A+", "A", "B+", "B", "C"].includes(state.level) ? state.level : "all";
  state.level = level.value;
  category.insertAdjacentHTML("beforeend", categories.map((item) => `<option value="${escapeHTML(item.key)}">${escapeHTML(item.label)}</option>`).join(""));
  category.value = categories.some((item) => item.key === state.category) ? state.category : "all";
  state.category = category.value;
  kind.value = ["all", "verified_2026", "historical", "unknown"].includes(state.kind) ? state.kind : "all";
  state.kind = kind.value;
  if (state.kind === "unknown") state.unknownOnly = true;

  function registrationMonths(item) {
    return Array.from(new Set((item.registrationMonths || []).map(Number).filter((month) => month >= 1 && month <= 12)));
  }

  function renderMonths() {
    tabs.innerHTML = Array.from({ length: 12 }, (_, index) => {
      const month = index + 1;
      const count = items.filter((item) => registrationMonths(item).includes(month)).length;
      const selected = !state.unknownOnly && state.month === month;
      return `<button type="button" role="tab" data-month="${month}" aria-selected="${selected}"><strong>${month}月</strong><small>${count}项</small></button>`;
    }).join("");
  }

  function searchableText(item) {
    return [item.name, item.organizer, item.summary, categoryLabel(item.primaryCategory), ...(item.typeTags || []), item.registrationText, item.latestStatus, item.detail?.["2026_or_latest_status"]].join(" ").toLocaleLowerCase("zh-CN");
  }

  function filteredItems() {
    const keyword = state.query.trim().toLocaleLowerCase("zh-CN");
    return items
      .filter((item) => state.unknownOnly ? (item.registrationTimingKind || "unknown") === "unknown" : registrationMonths(item).includes(state.month))
      .filter((item) => state.level === "all" || item.level === state.level)
      .filter((item) => state.category === "all" || item.primaryCategory === state.category || (item.categoryTags || []).includes(state.category))
      .filter((item) => state.kind === "all" || (item.registrationTimingKind || "unknown") === state.kind)
      .filter((item) => !keyword || searchableText(item).includes(keyword))
      .sort((a, b) => {
        const timingRank = { verified_2026: 1, historical: 2, unknown: 3 };
        return (timingRank[a.registrationTimingKind] || 3) - (timingRank[b.registrationTimingKind] || 3) || levelRank(a.level) - levelRank(b.level) || a.name.localeCompare(b.name, "zh-CN");
      });
  }

  function itemHTML(item) {
    const timing = timingLabel(item.registrationTimingKind);
    return `<article class="calendar-item">
      <div class="calendar-date-rail"><span class="status-dot ${escapeHTML(timing.tone)}"></span><strong>${escapeHTML(timing.label)}</strong></div>
      <div class="calendar-item-main">
        <div class="tag-row"><span class="level-badge ${levelClass(item.level)}">${escapeHTML(item.level)}</span><span class="tag">${escapeHTML(categoryLabel(item.primaryCategory))}</span>${(item.typeTags || []).slice(0, 1).map((value) => `<span class="tag">${escapeHTML(value)}</span>`).join("")}</div>
        <h3><a href="detail.html?id=${encodeURIComponent(item.id)}">${escapeHTML(item.name)}</a></h3>
        <p class="calendar-summary">${escapeHTML(item.summary || "学校竞赛目录收录项目，具体赛制以当届通知为准。")}</p>
        <div class="registration-copy"><strong>报名时间</strong><p>${escapeHTML(item.registrationText || item.registration?.note || "暂未找到明确报名时间，建议查看学校和主办方新通知。")}</p></div>
      </div>
      <div class="calendar-item-actions"><a class="detail-link" href="detail.html?id=${encodeURIComponent(item.id)}">查看详情<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg></a><div>${registrationButton(item)}${officialButton(item)}</div></div>
    </article>`;
  }

  function updateUrl() {
    const next = new URLSearchParams();
    if (state.unknownOnly) next.set("mode", "unknown");
    else next.set("month", String(state.month));
    if (state.query.trim()) next.set("q", state.query.trim());
    if (state.level !== "all") next.set("level", state.level);
    if (state.category !== "all") next.set("category", state.category);
    if (state.kind !== "all") next.set("kind", state.kind);
    window.history.replaceState(null, "", `${window.location.pathname}?${next}`);
  }

  function render() {
    const visible = filteredItems();
    document.getElementById("selected-month-title").textContent = state.unknownOnly ? "报名时间待确认" : `${state.month}月报名清单`;
    document.getElementById("calendar-summary").textContent = `${visible.length} 项符合当前条件`;
    results.innerHTML = visible.map(itemHTML).join("");
    results.hidden = visible.length === 0;
    empty.hidden = visible.length > 0;
    renderMonths();
    updateUrl();
  }

  function reset() {
    state.month = shanghaiMonth();
    state.unknownOnly = false;
    state.query = "";
    state.level = "all";
    state.category = "all";
    state.kind = "all";
    search.value = "";
    level.value = "all";
    category.value = "all";
    kind.value = "all";
    render();
  }

  tabs.addEventListener("click", (event) => {
    const button = event.target.closest("[data-month]");
    if (!button) return;
    state.month = Number(button.dataset.month);
    state.unknownOnly = false;
    if (state.kind === "unknown") { state.kind = "all"; kind.value = "all"; }
    render();
  });
  search.addEventListener("input", () => { state.query = search.value; render(); });
  level.addEventListener("change", () => { state.level = level.value; render(); });
  category.addEventListener("change", () => { state.category = category.value; render(); });
  kind.addEventListener("change", () => { state.kind = kind.value; state.unknownOnly = state.kind === "unknown"; render(); });
  document.getElementById("unknown-time-button").addEventListener("click", () => { state.unknownOnly = true; state.kind = "unknown"; kind.value = "unknown"; render(); });
  document.getElementById("calendar-reset").addEventListener("click", reset);

  render();
})();
