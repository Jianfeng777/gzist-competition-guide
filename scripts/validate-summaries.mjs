#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(scriptDirectory, "..");
const catalog = JSON.parse(fs.readFileSync(path.join(projectDirectory, "data", "catalog.json"), "utf8"));

const forbiddenPatterns = [
  /学校2026竞赛目录/,
  /主要归入/,
  /常见参与形式包括/,
  /(?:A\+|A|B\+|B|C)类项目/
];

const errors = [];
const sourceCounts = { verifiedDetail: 0, nameOrTypeRule: 0 };

for (const item of catalog.competitions) {
  const summary = String(item.summary || "");
  if (summary.length < 35 || summary.length > 90) {
    errors.push(`${item.id} 摘要长度为 ${summary.length}，应为 35–90 字`);
  }
  if (/[\r\n]/.test(summary)) errors.push(`${item.id} 摘要中包含换行`);
  if (!summary.endsWith("。")) errors.push(`${item.id} 摘要未以句号结尾`);
  for (const pattern of forbiddenPatterns) {
    if (pattern.test(summary)) errors.push(`${item.id} 摘要仍包含禁用模板句：${pattern}`);
  }
  if (item.detail?.typical_tasks) {
    sourceCounts.verifiedDetail += 1;
    if (/以当届章程为准/.test(summary)) errors.push(`${item.id} 已有典型任务资料，但摘要未使用详情提炼`);
  } else {
    sourceCounts.nameOrTypeRule += 1;
    if (!/以当届章程为准/.test(summary)) errors.push(`${item.id} 缺少详情资料时未保留章程提示`);
  }
}

const report = {
  total: catalog.competitions.length,
  sourceCounts,
  minLength: Math.min(...catalog.competitions.map((item) => item.summary.length)),
  maxLength: Math.max(...catalog.competitions.map((item) => item.summary.length)),
  valid: errors.length === 0,
  errors
};

console.log(JSON.stringify(report, null, 2));
if (errors.length) process.exitCode = 1;
