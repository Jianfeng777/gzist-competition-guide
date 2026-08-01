#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  REVIEW_FIELDS,
  REVIEW_STATUSES,
  dateValueToTimestamp,
  isHttpsUrl,
  isValidDateValue,
  validateReviewState
} from "./validate-review-state.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(scriptDirectory, "..");

function requireValue(values, index, flag) {
  const value = values[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${flag} 需要参数值`);
  return value;
}

function parseArguments(values) {
  const options = {
    catalog: path.join(projectDirectory, "data", "catalog.json"),
    state: path.join(projectDirectory, "data", "review-state.json"),
    fields: [],
    comments: [],
    evidence: [],
    replaceFields: false,
    clearFields: false,
    json: false,
    dryRun: false
  };
  for (let index = 0; index < values.length; index += 1) {
    const argument = values[index];
    if (["--id", "--status", "--reviewed-at", "--next-review", "--field", "--comment", "--evidence", "--catalog", "--state"].includes(argument)) {
      const value = requireValue(values, index, argument);
      index += 1;
      if (argument === "--field") options.fields.push(value);
      else if (argument === "--comment") options.comments.push(value);
      else if (argument === "--evidence") options.evidence.push(value);
      else if (argument === "--catalog" || argument === "--state") options[argument.slice(2)] = path.resolve(process.cwd(), value);
      else {
        const key = argument === "--reviewed-at" ? "reviewedAt" : argument === "--next-review" ? "nextReview" : argument.slice(2);
        options[key] = value;
      }
    } else if (argument === "--replace-fields") options.replaceFields = true;
    else if (argument === "--clear-fields") options.clearFields = true;
    else if (argument === "--json") options.json = true;
    else if (argument === "--dry-run") options.dryRun = true;
    else if (argument === "--help" || argument === "-h") options.help = true;
    else throw new Error(`未知参数：${argument}`);
  }

  if (options.help) return options;
  if (!options.id) throw new Error("必须提供 --id");
  if (options.status && !REVIEW_STATUSES.has(options.status)) throw new Error(`--status 不合法，可选：${[...REVIEW_STATUSES].join(", ")}`);
  if (options.reviewedAt && !isValidDateValue(options.reviewedAt)) throw new Error("--reviewed-at 必须是有效 ISO 日期或含时区时间");
  if (options.nextReview && options.nextReview !== "none" && !isValidDateValue(options.nextReview)) throw new Error("--next-review 必须是有效 ISO 日期，或 none");
  for (const field of options.fields) if (!REVIEW_FIELDS.has(field)) throw new Error(`--field 不合法：${field}；可选：${[...REVIEW_FIELDS].join(", ")}`);
  for (const comment of options.comments) if (!comment.trim() || comment.length > 2000) throw new Error("--comment 必须为 1—2000 字符");
  for (const url of options.evidence) if (!isHttpsUrl(url)) throw new Error(`--evidence 必须为无账号信息的 HTTPS URL：${url}`);
  if (options.replaceFields && options.clearFields) throw new Error("--replace-fields 与 --clear-fields 不能同时使用");
  return options;
}

function printHelp() {
  console.log(`用法：node scripts/record-review.mjs --id <catalog-id> [选项]

执行一次即记录一次深度语义审查，默认审查时间为当前时间。

选项：
  --id <id>                 竞赛 ID（必填）
  --status <status>         pending | verified | needs_update | blocked
  --reviewed-at <ISO>       审查日期/时间
  --field <name>            标记已审字段，可重复
  --replace-fields          用本次 --field 替换已审字段
  --clear-fields            清空已审字段
  --comment <text>          追加审查注释，可重复
  --evidence <https-url>    追加证据链接，可重复
  --next-review <ISO|none>  设置或清空下次审查日期
  --catalog <path>          指定 catalog.json
  --state <path>            指定 review-state.json
  --dry-run                 只校验并显示结果，不写文件
  --json                    以 JSON 输出更新结果
  -h, --help                显示帮助

可用 --field：
  ${[...REVIEW_FIELDS].join(", ")}

示例：
  node scripts/record-review.mjs --id catalog-a-028 --status verified --field website --field registration --comment "官网与报名入口已逐页核对" --evidence https://example.org/notice --next-review 2026-08-08`);
}

function writeAtomic(filePath, document) {
  const temporaryPath = `${filePath}.${process.pid}.tmp`;
  try {
    fs.writeFileSync(temporaryPath, `${JSON.stringify(document, null, 2)}\n`, "utf8");
    fs.renameSync(temporaryPath, filePath);
  } finally {
    if (fs.existsSync(temporaryPath)) fs.unlinkSync(temporaryPath);
  }
}

function main() {
  try {
    const options = parseArguments(process.argv.slice(2));
    if (options.help) return printHelp();
    const catalog = JSON.parse(fs.readFileSync(options.catalog, "utf8"));
    const state = JSON.parse(fs.readFileSync(options.state, "utf8"));
    const initialErrors = validateReviewState(state, catalog);
    if (initialErrors.length) throw new Error(`现有 review-state 校验失败：\n- ${initialErrors.join("\n- ")}`);
    const competition = catalog.competitions.find((item) => item.id === options.id);
    if (!competition || !Object.hasOwn(state.reviews, options.id)) throw new Error(`未知竞赛 ID：${options.id}`);

    const now = new Date();
    const reviewedAt = options.reviewedAt || now.toISOString();
    const reviewedTimestamp = dateValueToTimestamp(reviewedAt);
    if (reviewedTimestamp > now.getTime() + 5 * 60 * 1000) throw new Error("--reviewed-at 不得晚于当前时间");
    const review = state.reviews[options.id];
    if (review.lastReviewedAt && reviewedTimestamp < dateValueToTimestamp(review.lastReviewedAt)) throw new Error("--reviewed-at 不得早于已记录的 lastReviewedAt");

    const nextReviewAt = options.nextReview === undefined ? review.nextReviewAt : options.nextReview === "none" ? null : options.nextReview;
    if (nextReviewAt && dateValueToTimestamp(nextReviewAt, "23:59:59") < reviewedTimestamp) throw new Error("--next-review 不得早于本次审查时间");

    review.status = options.status || review.status;
    review.lastReviewedAt = reviewedAt;
    review.nextReviewAt = nextReviewAt;
    if (options.clearFields) review.reviewedFields = [];
    else if (options.replaceFields) review.reviewedFields = [...new Set(options.fields)];
    else review.reviewedFields = [...new Set([...review.reviewedFields, ...options.fields])];
    review.comments.push(...options.comments.map((text) => ({ at: reviewedAt, text: text.trim() })));
    review.comments = review.comments.slice(-24);
    for (const url of options.evidence) {
      const existing = review.evidence.find((item) => item.url === url);
      if (existing) existing.at = reviewedAt;
      else review.evidence.push({ at: reviewedAt, url });
    }
    state.updatedAt = now.toISOString();

    const finalErrors = validateReviewState(state, catalog);
    if (finalErrors.length) throw new Error(`更新后 review-state 校验失败：\n- ${finalErrors.join("\n- ")}`);
    if (!options.dryRun) writeAtomic(options.state, state);

    const result = {
      updated: !options.dryRun,
      dryRun: options.dryRun,
      id: options.id,
      name: competition.name,
      review
    };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(`${options.dryRun ? "模拟通过" : "已记录审查"}：${options.id} ${competition.name}（${review.status}）`);
  } catch (error) {
    console.error(`记录审查失败：${error.message}`);
    process.exitCode = 1;
  }
}

main();
