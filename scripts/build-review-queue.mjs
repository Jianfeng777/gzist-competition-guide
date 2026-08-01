#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { dateValueToTimestamp, isValidDateValue, validateReviewState } from "./validate-review-state.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(scriptDirectory, "..");
const LEVEL_RANK = { "A+": 1, A: 2, "B+": 3, B: 4, C: 5 };
const STATUS_LABELS = { pending: "待审", verified: "已核实", needs_update: "需更新", blocked: "受阻" };
const WEBSITE_LABELS = { verified: "已核实", unverified: "未核实", missing: "缺失" };
const REGISTRATION_LABELS = { open: "开放", closed: "关闭", school: "学校统一报名", unknown: "待确认" };

function todayInShanghai() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function requireValue(values, index, flag) {
  const value = values[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${flag} 需要参数值`);
  return value;
}

function optionalOutputPath(values, index) {
  const value = values[index + 1];
  if (!value || value.startsWith("--")) return { value: null, consumed: false };
  return { value: value === "-" ? null : path.resolve(process.cwd(), value), consumed: true };
}

function parseArguments(values) {
  const options = {
    asOf: todayInShanghai(),
    limit: 50,
    catalog: path.join(projectDirectory, "data", "catalog.json"),
    state: path.join(projectDirectory, "data", "review-state.json"),
    json: undefined,
    markdown: undefined
  };
  for (let index = 0; index < values.length; index += 1) {
    const argument = values[index];
    if (["--as-of", "--limit", "--catalog", "--state"].includes(argument)) {
      const value = requireValue(values, index, argument);
      index += 1;
      if (argument === "--as-of") options.asOf = value;
      else if (argument === "--limit") options.limit = Number(value);
      else options[argument.slice(2)] = path.resolve(process.cwd(), value);
    } else if (argument === "--json" || argument === "--markdown") {
      const output = optionalOutputPath(values, index);
      options[argument.slice(2)] = output.value;
      if (output.consumed) index += 1;
    } else if (argument === "--help" || argument === "-h") {
      options.help = true;
    } else {
      throw new Error(`未知参数：${argument}`);
    }
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(options.asOf) || !isValidDateValue(options.asOf)) throw new Error("--as-of 必须是真实存在的 YYYY-MM-DD 日期");
  if (!Number.isInteger(options.limit) || options.limit < 1 || options.limit > 204) throw new Error("--limit 必须是 1—204 的整数");
  if (options.json === null && options.markdown === null) throw new Error("--json 与 --markdown 同时输出到标准输出时无法区分，请至少为其中一个指定文件路径");
  return options;
}

function printHelp() {
  console.log(`用法：node scripts/build-review-queue.mjs [选项]

默认只在终端打印简要结果，每周目标约 50 项；硬优先项多于 limit 时会全部保留。

选项：
  --as-of YYYY-MM-DD   审查基准日期，默认为上海当天
  --limit <1-204>      目标队列数，默认 50
  --markdown [path]    输出 Markdown；不给路径时写入标准输出
  --json [path]        输出 JSON；不给路径时写入标准输出
  --catalog <path>     指定 catalog.json
  --state <path>       指定 review-state.json
  -h, --help           显示帮助

示例：
  node scripts/build-review-queue.mjs --as-of 2026-08-01 --limit 50 --markdown review-queue.md --json review-queue.json`);
}

function monthContext(asOf) {
  const [year, month] = asOf.split("-").map(Number);
  return {
    currentMonth: month,
    nextMonth: month === 12 ? 1 : month + 1,
    nextMonthYear: month === 12 ? year + 1 : year
  };
}

function buildCandidate(item, review, context, asOfTimestamp) {
  const hardReasons = [];
  const reasons = [];
  let hardScore = 0;
  let softScore = 0;
  let priorityBand = 0;
  const addHard = (label, points) => {
    if (!reasons.includes(label)) reasons.push(label);
    if (!hardReasons.includes(label)) hardReasons.push(label);
    hardScore += points;
  };
  const addSoft = (label, points, band = 1) => {
    if (!reasons.includes(label)) reasons.push(label);
    softScore += points;
    priorityBand = Math.max(priorityBand, band);
  };

  const months = Array.isArray(item.registrationMonths) ? item.registrationMonths : [];
  const lastReviewedTimestamp = review.lastReviewedAt ? dateValueToTimestamp(review.lastReviewedAt) : Number.NEGATIVE_INFINITY;
  const reviewedWithin14Days = Number.isFinite(lastReviewedTimestamp) && lastReviewedTimestamp >= asOfTimestamp - 14 * 24 * 60 * 60 * 1000;
  if (review.nextReviewAt && dateValueToTimestamp(review.nextReviewAt, "23:59:59") <= asOfTimestamp) addHard("到期复核", 1000);
  if (review.status === "needs_update") addHard("状态需更新", 950);
  if (item.registration?.state === "open") addHard("报名开放", 900);
  if (months.includes(context.currentMonth)) {
    if (reviewedWithin14Days) addSoft(`${context.currentMonth}月报名（14天内已审）`, 140, 2);
    else addHard(`${context.currentMonth}月报名`, 800);
  }
  if (months.includes(context.nextMonth)) {
    if (reviewedWithin14Days) addSoft(`${context.nextMonth}月报名（14天内已审）`, 120, 2);
    else addHard(`${context.nextMonth}月报名`, 700);
  }

  if (item.websiteStatus === "missing") addSoft("官网缺失", 240, 4);
  else if (item.websiteStatus === "unverified") addSoft("官网未核实", 220, 4);
  if (item.registration?.state === "unknown") addSoft("报名入口待确认", 190, 3);
  if (item.registrationTimingKind === "unknown" || !months.length) addSoft("报名时间待确认", 170, 3);
  if (review.status === "blocked") addSoft("审查受阻", 200, 3);
  if (review.status === "pending") addSoft(review.lastReviewedAt ? "待审" : "首次待审", 130, 2);
  if (!Array.isArray(item.evidenceLinks) || !item.evidenceLinks.length) addSoft("缺少证据链接", 80, 1);
  if (!reasons.length) reasons.push("常规轮换复核");

  return {
    item,
    review,
    hardPriority: hardReasons.length > 0,
    hardReasons,
    reasons,
    hardScore,
    softScore,
    priorityBand,
    lastReviewedTimestamp
  };
}

function compareCandidates(left, right) {
  if (left.hardPriority !== right.hardPriority) return left.hardPriority ? -1 : 1;
  if (left.hardPriority && left.hardScore !== right.hardScore) return right.hardScore - left.hardScore;
  if (left.priorityBand !== right.priorityBand) return right.priorityBand - left.priorityBand;
  if (left.lastReviewedTimestamp !== right.lastReviewedTimestamp) return left.lastReviewedTimestamp - right.lastReviewedTimestamp;
  if (left.softScore !== right.softScore) return right.softScore - left.softScore;
  return (LEVEL_RANK[left.item.level] || 9) - (LEVEL_RANK[right.item.level] || 9)
    || Number(left.item.catalogNo) - Number(right.item.catalogNo)
    || left.item.id.localeCompare(right.item.id);
}

function serializeCandidate(candidate, rank) {
  const { item, review } = candidate;
  return {
    rank,
    id: item.id,
    name: item.name,
    level: item.level,
    catalogNo: item.catalogNo,
    hardPriority: candidate.hardPriority,
    priority: candidate.hardPriority ? "hard" : candidate.priorityBand >= 3 ? "high" : "normal",
    reasons: candidate.reasons,
    reviewStatus: review.status,
    lastReviewedAt: review.lastReviewedAt,
    nextReviewAt: review.nextReviewAt,
    websiteStatus: item.websiteStatus,
    website: item.website,
    registrationState: item.registration?.state || "unknown",
    registrationUrl: item.registration?.url || null,
    registrationMonths: item.registrationMonths || [],
    registrationTimingKind: item.registrationTimingKind
  };
}

function escapeMarkdown(value) {
  return String(value ?? "").replaceAll("|", "｜").replaceAll("\n", " ");
}

function buildMarkdown(result) {
  const lines = [
    "# 每周竞赛信息审查队列",
    "",
    `- 审查基准日：${result.summary.asOf}`,
    `- 目标数：${result.summary.requestedLimit}`,
    `- 实际队列：${result.summary.actualCount}`,
    `- 硬优先项：${result.summary.hardPriorityCount}`,
    "",
    "> 硬优先项包括：报名开放、当月/下月可报名、已到下次复核日期、或人工标记为需更新。硬优先项不受目标数截断。",
    "> 当月/下月项若 14 天内已完成深度审查，可暂缓以给待确认项留出轮换空间；报名开放项仍每周必审。",
    "",
    "> 本队列用于深度语义审查，不代替 scripts/check-links.mjs 的机器 HTTP 链接检查。",
    "",
    "| # | 优先级 | 等级 | 竞赛 | 触发原因 | 官网 | 报名 | 上次审查 | 下次审查 |",
    "| ---: | --- | --- | --- | --- | --- | --- | --- | --- |"
  ];
  for (const item of result.items) {
    const priority = item.priority === "hard" ? "硬优先" : item.priority === "high" ? "高" : "常规";
    lines.push(`| ${item.rank} | ${priority} | ${escapeMarkdown(item.level)} | ${escapeMarkdown(item.name)} | ${escapeMarkdown(item.reasons.join("、"))} | ${WEBSITE_LABELS[item.websiteStatus] || item.websiteStatus} | ${REGISTRATION_LABELS[item.registrationState] || item.registrationState} | ${item.lastReviewedAt || "从未"} | ${item.nextReviewAt || "未设置"} |`);
  }
  lines.push("", `> 审查状态文件更新于 ${result.summary.stateUpdatedAt}；待确认项按上次审查时间从旧到新轮换。`, "");
  return lines.join("\n");
}

function writeOutput(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${content.replace(/\n?$/, "")}\n`, "utf8");
}

