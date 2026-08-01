(function () {
  "use strict";

  const { escapeHTML, levelClass, levelRank, registrationFor, officialButton, registrationButton, categoryLabel } = window.Guide;
  const items = Array.isArray(window.COMPETITIONS) ? window.COMPETITIONS : [];
  const categories = Array.isArray(window.CATEGORIES) ? window.CATEGORIES : [];
  const meta = window.SITE_META || {};

  document.getElementById("catalog-count").textContent = String(items.length);
  document.getElementById("category-count").textContent = String(categories.length);
  document.getElementById("edition-label").textContent = meta.editionLabel || "2026 试行版";

  document.getElementById("home-search-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const query = document.getElementById("home-search-input").value.trim();
    window.location.href = query ? `competitions.html?q=${encodeURIComponent(query)}` : "competitions.html";
  });

  const openItems = items
    .filter((item) => registrationFor(item).url && item.registration?.homepageCarousel !== false)
    .sort((a, b) => levelRank(a.level) - levelRank(b.level) || a.name.localeCompare(b.name, "zh-CN"));
  const carousel = document.getElementById("open-carousel");
  const empty = document.getElementById("open-empty");

  if (openItems.length === 0) {
    carousel.hidden = true;
    empty.hidden = false;
  } else {
    carousel.innerHTML = openItems.map((item) => {
      const registration = registrationFor(item);
      return `<article class="open-slide">
        <div class="tag-row"><span class="level-badge ${levelClass(item.level)}">${escapeHTML(item.level)}</span><span class="tag">${escapeHTML(categoryLabel(item.primaryCategory))}</span></div>
        <h3>${escapeHTML(item.name)}</h3>
        ${item.registration?.currentEdition ? `<p class="open-edition">${escapeHTML(item.registration.currentEdition)}</p>` : ""}
        <p class="open-summary">${escapeHTML(item.summary || "查看赛事详情与报名要求。")}</p>
        <div class="open-window"><strong>报名信息</strong><p>${escapeHTML(registration.note)}</p></div>
        <div class="card-actions">
          <a class="button button-secondary button-small" href="detail.html?id=${encodeURIComponent(item.id)}">本地详情</a>
          ${registrationButton(item)}
          ${officialButton(item)}
        </div>
      </article>`;
    }).join("");
  }

  function scrollCarousel(direction) {
    const slide = carousel.querySelector(".open-slide");
    carousel.scrollBy({ left: direction * ((slide?.getBoundingClientRect().width || 360) + 20), behavior: "smooth" });
  }
  document.getElementById("carousel-prev").addEventListener("click", () => scrollCarousel(-1));
  document.getElementById("carousel-next").addEventListener("click", () => scrollCarousel(1));

  const counts = items.reduce((map, item) => {
    map.set(item.primaryCategory, (map.get(item.primaryCategory) || 0) + 1);
    return map;
  }, new Map());
  document.getElementById("home-category-list").innerHTML = categories.map((category) => `
    <a class="category-row" href="competitions.html?category=${encodeURIComponent(category.key)}">
      <div><strong>${escapeHTML(category.label)}</strong><p>${escapeHTML(category.description || "浏览这一方向的学校目录赛事")}</p></div>
      <span>${counts.get(category.key) || 0} 项</span>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M14 7l5 5-5 5"/></svg>
    </a>`).join("");
})();
