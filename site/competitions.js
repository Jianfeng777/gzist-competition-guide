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
  const categoryKeys = categories.map((item) => item.key);
  const allTypes = Array.from(new Set(items.flatMap((item) => item.typeTags || []))).sort((a, b) => a.localeCompare(b, "zh-CN"));
  const monthValues = Array.from({ length: 12 }, (_, index) => String(index + 1));
  const validLevels = ["all", "A+", "A", "B+", "B", "C"];

  function readMultiParam(name, allowed) {
    const selected = params.getAll(name)
      .flatMap((value) => value.split(","))
      .map((value) => value.trim())
      .filter((value) => value && value !== "all" && allowed.includes(value));
    return new Set(selected);
  }

  const requestedLevel = params.get("level") || "all";
  const state = {
    query: params.get("q") || "",
    level: validLevels.includes(requestedLevel) ? requestedLevel : "all",
    categories: readMultiParam("category", categoryKeys),
    types: readMultiParam("type", allTypes),
    months: readMultiParam("month", [...monthValues, "unknown"]),
    link: params.get("link") || "all",
    page: Math.max(1, Number(params.get("page")) || 1),
    size: [20, 40, 80].includes(Number(params.get("size"))) ? Number(params.get("size")) : 20
  };

  const search = document.getElementById("search-input");
  const categoryOptions = document.getElementById("category-options");
  const typeOptions = document.getElementById("type-options");
  const monthOptions = document.getElementById("month-options");
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

  function itemMatchesCategory(item, value) {
    return item.primaryCategory === value || (item.categoryTags || []).includes(value);
  }

  function optionHTML(group, value, label, count, checked, index) {
    const id = `${group}-option-${index}`;
    return `<label class="multi-option" for="${id}">
      <input id="${id}" type="checkbox" value="${escapeHTML(value)}" data-filter-group="${group}" ${checked ? "checked" : ""}>
      <span>${escapeHTML(label)}</span><small>${count}</small>
    </label>`;
  }

  function buildFilterOptions() {
    categoryOptions.innerHTML = categories.map((category, index) => optionHTML(
      "category",
      category.key,
      category.label,
      items.filter((item) => itemMatchesCategory(item, category.key)).length,
      state.categories.has(category.key),
      index
    )).join("");

    typeOptions.innerHTML = allTypes.map((type, index) => optionHTML(
      "type",
      type,
      type,
      items.filter((item) => (item.typeTags || []).includes(type)).length,
      state.types.has(type),
      index
    )).join("");

    const monthItems = [
      ...monthValues.map((value) => ({
        value,
        label: `${value}月`,
        count: items.filter((item) => (item.registrationMonths || []).includes(Number(value))).length
      })),
      {
        value: "unknown",
        label: "待确认",
        count: items.filter((item) => !(item.registrationMonths || []).length).length
      }
    ];
    monthOptions.innerHTML = monthItems.map((month, index) => optionHTML(
      "month",
      month.value,
      month.label,
      month.count,
      state.months.has(month.value),
      index
    )).join("");
  }

  const groupConfig = {
    category: {
      values: state.categories,
      allLabel: "全部方向",
      labelFor: (value) => categories.find((item) => item.key === value)?.label || value
    },
    type: {
      values: state.types,
      allLabel: "全部类型",
      labelFor: (value) => value
    },
    month: {
      values: state.months,
      allLabel: "全部月份",
      labelFor: (value) => value === "unknown" ? "待确认" : `${value}月`
    }
  };

  function syncMultiControls() {
    Object.entries(groupConfig).forEach(([group, config]) => {
      document.querySelectorAll(`[data-filter-group="${group}"]`).forEach((input) => {
        input.checked = config.values.has(input.value);
      });
      const summaryNode = document.querySelector(`[data-filter-summary="${group}"]`);
      if (!config.values.size) {
        summaryNode.textContent = config.allLabel;
      } else if (config.values.size === 1) {
        summaryNode.textContent = config.labelFor(Array.from(config.values)[0]);
      } else {
        summaryNode.textContent = `已选 ${config.values.size} 项`;
      }
    });
  }

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
      .filter((item) => !state.categories.size || Array.from(state.categories).some((value) => itemMatchesCategory(item, value)))
      .filter((item) => !state.types.size || Array.from(state.types).some((value) => (item.typeTags || []).includes(value)))
      .filter((item) => {
        if (!state.months.size) return true;
        const itemMonths = item.registrationMonths || [];
        return Array.from(state.months).some((value) => value === "unknown" ? !itemMonths.length : itemMonths.includes(Number(value)));
      })
      .filter((item) => {
        if (state.link === "official") return Boolean(websiteFor(item).url);
        if (state.link === "registration") return Boolean(registrationFor(item).url);
        if (state.link === "missing") return !websiteFor(item).url && !registrationFor(item).url;
        return true;
      })
      .filter((item) => !keyword || searchableText(item).includes(keyword))
      .sort((a, b) => levelRank(a.level) - levelRank(b.level) || Number(a.catalogNo) - Number(b.catalogNo) || a.name.localeCompare(b.name, "zh-CN"));
  }

  function compactMonths(values) {
    const months = Array.from(new Set((values || []).map(Number).filter((value) => value >= 1 && value <= 12))).sort((a, b) => a - b);
    if (!months.length) return "";
    const ranges = [];
    let start = months[0];
    let end = months[0];
    months.slice(1).forEach((month) => {
      if (month === end + 1) {
        end = month;
      } else {
        ranges.push(start === end ? `${start}月` : `${start}—${end}月`);
        start = month;
        end = month;
      }
    });
    ranges.push(start === end ? `${start}月` : `${start}—${end}月`);
    return ranges.join("、");
  }

  function monthTagHTML(item) {
    const months = compactMonths(item.registrationMonths);
    if (!months) return '<span class="tag month-tag is-unknown">待确认</span>';
    const title = item.registrationText || "报名月份以当届通知为准";
    return `<span class="tag month-tag" title="${escapeHTML(title)}">${months}</span>`;
  }

  function tagHTML(item) {
    const values = [categoryLabel(item.primaryCategory), ...(item.typeTags || []).slice(0, 1)];
    return `<div class="tag-row">${values.map((value) => `<span class="tag">${escapeHTML(value)}</span>`).join("")}${monthTagHTML(item)}</div>`;
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

  function appendMultiParams(target, name, values) {
    values.forEach((value) => target.append(name, value));
  }

  function updateUrl() {
    const next = new URLSearchParams();
    if (state.query.trim()) next.set("q", state.query.trim());
    if (state.level !== "all") next.set("level", state.level);
    appendMultiParams(next, "category", state.categories);
    appendMultiParams(next, "type", state.types);
    appendMultiParams(next, "month", state.months);
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
    syncMultiControls();
    updateUrl();
    if (scroll) document.querySelector(".catalog-shell")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function reset() {
    state.query = "";
    state.level = "all";
    state.categories.clear();
    state.types.clear();
    state.months.clear();
    state.link = "all";
    state.page = 1;
    search.value = "";
    linkFilter.value = "all";
    render();
  }

  buildFilterOptions();
  syncMultiControls();

  document.getElementById("level-tabs").addEventListener("click", (event) => {
    const button = event.target.closest("[data-level]");
    if (!button) return;
    state.level = button.dataset.level;
    state.page = 1;
    render();
  });
  search.addEventListener("input", () => { state.query = search.value; state.page = 1; render(); });
  linkFilter.addEventListener("change", () => { state.link = linkFilter.value; state.page = 1; render(); });
  pageSize.addEventListener("change", () => { state.size = Number(pageSize.value); state.page = 1; render(); });

  document.querySelector(".filter-row").addEventListener("change", (event) => {
    const input = event.target.closest("[data-filter-group]");
    if (!input) return;
    const config = groupConfig[input.dataset.filterGroup];
    if (!config) return;
    if (input.checked) config.values.add(input.value);
    else config.values.delete(input.value);
    state.page = 1;
    render();
  });

  document.querySelector(".filter-row").addEventListener("click", (event) => {
    const button = event.target.closest("[data-clear-filter]");
    if (!button) return;
    const config = groupConfig[button.dataset.clearFilter];
    if (!config) return;
    config.values.clear();
    state.page = 1;
    render();
  });

  document.querySelectorAll(".multi-filter").forEach((details) => {
    details.addEventListener("toggle", () => {
      if (!details.open) return;
      document.querySelectorAll(".multi-filter[open]").forEach((other) => {
        if (other !== details) other.open = false;
      });
    });
  });
  document.addEventListener("click", (event) => {
    document.querySelectorAll(".multi-filter[open]").forEach((details) => {
      if (!details.contains(event.target)) details.open = false;
    });
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    document.querySelectorAll(".multi-filter[open]").forEach((details) => { details.open = false; });
  });

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