function buildQueue(catalog, state, options) {
  const errors = validateReviewState(state, catalog);
  if (errors.length) throw new Error(`review-state 校验失败：\n- ${errors.join("\n- ")}`);
  const context = monthContext(options.asOf);
  const asOfTimestamp = dateValueToTimestamp(options.asOf, "23:59:59");
  const candidates = catalog.competitions
    .map((item) => buildCandidate(item, state.reviews[item.id], context, asOfTimestamp))
    .sort(compareCandidates);
  const hardCandidates = candidates.filter((candidate) => candidate.hardPriority);
  const softCandidates = candidates.filter((candidate) => !candidate.hardPriority);
  const selected = [...hardCandidates, ...softCandidates.slice(0, Math.max(0, options.limit - hardCandidates.length))]
    .sort(compareCandidates);
  const items = selected.map((candidate, index) => serializeCandidate(candidate, index + 1));
  const reasonCounts = {};
  items.forEach((item) => item.reasons.forEach((reason) => { reasonCounts[reason] = (reasonCounts[reason] || 0) + 1; }));
  return {
    schemaVersion: 1,
    summary: {
      generatedAt: new Date().toISOString(),
      asOf: options.asOf,
      requestedLimit: options.limit,
      actualCount: items.length,
      hardPriorityCount: hardCandidates.length,
      catalogCount: catalog.competitions.length,
      stateUpdatedAt: state.updatedAt,
      currentMonth: context.currentMonth,
      nextMonth: context.nextMonth,
      nextMonthYear: context.nextMonthYear,
      reasonCounts
    },
    items
  };
}

