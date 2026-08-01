#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const scriptDirectory = path.dirname(scriptPath);
const projectDirectory = path.resolve(scriptDirectory, "..");

export const REVIEW_STATUSES = new Set(["pending", "verified", "needs_update", "blocked"]);
export const REVIEW_FIELDS = new Set([
  "website",
  "websiteStatus",
  "registration",
  "registrationMonths",
  "registrationText",
  "registrationTimingKind",
  "summary",
  "organizer",
  "categories",
  "types",
  "detail",
  "evidenceLinks"
]);

const TOP_LEVEL_KEYS = ["schemaVersion", "catalogEdition", "updatedAt", "reviews"];
const REVIEW_KEYS = ["status", "lastReviewedAt", "nextReviewAt", "reviewedFields", "comments", "evidence"];
const COMMENT_KEYS = ["at", "text"];
const EVIDENCE_KEYS = ["at", "url"];

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function sameKeys(value, expected) {
  if (!isPlainObject(value)) return false;
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length && actual.every((key, index) => key === wanted[index]);
}

function validCalendarDate(year, month, day) {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function isValidDateValue(value) {
  if (typeof value !== "string") return false;
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dateOnly) {
    return validCalendarDate(Number(dateOnly[1]), Number(dateOnly[2]), Number(dateOnly[3]));
  }
  const dateTime = /^(\d{4})-(\d{2})-(\d{2})T([01]\d|2[0-3]):([0-5]\d):([0-5]\d)(?:\.\d{1,3})?(Z|([+-])(\d{2}):([0-5]\d))$/.exec(value);
  if (!dateTime) return false;
  if (!validCalendarDate(Number(dateTime[1]), Number(dateTime[2]), Number(dateTime[3]))) return false;
  if (dateTime[7] !== "Z") {
    const offsetHour = Number(dateTime[9]);
    const offsetMinute = Number(dateTime[10]);
    if (offsetHour > 14 || (offsetHour === 14 && offsetMinute !== 0)) return false;
  }
  return Number.isFinite(Date.parse(value));
}

