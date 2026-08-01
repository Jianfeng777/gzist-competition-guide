(function () {
  "use strict";

  const {
    escapeHTML,
    levelClass,
    timingLabel,
    categoryLabel,
    officialButton,
    registrationButton,
    websiteFor,
    registrationFor
  } = window.Guide;
  const items = Array.isArray(window.COMPETITIONS) ? window.COMPETITIONS : [];
  const id = new URLSearchParams(window.location.search).get("id");
  const item = items.find((candidate) => candidate.id === id);
  const root = document.getElementById("detail-content");

  if (!item) {
    root.innerHTML = `<section class="not-found"><h1>没有找到这项比赛</h1><p>链接可能来自旧版本清单，或者项目编号已经调整。</p><a class="button button-primary" href="competitions.html">返回竞赛清单</a></section>`;
    return;
  }

  document.title = `${item.name}｜广州软件学院竞赛清单`;
  document.getElementById("breadcrumb-name").textContent = item.name;
  const timing = timingLabel(item.registrationTimingKind);
  const registration = registrationFor(item);
  const website = websiteFor(item);
  const detail = item.detail && typeof item.detail === "object" ? item.detail : {};
  const latestStatus = item.latestStatus || detail["2026_or_latest_status"] || "";
  const months = (item.registrationMonths || []).map(Number).filter((month) => month >= 1 && month <= 12).map((month) => `${month}月`).join("、");

  function section(title, content, fallback) {
    const value = String(content || "").trim();
    return `<section class="detail-section"><h2>${escapeHTML(title)}</h2><p>${escapeHTML(value || fallback)}</p></section>`;
  }

  function evidenceLinks() {
    const raw = Array.isArray(item.evidenceLinks) ? item.evidenceLinks : [];
    const normalized = raw.map((entry, index) => {
      if (typeof entry === "string") return { label: index === 0 ? "赛事相关资料" : `补充资料 ${index + 1}`, url: entry };
      return { label: entry.label || entry.title || `资料 ${index + 1}`, url: entry.url };
    }).filter((entry) => window.Guide.safeUrl(entry.url));
    if (website.url && !normalized.some((entry) => entry.url === website.url)) normalized.unshift({ label: "赛事官网", url: website.url });
    if (!normalized.length) return '<p class="evidence-empty">暂未整理到可核验的公开佐证链接。赛事仍按学校目录保留，建议向学院竞赛负责人查询当届通知。</p>';
    return `<ul class="evidence-list">${normalized.map((entry) => `<li><a href="${escapeHTML(entry.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(entry.label)}<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 5h5v5M19 5l-9 9"/><path d="M18 13v6H5V6h6"/></svg></a></li>`).join("")}</ul>`;
  }

  root.innerHTML = `
    <article class="detail-article">
      <header class="detail-hero">
        <div class="detail-heading">
          <div class="tag-row"><span class="level-badge ${levelClass(item.level)}">${escapeHTML(item.level)}</span><span class="tag">${escapeHTML(categoryLabel(item.primaryCategory))}</span>${(item.typeTags || []).map((value) => `<span class="tag">${escapeHTML(value)}</span>`).join("")}</div>
          <h1>${escapeHTML(item.name)}</h1>
          <p class="detail-summary">${escapeHTML(item.summary || "学校竞赛目录收录项目，暂未完成公开赛事规则核验。")}</p>
          <dl class="detail-meta"><div><dt>主办方</dt><dd>${escapeHTML(item.organizer || "待补充")}</dd></div><div><dt>学校目录编号</dt><dd>${escapeHTML(`${item.level}-${String(item.catalogNo).padStart(2, "0")}`)}</dd></div><div><dt>目录版本</dt><dd>${escapeHTML(item.sourceEdition || window.SITE_META?.editionLabel || "2026年试行版")}</dd></div></dl>
        </div>
        <aside class="detail-action-panel">
          <span class="timing-badge ${escapeHTML(timing.tone)}"><i></i>${escapeHTML(timing.label)}</span>
          <strong>报名信息</strong>
          <p>${escapeHTML(item.registrationText || registration.note)}</p>
          ${months ? `<small>涉及月份：${escapeHTML(months)}</small>` : ""}
          <div class="detail-primary-actions">${registrationButton(item)}${officialButton(item)}</div>
          ${!website.url ? `<p class="action-note">${escapeHTML(website.note)}</p>` : ""}
        </aside>
      </header>

      <div class="detail-content-grid">
        <div>
          ${section("比赛形式与主要内容", item.competitionContent || item.competition || detail.usual_competition || detail.competition || item.intro, "学校目录只提供了赛事名称和主办方，比赛内容仍待补充核验；可先查看学校当届通知。")}
          ${section("常见题目与作品形式", item.typicalTasks || item.tasks || detail.typical_tasks || detail.tasks, "暂未核实到具体赛题或作品要求，不建议仅根据赛事名称猜测；请以主办方发布的赛题、赛道或竞赛规程为准。")}
          ${section("学生可以怎样准备", item.preparation || detail.student_preparation || detail.preparation, "先确认参赛对象与组队方式，再查找最近一届规程和优秀作品；从基础知识、往届题目、作品原型和现场表达四方面准备。")}
          ${section("参赛对象与组队", item.eligibility || detail.eligibility_team || detail.eligibility, "暂未核实到当届参赛资格和组队人数，请向学院竞赛负责人或主办方确认。")}
        </div>
        <aside>
          <section class="detail-side-section"><h2>时间说明</h2><span class="timing-badge ${escapeHTML(timing.tone)}"><i></i>${escapeHTML(timing.label)}</span><p>${escapeHTML(item.registrationText || registration.note)}</p>${latestStatus ? `<p class="latest-status">${escapeHTML(latestStatus)}</p>` : ""}</section>
          <section class="detail-side-section"><h2>佐证与延伸阅读</h2>${evidenceLinks()}</section>
          <section class="detail-side-section source-box"><h2>学校目录来源</h2><p>收录于《广州软件学院大学生综合竞赛目录（2026年试行版）》第 ${escapeHTML(item.pdfPage || "—")} 页。</p><p>目录收录不等同于当届报名已开放；链接和赛程以页面标注的核验状态为准。</p></section>
        </aside>
      </div>
    </article>`;
})();