function printBrief(result, outputs = []) {
  const overflow = result.summary.actualCount > result.summary.requestedLimit ? `，因硬优先项超出目标 ${result.summary.actualCount - result.summary.requestedLimit} 项` : "";
  console.log(`审查队列已生成：${result.summary.actualCount} 项（硬优先 ${result.summary.hardPriorityCount} 项）${overflow}。`);
  console.log(`基准日 ${result.summary.asOf}；优先关注 ${result.summary.currentMonth} 月与 ${result.summary.nextMonth} 月报名。`);
  outputs.forEach((output) => console.log(`${output.kind}：${output.path}`));
}

function main() {
  try {
    const options = parseArguments(process.argv.slice(2));
    if (options.help) return printHelp();
    const catalog = JSON.parse(fs.readFileSync(options.catalog, "utf8"));
    const state = JSON.parse(fs.readFileSync(options.state, "utf8"));
    const result = buildQueue(catalog, state, options);
    const jsonText = JSON.stringify(result, null, 2);
    const markdownText = buildMarkdown(result);
    const outputs = [];

    if (typeof options.json === "string") {
      writeOutput(options.json, jsonText);
      outputs.push({ kind: "JSON", path: options.json });
    }
    if (typeof options.markdown === "string") {
      writeOutput(options.markdown, markdownText);
      outputs.push({ kind: "Markdown", path: options.markdown });
    }
    if (options.json === null) console.log(jsonText);
    else if (options.markdown === null) console.log(markdownText);
    else printBrief(result, outputs);
  } catch (error) {
    console.error(`生成审查队列失败：${error.message}`);
    process.exitCode = 1;
  }
}

main();
