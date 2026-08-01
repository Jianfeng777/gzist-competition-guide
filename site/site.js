(function () {
  "use strict";

  const CLOSED_RE = /已结束|已收官|报名已截止|新报名已结束|报名窗口基本已过|完成注册|已到收尾|邀请制/;
  const CONSULT_RE = /补报|须立即咨询|先核实|联系学校|学校统一/;

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
      const url = new URL(String(value));
      return url.protocol === "https:" ? url.href : null;
    } catch {
      return null;
    }
  }

  function cleanIntro(value) {
    return String(value || "").replace(/^(高|中高|中|低)：/, "").trim();
  }

  function levelClass(level) {
    return `badge-level-${String(level).toLowerCase().replace("+", "-plus")}`;
  }

  function levelRank(level) {
    return ({ "A+": 1, A: 2, "B+": 3, B: 4, C: 5 })[level] || 9;
  }

  function shanghaiMonth(date = new Date()) {
    return Number(new Intl.DateTimeFormat("en", {
      timeZone: "Asia/Shanghai",
      month: "numeric"
    }).format(date));
  }

  function stageFor(event, month) {
    const text = `${event.startText || ""} ${event.latestStatus || ""}`;
    if (CONSULT_RE.test(text)) {
      return { label: "先咨询学校", tone: "warning" };
    }
    if (event.startMonth === month && CLOSED_RE.test(text)) {
      return { label: "准备下一届", tone: "neutral" };
    }
    if (event.startMonth === month) {
      return { label: "建议启动", tone: "active" };
    }
    if ((event.months || []).includes(month) && !CLOSED_RE.test(text)) {
      return { label: "正在进行", tone: "active" };
    }
    return { label: "提前了解", tone: "neutral" };
  }

  function registrationFor(event) {
    const manual = (window.REGISTRATION_INFO || {})[event.id];
    if (manual) {
      const url = safeUrl(manual.url);
      return {
        state: manual.state || "unknown",
        url: manual.state === "open" ? url : null,
        label: manual.label || (url ? "立即报名" : "报名暂未开放"),
        expectedWindow: manual.expectedWindow || event.registration || "请留意主办方下一轮通知。"
      };
    }

    const closed = CLOSED_RE.test(`${event.latestStatus || ""} ${event.registration || ""}`);
    return {
      state: closed ? "closed" : "unknown",
      url: null,
      label: closed ? "报名暂未开放" : "报名入口待发布",
      expectedWindow: event.registration || "尚未核实到主办方独立报名入口，请先查看赛事官网。"
    };
  }

  function officialLink(event, label = "赛事官网", extraClass = "") {
    const url = safeUrl(event.website);
    if (!url) {
      return `<span class="button button-secondary button-small ${extraClass}" aria-disabled="true">官网暂不可用</span>`;
    }
    return `<a class="button button-secondary button-small ${extraClass}" href="${escapeHTML(url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(label)} <span aria-hidden="true">↗</span></a>`;
  }

  function registrationButton(event, extraClass = "") {
    const info = registrationFor(event);
    if (info.url && info.state === "open") {
      return `<a class="button button-primary button-small ${extraClass}" href="${escapeHTML(info.url)}" target="_blank" rel="noopener noreferrer">立即报名 <span aria-hidden="true">↗</span></a>`;
    }
    return `<button class="button button-small ${extraClass}" type="button" disabled title="${escapeHTML(info.expectedWindow)}">${escapeHTML(info.label)}</button>`;
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
    const active = document.querySelector(`[data-nav="${page}"]`);
    if (active) active.setAttribute("aria-current", "page");

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
      const shareData = {
        title: document.title,
        text: "广州软件学院学生计算机与人工智能竞赛导航",
        url: window.location.href
      };
      try {
        if (navigator.share) {
          await navigator.share(shareData);
        } else {
          await navigator.clipboard.writeText(window.location.href);
          showToast("页面链接已复制");
        }
      } catch (error) {
        if (error && error.name !== "AbortError") showToast("暂时无法分享，请复制浏览器地址");
      }
    });
  }

  function setupDialog(dialog) {
    if (!dialog) return;
    const closeButton = dialog.querySelector("[data-close-dialog]");
    closeButton?.addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });
    dialog.addEventListener("close", () => document.body.classList.remove("dialog-open"));
  }

  function openDialog(dialog) {
    if (!dialog) return;
    document.body.classList.add("dialog-open");
    dialog.showModal();
  }

  window.Guide = {
    escapeHTML,
    safeUrl,
    cleanIntro,
    levelClass,
    levelRank,
    shanghaiMonth,
    stageFor,
    registrationFor,
    officialLink,
    registrationButton,
    showToast,
    setupDialog,
    openDialog
  };

  setupNavigation();
  setupShare();
})();