export function dateValueToTimestamp(value, dateOnlyTime = "00:00:00") {
  if (!isValidDateValue(value)) return Number.NaN;
  return Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T${dateOnlyTime}+08:00` : value);
}

export function isHttpsUrl(value) {
  if (typeof value !== "string" || !value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && Boolean(url.hostname);
  } catch {
    return false;
  }
}

export function validateReviewState(document, catalog) {
  const errors = [];
  const check = (condition, message) => { if (!condition) errors.push(message); };
  const competitions = Array.isArray(catalog?.competitions) ? catalog.competitions : [];
  const catalogIds = competitions.map((item) => item.id);
  const expectedIds = new Set(catalogIds);

  check(sameKeys(document, TOP_LEVEL_KEYS), `review-state 顶层字段必须且只能为：${TOP_LEVEL_KEYS.join(", ")}`);
  check(document?.schemaVersion === 1, "schemaVersion 必须为 1");
  check(document?.catalogEdition === catalog?.siteMeta?.edition, `catalogEdition 必须与目录版本一致：${catalog?.siteMeta?.edition || "缺失"}`);
  check(isValidDateValue(document?.updatedAt), "updatedAt 必须为真实存在的 ISO 日期或含时区时间");
  check(isPlainObject(document?.reviews), "reviews 必须为以竞赛 ID 为键的对象");
  check(competitions.length === 204, `竞赛目录必须为 204 项，实际为 ${competitions.length}`);
  check(new Set(catalogIds).size === catalogIds.length, "竞赛目录 ID 必须唯一");

  if (!isPlainObject(document?.reviews)) return errors;
  const reviewIds = Object.keys(document.reviews);
  check(reviewIds.length === expectedIds.size, `reviews 必须全覆盖 ${expectedIds.size} 项，实际为 ${reviewIds.length}`);
  for (const id of catalogIds) check(Object.hasOwn(document.reviews, id), `缺少审查记录：${id}`);
  for (const id of reviewIds) check(expectedIds.has(id), `reviews 包含未知竞赛 ID：${id}`);

  const updatedAt = dateValueToTimestamp(document.updatedAt, "23:59:59");
  for (const id of reviewIds) {
    const review = document.reviews[id];
    const context = `${id}`;
    if (!sameKeys(review, REVIEW_KEYS)) {
      errors.push(`${context} 字段必须且只能为：${REVIEW_KEYS.join(", ")}`);
      continue;
    }
    check(REVIEW_STATUSES.has(review.status), `${context} status 不合法：${review.status}`);
    check(review.lastReviewedAt === null || isValidDateValue(review.lastReviewedAt), `${context} lastReviewedAt 必须为 null 或有效 ISO 日期`);
    check(review.nextReviewAt === null || isValidDateValue(review.nextReviewAt), `${context} nextReviewAt 必须为 null 或有效 ISO 日期`);
    if (review.lastReviewedAt && Number.isFinite(updatedAt)) {
      check(dateValueToTimestamp(review.lastReviewedAt) <= updatedAt, `${context} lastReviewedAt 不得晚于 updatedAt`);
    }
    if (review.lastReviewedAt && review.nextReviewAt) {
      check(dateValueToTimestamp(review.nextReviewAt, "23:59:59") >= dateValueToTimestamp(review.lastReviewedAt), `${context} nextReviewAt 不得早于 lastReviewedAt`);
    }

    check(Array.isArray(review.reviewedFields), `${context} reviewedFields 必须为数组`);
    if (Array.isArray(review.reviewedFields)) {
      check(new Set(review.reviewedFields).size === review.reviewedFields.length, `${context} reviewedFields 不得重复`);
      for (const field of review.reviewedFields) check(REVIEW_FIELDS.has(field), `${context} reviewedFields 包含非法字段：${field}`);
    }

    check(Array.isArray(review.comments), `${context} comments 必须为数组`);
    if (Array.isArray(review.comments)) {
      review.comments.forEach((comment, index) => {
        const itemContext = `${context} comments[${index}]`;
        check(sameKeys(comment, COMMENT_KEYS), `${itemContext} 字段必须为 at, text`);
        if (!isPlainObject(comment)) return;
        check(isValidDateValue(comment.at), `${itemContext}.at 不是有效 ISO 日期`);
        check(typeof comment.text === "string" && Boolean(comment.text.trim()) && comment.text.length <= 2000, `${itemContext}.text 必须为 1—2000 字符`);
        if (isValidDateValue(comment.at) && Number.isFinite(updatedAt)) check(dateValueToTimestamp(comment.at) <= updatedAt, `${itemContext}.at 不得晚于 updatedAt`);
      });
    }

    check(Array.isArray(review.evidence), `${context} evidence 必须为数组`);
    if (Array.isArray(review.evidence)) {
      review.evidence.forEach((evidence, index) => {
        const itemContext = `${context} evidence[${index}]`;
        check(sameKeys(evidence, EVIDENCE_KEYS), `${itemContext} 字段必须为 at, url`);
        if (!isPlainObject(evidence)) return;
        check(isValidDateValue(evidence.at), `${itemContext}.at 不是有效 ISO 日期`);
        check(isHttpsUrl(evidence.url), `${itemContext}.url 必须为无账号信息的 HTTPS URL`);
        if (isValidDateValue(evidence.at) && Number.isFinite(updatedAt)) check(dateValueToTimestamp(evidence.at) <= updatedAt, `${itemContext}.at 不得晚于 updatedAt`);
      });
    }
  }
  return errors;
}

function parseArguments(values) {
  const options = {
    catalog: path.join(projectDirectory, "data", "catalog.json"),
    state: path.join(projectDirectory, "data", "review-state.json"),
    json: false
  };
  for (let index = 0; index < values.length; index += 1) {
    const argument = values[index];
    if (argument === "--catalog" || argument === "--state") {
      const value = values[++index];
      if (!value || value.startsWith("--")) throw new Error(`${argument} 需要文件路径`);
      options[argument.slice(2)] = path.resolve(process.cwd(), value);
    } else if (argument === "--json") {
      options.json = true;
    } else if (argument === "--help" || argument === "-h") {
      options.help = true;
    } else {
      throw new Error(`未知参数：${argument}`);
    }
  }
  return options;
}

function printHelp() {
  console.log(`用法：node scripts/validate-review-state.mjs [选项]

选项：
  --catalog <path>  指定 catalog.json
  --state <path>    指定 review-state.json
  --json            以 JSON 输出校验结果
  -h, --help        显示帮助`);
}

function main() {
  try {
    const options = parseArguments(process.argv.slice(2));
    if (options.help) return printHelp();
    const catalog = JSON.parse(fs.readFileSync(options.catalog, "utf8"));
    const state = JSON.parse(fs.readFileSync(options.state, "utf8"));
    const errors = validateReviewState(state, catalog);
    if (errors.length) {
      if (options.json) console.log(JSON.stringify({ valid: false, errors }, null, 2));
      else {
        console.error(`审查状态校验失败（${errors.length} 项）：`);
        errors.forEach((error) => console.error(`- ${error}`));
      }
      process.exitCode = 1;
      return;
    }
    const result = {
      valid: true,
      competitions: catalog.competitions.length,
      reviews: Object.keys(state.reviews).length,
      statuses: Object.fromEntries([...REVIEW_STATUSES].map((status) => [status, Object.values(state.reviews).filter((review) => review.status === status).length]))
    };
    console.log(options.json ? JSON.stringify(result, null, 2) : `审查状态有效：${result.reviews}/${result.competitions} 项全覆盖。`);
  } catch (error) {
    console.error(`校验失败：${error.message}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) main();
