(function () {
  "use strict";

  function escapeHTML(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function safeUrl(value) {
    try {
      const url = new URL(String(value || ""));
      return url.protocol === "https:" ? url.href : null;
    } catch {
      return null;
    }
  }

  function levelRank(level) {
    return ({ "A+": 1, A: 2, "B+": 3, B: 4, C: 5 })[level] || 9;
  }

  function levelClass(level) {
    return `level-${String(level).toLowerCase().replace("+", "-plus")}`;
  }

  function shanghaiMonth(date = new Date()) {
    return Number(new Intl.DateTimeFormat("en", { timeZone: "Asia/Shanghai", month: "numeric" }).format(date));
  }

  function websiteFor(event) {
    const url = safeUrl(event.website || event.official?.url);
    const status = event.websiteStatus || event.official?.state || "missing";
    return {
      url: status === "verified" || status === "available" ? url : null,
      status,
      note: event.websiteNote || event.official?.note || (url ? "官网入口尚待重新核验" : "暂未找到可核验的赛事官网")
    };
  }

  function registrationFor(event) {
    const source = event.registration && typeof event.registration === "object" ? event.registration : {};
    const state = source.state || event.registrationState || "unknown";
    const url = safeUrl(source.url || event.registrationUrl);
    const note = source.note || event.registrationText || event.registrationNote || "暂未核实到独立报名入口，请留意学校和主办方通知。";
    return {
      state,
      url: state === "open" ? url : null,
      note,
      label: source.label || (state === "school" ? "由学校统一报名" : state === "closed" ? "报名暂未开放" : state === "open" && url ? "立即报名" : "报名入口待核实")
    };
  }

  function externalIcon() {
    return '<svg class="button-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M14 5h5v5M19 5l-9 9"/><path d="M18 13v6H5V6h6"/></svg>';
  }

  function officialButton(event, extraClass = "") {
    const info = websiteFor(event);
    if (info.url) {
      return `<a class="button button-secondary button-small ${extraClass}" href="${escapeHTML(info.url)}" target="_blank" rel="noopener noreferrer">赛事官网${externalIcon()}</a>`;
    }
    return `<span class="button button-disabled button-small ${extraClass}" aria-disabled="true" title="${escapeHTML(info.note)}">暂时无官网</span>`;
  }

  function registrationButton(event, extraClass = "") {
    const info = registrationFor(event);
    if (info.url) {
      return `<a class="button button-primary button-small ${extraClass}" href="${escapeHTML(info.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(info.label)}${externalIcon()}</a>`;
    }
    return `<span class="button button-disabled button-small ${extraClass}" aria-disabled="true" title="${escapeHTML(info.note)}">${escapeHTML(info.label)}</span>`;
  }

  function timingLabel(kind) {
    if (kind === "verified_2026") return { label: "2026已核实", tone: "verified" };
    if (kind === "historical") return { label: "往届参考", tone: "reference" };
    return { label: "时间待确认", tone: "unknown" };
  }

  function categoryLabel(key) {
    const category = (window.CATEGORIES || []).find((item) => item.key === key);
    return category?.label || key || "综合类";
  }

  function showToast(message) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.classList.remove("is-visible"), 2600);
  }

  function setupNavigation() {
    const page = document.body.dataset.page;
    document.querySelector(`[data-nav="${page}"]`)?.setAttribute("aria-current", "page");
    const toggle = document.querySelector(".nav-toggle");
    const nav = document.getElementById("primary-nav");
    if (!toggle || !nav) return;
    toggle.addEventListener("click", () => {
      const open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      nav.classList.toggle("is-open", !open);
    });
    nav.addEventListener("click", () => {
      toggle.setAttribute("aria-expanded", "false");
      nav.classList.remove("is-open");
    });
  }

  function setupShare() {
    const button = document.getElementById("share-button");
    if (!button) return;
    button.addEventListener("click", async () => {
      const shareData = { title: document.title, text: "广州软件学院竞赛清单", url: window.location.href };
      try {
        if (navigator.share) await navigator.share(shareData);
        else {
          await navigator.clipboard.writeText(window.location.href);
          showToast("页面链接已复制");
        }
      } catch (error) {
        if (error?.name !== "AbortError") showToast("暂时无法分享，请复制浏览器地址");
      }
    });
  }

  window.Guide = {
    escapeHTML,
    safeUrl,
    levelRank,
    levelClass,
    shanghaiMonth,
    websiteFor,
    registrationFor,
    officialButton,
    registrationButton,
    timingLabel,
    categoryLabel,
    showToast
  };

  setupNavigation();
  setupShare();
})();
