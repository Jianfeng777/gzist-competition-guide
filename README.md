# 广州软件学院竞赛清单

这是一个面向广州软件学院全校学生的竞赛信息导航。学生端只有三个主入口：

- 首页：了解网站用途，并横向浏览当前已核实可报名的赛事
- 竞赛清单：按 A+、A、B+、B、C 五个等级查看学校目录全部 204 项赛事
- 报名月历：按报名月份、等级、方向和时间依据筛选赛事

每项赛事另有本地详情页，用于整理比赛内容、常见题目或作品形式、准备建议、参赛对象和佐证链接。资料不足的项目仍保留学校目录基本信息，并明确显示“暂时无官网”或“报名入口待核实”。

## 信息原则

- 学生端完整展示学校 2026 年竞赛目录的 204 个父项，包括 A+、A、B+、B 和 C 类。
- 每个项目保留学校目录的等级、序号、名称、主办方和 PDF 页码，再通过独立覆盖层补充已核验信息。
- 赛事官网只有在既有核验记录能与学校目录父项可靠对应时才开放；研究中的官方页优先放入证据链接，不自动当作学生跳转入口。
- 报名入口与赛事官网分开维护；只有经逐页深度核验为 `open` 且具有 HTTPS 官方报名地址时才可点击。
- 不使用学校喜报、转载通知、搜索结果或聚合页面作为学生入口。
- 学生端月份标签统一表达可参考的报名月份，不在标签外观上区分信息来源；数据层仍保留 `verified_2026`、`historical` 和 `unknown` 等 provenance、核验时间与依据链接，往届规律不表示当前可报名。

## 数据维护

- `data/school-catalog.json`：从学校原始竞赛目录提取的 204 条源数据，不在生成脚本中手工改名。
- `data/verified-details.json`：既有 59 项计算机 / AI 核验信息和 95 条研究记录的覆盖层；多个子赛项会合并回学校目录父项。
- `data/registration-timing.json`：报名月份研究映射；当届月份和往届参考月份分开保存，未研究条目不猜测。
- `data/open-registration.json`：可选的人工复核覆盖，以竞赛 `id` 为键更新 `registration`；没有该文件时仍可正常构建。
- `data/广州软件学院大学生综合竞赛数据库_2026.xlsx`：由同一份生成数据制作的中文筛选表，便于人工复核和交接。
- `data/catalog.json` 和 `site/data.js`：生成结果，不直接手工编辑。

更新源数据或覆盖层后运行：

```bash
node scripts/build-catalog.mjs
node scripts/validate-catalog.mjs
node scripts/validate-summaries.mjs
node scripts/validate-review-state.mjs
node scripts/build-review-queue.mjs --as-of "$(TZ=Asia/Shanghai date +'%Y-%m-%d')" --limit 50 --markdown review-queue.md --json review-queue.json
node scripts/check-links.mjs --report link-audit.md
```

校验会确认总数为 204、`id` 和“等级+序号”唯一、分类与状态枚举合法、所有对外链接为 HTTPS，以及开放报名必须具有 URL。

## 每周自动维护

`.github/workflows/monthly-review.yml` 在每周一上午 08:30（Asia/Shanghai，GitHub cron 为周一 00:30 UTC）执行，也可以通过 `workflow_dispatch` 手动启动。它先做独立的构建、数据和链接健康检查；正常时不创建 Issue，只有检查失败或入口明确失效时才创建当周异常 Issue。09:00 的 Codex 定期任务随后执行深度语义审查并直接更新仓库。自动维护路径为：

1. 从学校目录和已核验覆盖层重建 `catalog.json` 与 `site/data.js`。
2. 校验目录结构、学生端简介、审查状态与信息来源。
3. 生成本周深度语义审查队列，再检查官方赛事主页和当前开放的官方报名入口。
4. Codex 按队列逐项查看官方来源；确定无歧义的变化直接修改源数据、记录审查状态、重建并校验。
5. 正常变更直接提交到 `main` 并由 Pages 发布；只有结构变化、官方信息冲突、验证码/登录阻断或无法确认入口时才创建 Issue 并提醒维护者。

### 异常升级

- HTTP `404` 或 `410` 会使链接检查失败，但仍需确认是入口迁移、届次切换还是页面真正下线。
- HTTP `401`、`403`、`405`、`429`、`5xx`、超时、前端渲染等结果先由 Codex 改用浏览器复核；只有验证码、登录或浏览器仍无法确认时才进入 Issue。
- 目录结构、provenance 或构建校验失败时，工作流会在 Issue 中保留各步结果并标记失败，由维护者人工修复。
- 任何异常都不会自动删除学校竞赛目录项目；在无法确认当届信息时，只关闭官网或报名入口并写明待核实状态。

学生网站位于 `site/`；核验脚本和 GitHub 工作流不会进入学生导航。合并到 `main` 分支后，Pages 工作流会自动发布 `site/`。
