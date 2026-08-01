import fs from "node:fs";
import vm from "node:vm";

const args = process.argv.slice(2);
const reportIndex = args.indexOf("--report");
const reportPath = reportIndex >= 0 ? args[reportIndex + 1] : "link-audit.md";
const source = fs.readFileSync(new URL("../site/data.js", import.meta.url), "utf8");
const sandbox = { window: {} };
vm.runInNewContext(source, sandbox, { filename: "site/data.js" });

const competitions = Array.isArray(sandbox.window.COMPETITIONS) ? sandbox.window.COMPETITIONS : [];
const targets = [];

for (const event of competitions) {
  if (event.website && event.websiteStatus === "verified") {
    targets.push({ id: event.id, name: event.name, kind: "赛事官网", url: event.website });
  }
  const entry = event.registration && typeof event.registration === "object" ? event.registration : {};
  if (entry.url) {
    targets.push({ id: event.id, name: event.name, kind: "报名入口", url: entry.url });
  }
}

const uniqueTargets = Array.from(new Map(targets.map((target) => [`${target.kind}:${target.url}`, target])).values());
const hardStatuses = new Set([404, 410]);

async function check(target) {
  let url;
  try {
    url = new URL(target.url);
    if (url.protocol !== "https:") throw new Error("不是 HTTPS 地址");
  } catch (error) {
    return { ...target, result: "broken", detail: error.message };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "gzist-competition-guide-monthly-check/1.0",
        Accept: "text/html,application/xhtml+xml"
      }
    });
    const status = response.status;
    const finalUrl = response.url || target.url;
    try {
      await response.body?.cancel();
    } catch {}

    if (hardStatuses.has(status)) {
      return { ...target, result: "broken", detail: `HTTP ${status}`, finalUrl };
    }
    if (status >= 200 && status < 400) {
      return { ...target, result: "ok", detail: `HTTP ${status}`, finalUrl };
    }
    if ([401, 403, 405, 429].includes(status) || status >= 500) {
      return { ...target, result: "review", detail: `HTTP ${status}，需浏览器人工复核`, finalUrl };
    }
    return { ...target, result: "broken", detail: `HTTP ${status}`, finalUrl };
  } catch (error) {
    const detail = error.name === "AbortError" ? "20秒超时" : error.message;
    return { ...target, result: "review", detail };
  } finally {
    clearTimeout(timer);
  }
}

async function mapLimited(values, limit, mapper) {
  const results = new Array(values.length);
  let cursor = 0;
  async function worker() {
    while (cursor < values.length) {
      const index = cursor++;
      results[index] = await mapper(values[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, worker));
  return results;
}

const results = await mapLimited(uniqueTargets, 6, check);
const counts = results.reduce((map, item) => {
  map[item.result] = (map[item.result] || 0) + 1;
  return map;
}, {});

const lines = [
  "## 自动链接检查",
  "",
  `检查时间：${new Date().toISOString()}`,
  "",
  `共 ${results.length} 个入口：正常 ${counts.ok || 0}，需人工复核 ${counts.review || 0}，明确失效 ${counts.broken || 0}。`,
  "",
  "| 结果 | 类型 | 赛事 | 地址 | 说明 |",
  "| --- | --- | --- | --- | --- |"
];

for (const item of results) {
  const mark = item.result === "ok" ? "正常" : item.result === "review" ? "复核" : "失效";
  const url = item.finalUrl || item.url;
  lines.push(`| ${mark} | ${item.kind} | ${String(item.name).replaceAll("|", "｜")} | ${url} | ${String(item.detail).replaceAll("|", "｜")} |`);
}

lines.push("", "> 自动检查只能发现连接和 HTTP 状态问题；年份、报名是否开放、页面是否仍为主办方官方入口，必须逐页人工复核。", "");
fs.writeFileSync(reportPath, lines.join("\n"));

if ((counts.broken || 0) > 0) process.exitCode = 1;
