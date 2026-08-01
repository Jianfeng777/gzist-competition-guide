#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(scriptDirectory, "..");
const sourcePath = path.join(projectDirectory, "data", "school-catalog.json");
const catalogPath = path.join(projectDirectory, "data", "catalog.json");
const siteDataPath = path.join(projectDirectory, "site", "data.js");

const document = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(siteDataPath, "utf8"), sandbox, { filename: siteDataPath });

const errors = [];
const competitions = document.competitions;
const allowedLevels = new Set(["A+", "A", "B+", "B", "C"]);
const allowedCategories = new Set(document.categories.map((category) => category.key));
const allowedWebsiteStatuses = new Set(["verified", "unverified", "missing"]);
const allowedRegistrationStates = new Set(["open", "closed", "school", "unknown"]);
const allowedTimingKinds = new Set(["verified_2026", "historical", "unknown"]);

function check(condition, message) {
  if (!condition) errors.push(message);
}

function checkHttps(value, context) {
  if (value !== null && value !== "") check(/^https:\/\//i.test(value), `${context}必须使用 HTTPS：${value}`);
}

check(Array.isArray(competitions), "competitions 必须是数组");
check(competitions.length === 204, `竞赛数量应为 204，实际为 ${competitions.length}`);
check(source.length === 204, `源目录数量应为 204，实际为 ${source.length}`);
check(document.categories.length === 10, `方向分类应为 10，实际为 ${document.categories.length}`);
check(new Set(document.categories.map((category) => category.key)).size === 10, "10 个方向分类 key 必须唯一");

const ids = new Set();
const catalogKeys = new Set();
for (const [index, item] of competitions.entries()) {
  const context = `${item.level}-${item.catalogNo} ${item.name}`;
  const sourceItem = source[index];
  check(Boolean(sourceItem), `${context} 找不到对应源记录`);
  if (sourceItem) {
    check(item.level === sourceItem.level, `${context} level 与源目录不一致`);
    check(item.catalogNo === sourceItem.catalog_no, `${context} catalogNo 与源目录不一致`);
    check(item.name === sourceItem.name, `${context} name 与源目录不一致`);
    check(item.organizer === sourceItem.organizer, `${context} organizer 与源目录不一致`);
    check(item.pdfPage === sourceItem.pdf_page, `${context} pdfPage 与源目录不一致`);
  }
  check(!ids.has(item.id), `重复 id：${item.id}`);
  ids.add(item.id);
  const catalogKey = `${item.level}|${item.catalogNo}`;
  check(!catalogKeys.has(catalogKey), `重复等级+目录号：${catalogKey}`);
  catalogKeys.add(catalogKey);
  check(item.sourceEdition === "2026", `${context} sourceEdition 异常`);
  check(allowedLevels.has(item.level), `${context} 等级不合法`);
  check(Number.isInteger(item.catalogNo) && item.catalogNo > 0, `${context} catalogNo 必须为正整数`);
  check(Number.isInteger(item.pdfPage) && item.pdfPage > 0, `${context} pdfPage 必须为正整数`);
  check(typeof item.organizer === "string" && item.organizer.length > 0, `${context} organizer 缺失`);
  check(allowedCategories.has(item.primaryCategory), `${context} primaryCategory 不合法`);
  check(Array.isArray(item.categoryTags) && item.categoryTags.length > 0, `${context} categoryTags 缺失`);
  for (const category of item.categoryTags) check(allowedCategories.has(category), `${context} categoryTags 包含非法值 ${category}`);
  check(item.categoryTags.includes(item.primaryCategory), `${context} categoryTags 未包含 primaryCategory`);
  check(Array.isArray(item.typeTags) && item.typeTags.length > 0, `${context} typeTags 缺失`);
  check(typeof item.summary === "string" && item.summary.length > 0, `${context} summary 缺失`);
  check(allowedWebsiteStatuses.has(item.websiteStatus), `${context} websiteStatus 不合法`);
  checkHttps(item.website, `${context} website`);
  check(item.websiteStatus !== "verified" || Boolean(item.website), `${context} verified 官网必须有 URL`);
  check(item.websiteStatus === "verified" || !item.website, `${context} 未核验官网不应开放 URL`);
  check(allowedRegistrationStates.has(item.registration?.state), `${context} registration.state 不合法`);
  checkHttps(item.registration?.url, `${context} registration.url`);
  check(item.registration.state !== "open" || Boolean(item.registration.url), `${context} open 报名必须有 URL`);
  check(item.registration.state === "open" || !item.registration.url, `${context} 非 open 报名不应有 URL`);
  check(allowedTimingKinds.has(item.registrationTimingKind), `${context} registrationTimingKind 不合法`);
  check(Array.isArray(item.registrationMonths), `${context} registrationMonths 必须是数组`);
  for (const month of item.registrationMonths) check(Number.isInteger(month) && month >= 1 && month <= 12, `${context} 非法月份 ${month}`);
  check(typeof item.registrationText === "string" && item.registrationText.length > 0, `${context} registrationText 缺失`);
  check(Array.isArray(item.evidenceLinks), `${context} evidenceLinks 必须是数组`);
  for (const link of item.evidenceLinks) {
    checkHttps(link.url, `${context} evidenceLinks`);
    check(["official", "backup"].includes(link.kind), `${context} evidenceLinks.kind 不合法`);
  }
  const firstBackup = item.evidenceLinks.findIndex((link) => link.kind === "backup");
  const lastOfficial = item.evidenceLinks.map((link) => link.kind).lastIndexOf("official");
  check(firstBackup === -1 || lastOfficial < firstBackup, `${context} 官方证据必须排在补充佐证之前`);
}

check(JSON.stringify(sandbox.window.SITE_META) === JSON.stringify(document.siteMeta), "site/data.js 中 SITE_META 与 data/catalog.json 不一致");
check(JSON.stringify(sandbox.window.CATEGORIES) === JSON.stringify(document.categories), "site/data.js 中 CATEGORIES 与 data/catalog.json 不一致");
check(JSON.stringify(sandbox.window.COMPETITIONS) === JSON.stringify(competitions), "site/data.js 中 COMPETITIONS 与 data/catalog.json 不一致");
check(document.siteMeta.counts.total === 204, "SITE_META.counts.total 必须为 204");
check(Object.values(document.siteMeta.counts.levels).reduce((sum, count) => sum + count, 0) === 204, "等级计数之和必须为 204");
check(Object.values(document.siteMeta.counts.categories).reduce((sum, count) => sum + count, 0) === 204, "分类计数之和必须为 204");

if (errors.length) {
  console.error(`竞赛数据校验失败（${errors.length} 项）：`);
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({
    valid: true,
    competitions: competitions.length,
    categories: document.categories.length,
    verifiedWebsites: document.siteMeta.counts.verifiedWebsites,
    openRegistrations: document.siteMeta.counts.openRegistrations,
    evidenceLinks: document.siteMeta.counts.evidenceLinks
  }, null, 2));
}
