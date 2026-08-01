(function () {
  "use strict";

  const {
    escapeHTML,
    levelClass,
    levelRank,
    websiteFor,
    registrationFor,
    officialButton,
    registrationButton,
    categoryLabel
  } = window.Guide;
  const items = Array.isArray(window.COMPETITIONS) ? window.COMPETITIONS : [];
  const categories = Array.isArray(window.CATEGORIES) ? window.CATEGORIES : [];
  const meta = window.SITE_META || {};
  const params = new URLSearchParams(window.location.search);
  const state = {
    query: params.get("q") || "",
    level: params.get("level") || "all",
    category: params.get("category") || "all",
    type: params.get("type") || "all",
    link: params.get("link") || "all",
    page: Math.max(1, Number(params.get("page")) || 1),
    size: [20, 40, 80].includes(Number(params.get("size"))) ? Number(params.get("size")) : 20
  };

  const search = document.getElementById("search-input");
  const categoryFilter = document.getElementById("category-filter");
  const typeFilter = document.getElementById("type-filter");
  const linkFilter = document.getElementById("link-filter");
  const pageSize = document.getElementById("page-size");
  const list = document.getElementById("competition-list");
  const summary = document.getElementById("result-summary");
  const empty = document.getElementById("empty-state");
  const pagination = document.getElementById("pagination");

  document.getElementById("catalog-edition").textContent = meta.editionLabel || "2026年试行版";
  document.getElementById("catalog-total").textContent = String(items.length);
  search.value = state.query;
  pageSize.value = String(state.size);

  categoryFilter.insertAdjacentHTML("beforeend", categories.map((item) => `<option value="${escapeHTML(item.key)}">${escapeHTML(item.label)}</option>`).join(""));
  const allTypes = Array.from(new Set(items.flatMap((item) => item.typeTags || []))).sort((a, b) => a.localeCompare(b, "zh-CN"));
  typeFilter.insertAdjacentHTML("beforeend", allTypes.map((item) => `<option value="${escapeHTML(item)}">${escapeHTML(item)}</option>`).join(""));
  categoryFilter.value = categories.some((item) => item.key === state.category) ? state.category : "all";
  state.category = categoryFilter.value;
  typeFilter.value = allTypes.includes(state.type) ? state.type : "all";
  state.type = typeFilter.value;
  linkFilter.value = ["all", "official", "registration", "missing"].includes(state.link) ? state.link : "all";
  state.link = linkFilter.value;

  const levelCounts = items.reduce((map, item) => {
    map[item.level] = (map[item.level] || 0) + 1;
    return map;
  }, {});
  document.querySelectorAll("[data-level]").forEach((button) => {
    const value = button.dataset.level;
    button.querySelector("small").textContent = String(value === "all" ? items.length : levelCounts[value] || 0);
    button.setAttribute("aria-selected", String(value === state.level));
  });

  function searchableText(item) {
    return [
      item.name,
      item.organizer,
      item.summary,
      item.primaryCategory,
      categoryLabel(item.primaryCategory),
      ...(item.categoryTags || []),
      ...(item.typeTags || []),
      ...(item.aliases || []),
      item.typicalTasks,
      item.preparation,
      item.latestStatus,
      item.detail?.ai_data_relevance,
      item.detail?.usual_competition,
      item.detail?.typical_tasks,
      item.detail?.student_preparation,
      item.detail?.["2026_or_latest_status"]
    ].join(" ").toLocaleLowerCase("zh-CN");
  }

  function filteredItems() {
    const keyword = state.query.trim().toLocaleLowerCase("zh-CN");
    return items
      .filter((item) => state.level === "all" || item.level === state.level)
      .filter((item) => state.category === "all" || item.primaryCategory === state.category || (item.categoryTags || []).includes(state.category))
      .filter((item) => state.type === "all" || (item.typeTags || []).includes(state.type))
      .filter((item) => {
        if (state.link === "official") return Boolean(websiteFor(item).url);
        if (state.link === "registration") return Boolean(registrationFor(item).url);
        if (state.link === "missing") return !websiteFor(item).url && !registrationFor(item).url;
        return true;
      })
      .filter((item) => !keyword || searchableText(item).includes(keyword))
      .sort((a, b) => levelRank(a.level) - levelRank(b.level) || Number(a.catalogNo) - Number(b.catalogNo) || a.name.localeCompare(b.name, "zh-CN"));
  }

  function tagHTML(item) {
    const values = [categoryLabel(item.primaryCategory), ...(item.typeTags || []).slice(0, 1)];
    return `<div class="tag-row">${values.map((value) => `<span class="tag">${escapeHTML(value)}</span>`).join("")}</div>`;
  }

  function statusHTML(item) {
    const official = websiteFor(item);
    const registration = registrationFor(item);
    if (registration.url) return '<span class="entry-status is-open"><i></i>可报名</span>';
    if (official.url) return '<span class="entry-status is-verified"><i></i>官网已核实</span>';
    return '<span class="entry-status is-missing"><i></i>入口待核实</span>';
  }

  function rowHTML(item) {
    return `<article class="catalog-row" role="row">
      <div class="catalog-cell level-cell" role="cell"><span class="level-badge ${levelClass(item.level)}">${escapeHTML(item.level)}</span><small>${escapeHTML(String(item.catalogNo).padStart(2, "0"))}</small></div>
      <div class="catalog-cell name-cell" role="cell"><h3><a href="detail.html?id=${encodeURIComponent(item.id)}">${escapeHTML(item.name)}</a></h3><p>${escapeHTML(item.summary || "学校竞赛目录收录项目，详情以当届通知为准。")}</p></div>
      <div class="catalog-cell tags-cell" role="cell">${tagHTML(item)}</div>
      <div class="catalog-cell organizer-cell" role="cell"><p>${escapeHTML(item.organizer || "主办方信息待补充")}</p></div>
      <div class="catalog-cell links-cell" role="cell">${statusHTML(item)}<div class="compact-actions">${officialButton(item, "button-compact")}${registrationButton(item, "button-compact")}</div></div>
      <div class="catalog-cell action-cell" role="cell"><a class="detail-link" href="detail.html?id=${encodeURIComponent(item.id)}">查看详情<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg></a></div>
    </article>`;
  }

  function paginationHTML(totalPages) {
    if (totalPages <= 1) return "";
    const pages = new Set([1, totalPages, state.page - 1, state.page, state.page + 1]);
    const valid = Array.from(pages).filter((page) => page >= 1 && page <= totalPages).sort((a, b) => a - b);
    const output = [`<button type="button" data-page="${state.page - 1}" ${state.page === 1 ? "disabled" : ""} aria-label="上一页"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5-7 7 7 7"/></svg></button>`];
    valid.forEach((page, index) => {
      if (index > 0 && page - valid[index - 1] > 1) output.push('<span aria-hidden="true">…</span>');
      output.push(`<button type="button" data-page="${page}" ${page === state.page ? 'aria-current="page"' : ""}>${page}</button>`);
    });
    output.push(`<button type="button" data-page="${state.page + 1}" ${state.page === totalPages ? "disabled" : ""} aria-label="下一页"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg></button>`);
    return output.join("");
  }

  function updateUrl() {
    const next = new URLSearchParams();
    if (state.query.trim()) next.set("q", state.query.trim());
    if (state.level !== "all") next.set("level", state.level);
    if (state.category !== "all") next.set("category", state.category);
    if (state.type !== "all") next.set("type", state.type);
    if (state.link !== "all") next.set("link", state.link);
    if (state.page > 1) next.set("page", String(state.page));
    if (state.size !== 20) next.set("size", String(state.size));
    window.history.replaceState(null, "", `${window.location.pathname}${next.size ? `?${next}` : ""}`);
  }

  function render({ scroll = false } = {}) {
    const filtered = filteredItems();
    const totalPages = Math.max(1, Math.ceil(filtered.length / state.size));
    state.page = Math.min(state.page, totalPages);
    const start = (state.page - 1) * state.size;
    const visible = filtered.slice(start, start + state.size);
    summary.textContent = filtered.length ? `共 ${filtered.length} 项，当前显示第 ${start + 1}—${start + visible.length} 项` : "没有匹配项目";
    list.innerHTML = visible.map(rowHTML).join("");
    list.hidden = visible.length === 0;
    empty.hidden = visible.length > 0;
    pagination.innerHTML = paginationHTML(totalPages);
    document.querySelectorAll("[data-level]").forEach((button) => button.setAttribute("aria-selected", String(button.dataset.level === state.level)));
    updateUrl();
    if (scroll) document.querySelector(".catalog-shell")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function reset() {
    state.query = "";
    state.level = "all";
    state.category = "all";
    state.type = "all";
    state.link = "all";
    state.page = 1;
    search.value = "";
    categoryFilter.value = "all";
    typeFilter.value = "all";
    linkFilter.value = "all";
    render();
  }

  document.getElementById("level-tabs").addEventListener("click", (event) => {
    const button = event.target.closest("[data-level]");
    if (!button) return;
    state.level = button.dataset.level;
    state.page = 1;
    render();
  });
  search.addEventListener("input", () => { state.query = search.value; state.page = 1; render(); });
  categoryFilter.addEventListener("change", () => { state.category = categoryFilter.value; state.page = 1; render(); });
  typeFilter.addEventListener("change", () => { state.type = typeFilter.value; state.page = 1; render(); });
  linkFilter.addEventListener("change", () => { state.link = linkFilter.value; state.page = 1; render(); });
  pageSize.addEventListener("change", () => { state.size = Number(pageSize.value); state.page = 1; render(); });
  document.getElementById("reset-filters").addEventListener("click", reset);
  document.getElementById("empty-reset").addEventListener("click", reset);
  pagination.addEventListener("click", (event) => {
    const button = event.target.closest("[data-page]");
    if (!button || button.disabled) return;
    state.page = Number(button.dataset.page);
    render({ scroll: true });
  });

  render();
})();
