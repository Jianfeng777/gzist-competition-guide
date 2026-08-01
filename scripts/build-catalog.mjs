#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(scriptDirectory, "..");
const sourcePath = path.join(projectDirectory, "data", "school-catalog.json");
const overlayPath = path.join(projectDirectory, "data", "verified-details.json");
const timingPath = path.join(projectDirectory, "data", "registration-timing.json");
const openRegistrationPath = path.join(projectDirectory, "data", "open-registration.json");
const catalogPath = path.join(projectDirectory, "data", "catalog.json");
const siteDataPath = path.join(projectDirectory, "site", "data.js");

const SOURCE_EDITION = "2026";
const SOURCE_DATE = "2026-07-31";
const GENERATED_AT = "2026-08-01T00:00:00+08:00";
const SOURCE_TITLE = "广州软件学院大学生综合竞赛目录（2026年）试行版";

const CATEGORIES = [
  {
    key: "innovation",
    label: "创新创业与科创",
    description: "面向科技创新、项目孵化、创业计划与成果转化。"
  },
  {
    key: "computing-ai",
    label: "计算机、软件与人工智能",
    description: "涵盖程序设计、软件工程、网络安全、数字媒体与人工智能。"
  },
  {
    key: "electronics-robotics",
    label: "电子信息、机器人与智能制造",
    description: "面向电子设计、芯片与嵌入式系统、通信、机器人及智能制造。"
  },
  {
    key: "business-finance",
    label: "商业、管理与财经",
    description: "涵盖商业策划、电子商务、供应链、财会税、金融与人力资源。"
  },
  {
    key: "design-media",
    label: "设计、艺术与数字媒体",
    description: "面向视觉设计、广告、动漫游戏、数字内容、音乐舞蹈与舞台表演。"
  },
  {
    key: "languages-humanities",
    label: "外语、人文与文化",
    description: "涵盖外语能力、翻译、演讲写作、经典文化与人文素养。"
  },
  {
    key: "math-data",
    label: "数学、统计与数据科学",
    description: "面向数学建模、统计分析、数据挖掘、预测与决策。"
  },
  {
    key: "architecture-environment",
    label: "建筑、工程与环境",
    description: "涵盖建筑信息化、机械与工业设计、园林人居、节能环保与工程实践。"
  },
  {
    key: "social-career",
    label: "社会实践、职业发展与公共素养",
    description: "面向职业规划、社会调研、乡村实践、科普、法治与校园文化。"
  },
  {
    key: "sports-health",
    label: "体育竞技与身心健康",
    description: "涵盖综合体育、专项运动、群体活动与心理健康。"
  }
];

const CATEGORY_RULES = [
  {
    key: "sports-health",
    terms: [["心理健康", 8], ["体育舞蹈", 8], ["体育", 6], ["运动会", 6], ["锦标赛", 2], ["啦啦操", 7], ["马拉松", 8], ["自行车", 7], ["街舞", 6]]
  },
  {
    key: "languages-humanities",
    terms: [["英语", 7], ["日语", 7], ["外语", 7], ["翻译", 7], ["演讲", 5], ["写作", 5], ["词汇", 6], ["诵写讲", 8], ["诵读", 6], ["书写", 5], ["篆刻", 6], ["普通话", 7], ["双语", 6], ["中国故事", 6], ["中华经典", 7], ["征文", 4], ["品书知日本", 7]]
  },
  {
    key: "math-data",
    terms: [["数学建模", 10], ["建模", 6], ["数学", 6], ["统计", 6], ["数据挖掘", 8], ["数据分析", 7], ["大数据", 4], ["数据处理", 5], ["数智", 2]]
  },
  {
    key: "architecture-environment",
    terms: [["BIM", 8], ["建筑", 7], ["建造", 7], ["机械", 6], ["园林", 7], ["人居环境", 8], ["景观", 6], ["节能减排", 9], ["环境", 4], ["绿色", 3], ["工业设计", 7]]
  },
  {
    key: "electronics-robotics",
    terms: [["机器人", 9], ["智能汽车", 9], ["电子设计", 8], ["电子信息", 7], ["嵌入式", 8], ["芯片", 8], ["集成电路", 8], ["物联网", 8], ["智能制造", 9], ["智能硬件", 8], ["信息通信", 7], ["通信技术", 7], ["ICT", 6], ["Open Harmony", 7], ["OpenHarmony", 7]]
  },
  {
    key: "computing-ai",
    terms: [["计算机", 8], ["软件", 8], ["程序设计", 8], ["算法", 8], ["人工智能", 9], ["AIGC", 9], ["AI", 6], ["网络安全", 8], ["信息安全", 8], ["网络空间安全", 8], ["程序", 6], ["算机", 5], ["ICPC", 8], ["ACM", 7], ["IT ", 5], ["应用系统开发", 7], ["软件测试", 8], ["数字媒体科技", 5]]
  },
  {
    key: "business-finance",
    terms: [["电子商务", 8], ["跨境电商", 8], ["商务", 6], ["商业", 6], ["物流", 8], ["供应链", 8], ["会计", 8], ["财务", 8], ["财经", 7], ["财税", 8], ["税务", 8], ["金融", 8], ["市场调查", 8], ["市场营销", 8], ["品牌策划", 7], ["商务谈判", 7], ["企业", 4], ["人力资源", 8], ["旅游", 6], ["会展", 7], ["审计", 8], ["经济学", 8], ["公关", 6], ["外贸", 7]]
  },
  {
    key: "design-media",
    terms: [["数字艺术", 9], ["动漫", 8], ["动画", 8], ["游戏", 8], ["广告", 7], ["美术", 8], ["音乐", 8], ["舞蹈", 6], ["戏剧", 8], ["合唱", 8], ["主持", 7], ["短视频", 7], ["包装", 7], ["设计奖", 7], ["设计", 4], ["艺术", 7], ["数字媒体", 7], ["网络文化", 5], ["三维数字化", 6], ["创意", 3]]
  },
  {
    key: "social-career",
    terms: [["职业规划", 9], ["社会治理", 8], ["心理", 5], ["科普", 7], ["主题教育", 8], ["乡村", 7], ["学宪法", 9], ["修身", 6], ["文化节", 5], ["实践活动", 6], ["社会实践", 7], ["就业人才", 7], ["百千万", 7], ["校园文化", 6], ["行业—专业—就业", 9]]
  },
  {
    key: "innovation",
    terms: [["创新创业", 9], ["创业", 6], ["挑战杯", 9], ["科技学术", 7], ["科技创新", 8], ["科技成果转化", 9], ["创客", 7], ["创翼", 7], ["众创", 7], ["创新", 4], ["科技作品", 5], ["路演", 6]]
  }
];

const TYPE_RULES = [
  { label: "创新创业", pattern: /创业|创新创业|创客|创翼|众创|商业计划|路演/i },
  { label: "编程算法", pattern: /程序|算法|ACM|ICPC|码蹄|天梯|软件测试|计算机能力|IT\s*技能/i },
  { label: "工程实践", pattern: /开发|应用|工程|制造|嵌入式|机器人|汽车|电子|芯片|物联网|ICT|通信|BIM|系统/i },
  { label: "建模分析", pattern: /建模|统计|数据|市场调查|分析|数学|金融科技/i },
  { label: "作品创作", pattern: /作品|设计|艺术|动漫|动画|游戏|广告|美术|音乐|舞蹈|戏剧|合唱|短视频|主持|园林|包装/i },
  { label: "语言表达", pattern: /英语|日语|外语|翻译|演讲|写作|词汇|诵|书写|篆刻|普通话|双语|征文/i },
  { label: "商业模拟", pattern: /商务|商业|贸易|电商|物流|供应链|会计|财务|税务|金融|企业|营销|谈判|人力资源|审计|经济|旅游|会展/i },
  { label: "调研实践", pattern: /调查|调研|社会治理|乡村|科普|职业规划|就业|实践活动|主题教育|宪法|文化节|百千万/i },
  { label: "体育竞技", pattern: /体育|运动会|啦啦操|马拉松|自行车|街舞/i }
];

const LEVEL_SLUGS = { "A+": "aplus", A: "a", "B+": "bplus", B: "b", C: "c" };

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function stableId(row) {
  return `catalog-${LEVEL_SLUGS[row.level]}-${String(row.catalog_no).padStart(3, "0")}`;
}

function categoryScores(name) {
  return CATEGORY_RULES.map((rule, ruleIndex) => ({
    key: rule.key,
    score: rule.terms.reduce((total, [term, weight]) => total + (name.toLowerCase().includes(term.toLowerCase()) ? weight : 0), 0),
    ruleIndex
  })).sort((left, right) => right.score - left.score || left.ruleIndex - right.ruleIndex);
}

function classify(name) {
  const scores = categoryScores(name);
  const primaryCategory = scores[0].score > 0 ? scores[0].key : "social-career";
  const categoryTags = scores.filter((entry) => entry.score > 0).map((entry) => entry.key);
  if (!categoryTags.includes(primaryCategory)) categoryTags.unshift(primaryCategory);
  const typeTags = TYPE_RULES.filter((rule) => rule.pattern.test(name)).map((rule) => rule.label);
  if (!typeTags.length) typeTags.push("综合竞赛");
  return { primaryCategory, categoryTags, typeTags };
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function joinResearchField(matches, field) {
  const populated = matches.filter((item) => item[field]);
  if (!populated.length) return "";
  if (populated.length === 1) return populated[0][field];
  return populated.map((item) => `【${item.name}】${item[field]}`).join("\n");
}

function buildDetail(overlayEntry) {
  const research = overlayEntry?.researchMatches || [];
  const selectedLegacy = overlayEntry?.selectedLegacyId
    ? (overlayEntry.legacyMatches || []).find((item) => item.id === overlayEntry.selectedLegacyId)
    : null;
  if (!research.length && !selectedLegacy) return undefined;
  const detail = {};
  const researchFields = [
    "ai_data_relevance",
    "usual_registration",
    "usual_competition",
    "2026_or_latest_status",
    "eligibility_team",
    "typical_tasks",
    "student_preparation",
    "club_start_month",
    "hardware_software",
    "priority",
    "notes"
  ];
  for (const field of researchFields) {
    const value = joinResearchField(research, field);
    if (value) detail[field] = value;
  }
  const officialUrls = unique(research.map((item) => item.official_source_url).map((url) => url?.replace(/^http:\/\//i, "https://")));
  const backupUrls = unique(research.map((item) => item.backup_source_url).map((url) => url?.replace(/^http:\/\//i, "https://")));
  if (officialUrls.length) detail.official_source_url = officialUrls[0];
  if (backupUrls.length) detail.backup_source_url = backupUrls[0];
  const evidenceYears = unique(research.map((item) => item.evidence_year));
  const confidence = unique(research.map((item) => item.confidence));
  if (evidenceYears.length) detail.evidence_year = evidenceYears.join("、");
  if (confidence.length) detail.confidence = confidence.join("、");
  if (research.length > 1) {
    detail.research_variants = research.map((item) => ({
      name: item.name,
      usual_registration: item.usual_registration || "",
      usual_competition: item.usual_competition || "",
      "2026_or_latest_status": item["2026_or_latest_status"] || "",
      eligibility_team: item.eligibility_team || "",
      typical_tasks: item.typical_tasks || "",
      student_preparation: item.student_preparation || "",
      official_source_url: item.official_source_url?.replace(/^http:\/\//i, "https://") || "",
      backup_source_url: item.backup_source_url?.replace(/^http:\/\//i, "https://") || "",
      evidence_year: item.evidence_year || "",
      confidence: item.confidence || ""
    }));
  }
  if (selectedLegacy) {
    detail.legacy_verified = Object.fromEntries(Object.entries(selectedLegacy).filter(([key]) => !["id", "level", "catalogNo", "name", "website"].includes(key)));
  }
  return detail;
}

function buildRegistration(overlayEntry, override) {
  const supplied = override || overlayEntry?.registration;
  if (!supplied) {
    return {
      state: "unknown",
      url: null,
      note: "尚未核验独立报名入口，请关注学校通知。",
      checkedAt: null
    };
  }
  const state = ["open", "closed", "school", "unknown"].includes(supplied.state) ? supplied.state : "unknown";
  const suppliedUrl = supplied.registrationUrl || supplied.url || "";
  const openUrl = state === "open" && /^https:\/\//i.test(suppliedUrl) ? suppliedUrl : null;
  return {
    state: openUrl ? "open" : state === "open" ? "unknown" : state,
    url: openUrl,
    note: supplied.note || "请关注学校和赛事主办方通知。",
    checkedAt: supplied.checkedAt || null,
    ...(supplied.label ? { label: supplied.label } : {}),
    ...(typeof supplied.homepageCarousel === "boolean" ? { homepageCarousel: supplied.homepageCarousel } : {}),
    ...(supplied.currentEdition ? { currentEdition: supplied.currentEdition } : {})
  };
}

function buildRegistrationText(overlayEntry, registration, override) {
  if (override?.note) return override.note;
  const researched = joinResearchField(overlayEntry?.researchMatches || [], "usual_registration");
  if (researched) return researched;
  if (registration.note) return registration.note;
  return "暂无可靠报名时间信息。";
}

const FALLBACK_SUMMARY_RULES = [
  {
    pattern: /全国高校商业精英挑战赛/,
    text: "赛事包含国际贸易、创新创业、会计案例、品牌策划、商务谈判与物流供应链等商业任务"
  },
  {
    pattern: /《人民中国杯》系列赛/,
    text: "包含日语翻译、演讲、写作、听力与才艺展示等赛项，综合考查日语理解和表达能力"
  },
  {
    pattern: /全国大学生艺术展演系列|百歌颂中华/,
    text: "通过舞蹈、戏剧、音乐、美术或语言类作品进行创作与展演，展示专业技巧和艺术表达"
  },
  {
    pattern: /校园文体艺术季|大学生艺术展演活动|大学生艺术节/,
    text: "学生以音乐、舞蹈、戏剧、美术或设计等作品参加展演与评选，重点呈现创作水平与舞台表现"
  },
  {
    pattern: /原创音乐作品征集/,
    text: "参赛者创作并提交原创歌曲或器乐作品，通过曲谱、音频或视频呈现旋律、编配和主题表达"
  },
  {
    pattern: /POCIB/,
    text: "在仿真国际贸易环境中完成询报价、商务谈判、合同、报关、物流与结算等外贸业务"
  },
  {
    pattern: /EVC\s*企业价值创造/,
    text: "在企业经营模拟中完成市场、生产、研发、投融资和财务决策，通过多期运营提升企业价值"
  },
  {
    pattern: /旅游院校服务技能/,
    text: "按赛项完成导游讲解、酒店或餐饮服务、旅游策划等现场任务，展示服务规范与应变能力"
  },
  {
    pattern: /粤港澳海洋旅游创新/,
    text: "围绕粤港澳海洋文旅资源开展市场分析，完成旅游产品、线路或文创项目策划与展示"
  },
  {
    pattern: /财经素养/,
    text: "通过财经知识、经济现象理解和案例分析任务，考查基础财经素养、数据判断与理性决策能力"
  },
  {
    pattern: /职业规划/,
    text: "围绕生涯目标、学习行动与求职能力完成职业发展报告和现场展示"
  },
  {
    pattern: /诵写讲|诵读|书写|篆刻/,
    text: "通过经典诵读、语言讲解、汉字书写或篆刻作品展示中华优秀文化"
  },
  {
    pattern: /马拉松/,
    text: "参赛者按赛事组别完成公路长跑，重点考验耐力、配速、补给和赛程安全管理"
  },
  {
    pattern: /自行车/,
    text: "参赛者进行公路或场地自行车项目比拼，考验骑行技术、体能和团队协作"
  },
  {
    pattern: /啦啦操/,
    text: "团队编排并完成啦啦操套路，通过动作难度、完成质量、同步性和现场表现评比"
  },
  {
    pattern: /街舞/,
    text: "参赛者完成街舞作品编排与现场表演，展示音乐理解、动作技术、创意和团队配合"
  },
  {
    pattern: /体育舞蹈/,
    text: "参赛组合按组别完成体育舞蹈套路，展示基本步法、节奏、技术规范与现场表现力"
  },
  {
    pattern: /运动会|体育竞赛|体育赛事/,
    text: "按当届设置参加田径、球类或其他专项运动比赛，考验专项技术、体能和团队配合"
  },
  {
    pattern: /机械创新设计/,
    text: "围绕年度主题设计机械装置，完成结构设计、工程图、样机制作、测试改进和现场展示"
  },
  {
    pattern: /广告/,
    text: "根据品牌或公益命题完成平面、视频、文案、动画或互动广告创意作品"
  },
  {
    pattern: /BIM|建筑信息模型/i,
    text: "根据建筑或工程资料建立BIM模型，完成构件建模、协同检查、工程分析与成果展示"
  },
  {
    pattern: /园林|景观|人居环境/,
    text: "针对指定场地完成园林或人居环境方案，提交场地分析、规划图、效果表达和设计说明"
  },
  {
    pattern: /室内设计/,
    text: "围绕居住或公共空间完成功能规划、平立面图、材料搭配、效果表达和设计说明"
  },
  {
    pattern: /包装/,
    text: "针对产品或品牌需求完成包装视觉、结构与应用方案，提交成品效果及设计说明"
  },
  {
    pattern: /产品设计|工业设计/,
    text: "从用户需求出发完成产品概念、结构与造型设计，并通过模型、渲染图或样机说明方案"
  },
  {
    pattern: /设计奖|设计竞赛|设计作品|设计学科|设计周|金点|红点|华灿|EPDA|Spark Design|IF设计/i,
    text: "参赛者提交视觉、产品、空间或数字媒体等原创设计作品，并说明创意概念与应用价值"
  },
  {
    pattern: /动漫|游戏美术|金龙奖/,
    text: "完成漫画、插画、动画、游戏概念或数字影像作品，重点展示视觉叙事、造型和原创性"
  },
  {
    pattern: /翻译/,
    text: "围绕中外文文本完成翻译，重点考查语义理解、表达准确性、术语处理和文体适配"
  },
  {
    pattern: /词汇/,
    text: "通过词义辨析、语境选择、拼写及词汇运用等题型，考查外语词汇量与实际应用能力"
  },
  {
    pattern: /英语演讲|日语演讲|演讲比赛/,
    text: "参赛者围绕命题完成外语演讲和现场问答，展示语言准确性、逻辑组织与跨文化表达能力"
  },
  {
    pattern: /英语写作|作文|征文/,
    text: "根据命题或材料完成中外文写作，重点考查内容立意、结构逻辑、语言准确性和文体表达"
  },
  {
    pattern: /普通话/,
    text: "通过普通话朗读、命题说话或语音知识任务，考查语音标准度、表达流畅度和语言组织"
  },
  {
    pattern: /外语能力|英语竞赛|大学英语|日语/,
    text: "通过听读理解、语言知识、写作、翻译或口语任务，综合考查外语理解与表达能力"
  },
  {
    pattern: /税收风险|智慧税务|个税|税务预警|财税/,
    text: "基于企业涉税数据和案例识别税收风险，完成政策判断、税额计算、风险分析与处理建议"
  },
  {
    pattern: /审计/,
    text: "根据企业财务与业务资料执行审计分析，识别错报和风险，完成审计程序、底稿与报告"
  },
  {
    pattern: /会计|财会|财务决策|财经素养/,
    text: "通过企业业务案例完成会计核算、财务分析、资金与经营决策，展示业财税综合应用能力"
  },
  {
    pattern: /金融|经济学|企业价值/,
    text: "基于市场与企业数据完成金融分析、投资或经营决策，重点考查风险判断和结果说明能力"
  },
  {
    pattern: /人力资源/,
    text: "围绕招聘、培训、绩效、薪酬和员工关系等企业情境，完成人力资源方案、模拟决策或现场答辩"
  },
  {
    pattern: /商务谈判/,
    text: "根据商业案例设计谈判目标与策略，通过团队角色分工完成现场模拟谈判、总结和答辩"
  },
  {
    pattern: /品牌策划|市场营销|公关策划|公共关系策划/,
    text: "针对真实或模拟组织完成市场调研、目标人群分析、品牌或公关策略、传播方案和提案展示"
  },
  {
    pattern: /物流|供应链|逆向物流/,
    text: "针对供应链案例完成需求预测、库存、仓储、运输或回收网络方案，并分析成本与可行性"
  },
  {
    pattern: /跨境电商|电子商务|外贸|数字贸易|新零售/,
    text: "围绕店铺或贸易业务完成选品、定价、营销、客户服务、运营数据分析和经营决策"
  },
  {
    pattern: /企业竞争模拟|创业综合模拟|商业决策|管理创新杯|商业技能|商业精英/,
    text: "在模拟企业环境中完成市场、生产、财务、供应链等经营决策，并根据结果调整策略"
  },
  {
    pattern: /旅游|会展/,
    text: "围绕旅游服务或会展项目完成资源分析、产品与活动策划、现场服务演示和方案说明"
  },
  {
    pattern: /创业|创新创业|创翼/,
    text: "针对真实问题提出产品或服务方案，完成用户验证、商业模式、项目计划、成果展示和路演"
  },
  {
    pattern: /心理健康|心理知识/,
    text: "围绕心理健康知识、自我调适与同伴支持完成知识答题、科普作品或主题实践任务"
  },
  {
    pattern: /社会治理|人才需求分析/,
    text: "选择社会或行业问题开展调研，完成问卷访谈、数据分析、问题诊断、调研报告和对策建议"
  },
  {
    pattern: /乡村|社会实践|百千万/,
    text: "团队深入乡村或社区开展调研与志愿服务，通过报告、影像或项目成果展示实践过程"
  },
  {
    pattern: /学宪法|宪法/,
    text: "通过宪法知识学习、主题演讲或法治实践作品，考查法治素养、案例理解与现场表达"
  },
  {
    pattern: /科普作品/,
    text: "选择科学主题完成文章、图文、动画、短视频或展教作品，将专业知识转化为准确易懂的表达"
  },
  {
    pattern: /网络文化|三微|主题教育|修身·博学/,
    text: "围绕当届主题完成文章、微视频、摄影、公益广告或实践成果，重点展示内容立意与传播效果"
  },
  {
    pattern: /音乐|歌咏|合唱/,
    text: "通过原创音乐作品或独唱、合唱舞台表演，展示音准节奏、作品理解、编排和团队配合"
  },
  {
    pattern: /舞蹈|戏剧|艺术展演|艺术节|文体艺术季|美术/,
    text: "参赛者通过舞蹈、戏剧、音乐或美术作品进行创作与展演，重点展示专业技巧和艺术表达"
  },
  {
    pattern: /主持人/,
    text: "通过自备主持、命题播报、即兴评述或现场串联，考查语言面貌、应变能力与舞台表现"
  },
  {
    pattern: /数学竞赛/,
    text: "通过微积分、线性代数、概率统计等数学题目，考查基础知识、逻辑推导和综合解题能力"
  }
];

const TYPE_FALLBACK_SUMMARIES = {
  "创新创业": "围绕真实需求设计创新产品或服务，完成方案、作品展示和项目路演",
  "编程算法": "通过程序设计和算法题解决具体问题，重点考查代码正确性、效率与调试能力",
  "工程实践": "根据赛题完成工程方案、系统或实物原型，并进行调试、测试和成果展示",
  "建模分析": "针对实际问题建立数学或数据模型，完成数据处理、结果验证和分析报告",
  "作品创作": "围绕当届主题完成原创作品、创作说明与展示，重点呈现创意、专业技巧和完成度",
  "语言表达": "通过听说读写译等语言任务，考查理解准确性、逻辑组织和现场表达能力",
  "商业模拟": "根据企业案例完成运营分析、资源配置和经营决策，并通过报告或答辩说明方案",
  "调研实践": "围绕社会或行业问题开展调研与实践，通过数据、案例和报告提出分析与建议",
  "体育竞技": "按当届组别完成专项体育比赛，重点考验运动技术、体能、战术执行和团队协作",
  "综合竞赛": "围绕赛事主题完成作品、方案展示或现场任务"
};

function cleanResearchText(value) {
  return String(value || "")
    .replace(/\r?\n+/g, "。")
    .replace(/【[^】]+】/g, "")
    .replace(/\s+/g, " ")
    .replace(/^[：:;；。，,、\s]+|[：:;；。，,、\s]+$/g, "")
    .trim();
}

function researchClauses(value) {
  const cleaned = cleanResearchText(value);
  if (!cleaned) return [];
  return cleaned
    .split(/[。；;]/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 4)
    .map((part) => {
      if (/^\d{4}/.test(part) && /(?:考查|考察|考验)/.test(part)) {
        return `重点考查${part.replace(/^.*?(?:考查|考察|考验)/, "").trim()}`;
      }
      return part;
    })
    .filter(Boolean);
}

function firstConcreteClause(value) {
  return researchClauses(value)[0] || "";
}

function shortenSummaryPart(value, maxLength) {
  const cleaned = String(value || "").replace(/[。；;]+$/g, "").trim();
  if (cleaned.length <= maxLength) return cleaned;
  const candidate = cleaned.slice(0, Math.max(1, maxLength - 1));
  const breakpoints = [candidate.lastIndexOf("，"), candidate.lastIndexOf("、"), candidate.lastIndexOf("："), candidate.lastIndexOf(":"), candidate.lastIndexOf(" ")];
  const breakpoint = Math.max(...breakpoints);
  const shortened = breakpoint >= Math.min(28, Math.floor(maxLength * 0.55)) ? candidate.slice(0, breakpoint) : candidate;
  return `${shortened.replace(/[，、：:\s]+$/g, "")}等`;
}

function competitionFormatClause(value) {
  let clause = firstConcreteClause(value);
  if (!clause) return "";
  const hasFormatSignal = /提交|答辩|现场|线上|团队|个人|队|作品|报告|原型|程序|赛制|开发|设计|制作|完成/.test(clause);
  const timingOnly = /月|春季|夏季|秋季|冬季|公布结果|报名/.test(clause) && !hasFormatSignal;
  if (timingOnly) return "";
  clause = clause
    .replace(/^历史赛制多为/, "通常采用")
    .replace(/^历史赛制为/, "通常采用")
    .replace(/^历史为/, "通常采用")
    .replace(/^旧届通常以/, "通常以")
    .replace(/^旧届以/, "通常以")
    .replace(/^近届以/, "通常以")
    .replace(/^近届春夏季作品征集，之后评审\/展示/, "通常先征集作品，之后进行评审和展示");
  return clause;
}

function summaryFromVerifiedDetail(detail) {
  const taskClauses = researchClauses(detail?.typical_tasks);
  const task = taskClauses[0] || "";
  if (!task) return "";
  const hasVariants = Array.isArray(detail.research_variants) && detail.research_variants.length > 1;
  const prefix = hasVariants ? "赛事设有多个赛项，常见内容包括" : "比赛内容包括";
  let summary = `${prefix}${shortenSummaryPart(task, 88 - prefix.length)}`;
  if (summary.length < 35 && taskClauses[1]) {
    summary += `；${shortenSummaryPart(taskClauses[1], 88 - summary.length - 1)}`;
  }
  if (summary.length < 35) {
    const format = competitionFormatClause(detail.usual_competition);
    if (format) summary += `；${shortenSummaryPart(format, 88 - summary.length - 1)}`;
  }
  if (summary.length < 35) summary += "，重点考查相关知识的实际应用与问题解决能力";
  return `${shortenSummaryPart(summary, 89)}。`;
}

function summaryFromName(row, classification) {
  const matched = FALLBACK_SUMMARY_RULES.find((rule) => rule.pattern.test(row.name));
  const content = matched?.text || TYPE_FALLBACK_SUMMARIES[classification.typeTags[0]] || TYPE_FALLBACK_SUMMARIES["综合竞赛"];
  const suffix = "，具体赛制和题目以当届章程为准。";
  return `${shortenSummaryPart(content, 90 - suffix.length)}${suffix}`;
}

function summaryFor(row, classification, detail) {
  return summaryFromVerifiedDetail(detail) || summaryFromName(row, classification);
}

const source = readJson(sourcePath);
const overlay = readJson(overlayPath);
const timing = readJson(timingPath);
const openRegistrationDocument = fs.existsSync(openRegistrationPath) ? readJson(openRegistrationPath) : { entries: [] };
const rawOpenRegistrationRecords = Array.isArray(openRegistrationDocument)
  ? openRegistrationDocument
  : openRegistrationDocument.entries || openRegistrationDocument.records || openRegistrationDocument;
const openRegistrationRecords = Array.isArray(rawOpenRegistrationRecords)
  ? Object.fromEntries(rawOpenRegistrationRecords.filter((entry) => entry.id).map((entry) => [entry.id, entry.registration || entry]))
  : rawOpenRegistrationRecords;

const competitions = source.map((row) => {
  const id = stableId(row);
  const overlayEntry = overlay.entries[id];
  const openRegistrationOverride = openRegistrationRecords[id];
  const timingEntry = timing.records[id] || {
    registrationTimingKind: "unknown",
    registrationMonths: []
  };
  const classification = classify(row.name);
  const registration = buildRegistration(overlayEntry, openRegistrationOverride);
  const auditedEvidenceLinks = (openRegistrationOverride?.evidenceLinks || []).map((link, index) => {
    if (typeof link === "string") return { url: link, kind: "official", label: `2026报名核验资料 ${index + 1}`, evidenceYear: "2026" };
    return { ...link, kind: link.kind || "official", label: link.label || `2026报名核验资料 ${index + 1}`, evidenceYear: link.evidenceYear || "2026" };
  });
  const evidenceLinks = [...(overlayEntry?.evidenceLinks || []), ...auditedEvidenceLinks]
    .filter((link) => /^https:\/\//i.test(link.url || ""))
    .filter((link, index, values) => values.findIndex((candidate) => candidate.url === link.url) === index)
    .sort((left, right) => (left.kind === "official" ? 0 : 1) - (right.kind === "official" ? 0 : 1));
  const auditedWebsite = /^https:\/\//i.test(openRegistrationOverride?.officialUrl || "") ? openRegistrationOverride.officialUrl : null;
  const website = auditedWebsite || (overlayEntry?.website && /^https:\/\//i.test(overlayEntry.website) ? overlayEntry.website : null);
  const websiteStatus = website
    ? "verified"
    : evidenceLinks.some((link) => link.kind === "official")
      ? "unverified"
      : "missing";
  const detail = buildDetail(overlayEntry);
  const item = {
    id,
    sourceEdition: SOURCE_EDITION,
    level: row.level,
    catalogNo: row.catalog_no,
    name: row.name,
    organizer: row.organizer,
    pdfPage: row.pdf_page,
    primaryCategory: classification.primaryCategory,
    categoryTags: classification.categoryTags,
    typeTags: classification.typeTags,
    summary: summaryFor(row, classification, detail),
    website,
    websiteStatus,
    websiteCheckedAt: website ? openRegistrationOverride?.checkedAt || overlayEntry?.websiteCheckedAt || null : null,
    registration,
    registrationMonths: Array.isArray(openRegistrationOverride?.registrationMonths)
      ? openRegistrationOverride.registrationMonths
      : timingEntry.registrationMonths || [],
    registrationTimingKind: timingEntry.registrationTimingKind || "unknown",
    registrationText: buildRegistrationText(overlayEntry, registration, openRegistrationOverride),
    evidenceLinks
  };
  if (detail) item.detail = detail;
  return item;
});

const levelCounts = Object.fromEntries(["A+", "A", "B+", "B", "C"].map((level) => [level, competitions.filter((item) => item.level === level).length]));
const categoryCounts = Object.fromEntries(CATEGORIES.map((category) => [category.key, competitions.filter((item) => item.primaryCategory === category.key).length]));
const timingCounts = Object.fromEntries(["verified_2026", "historical", "unknown"].map((kind) => [kind, competitions.filter((item) => item.registrationTimingKind === kind).length]));
const counts = {
  total: competitions.length,
  levels: levelCounts,
  categories: categoryCounts,
  enhanced: competitions.filter((item) => item.detail).length,
  verifiedWebsites: competitions.filter((item) => item.websiteStatus === "verified").length,
  evidenceLinks: competitions.reduce((total, item) => total + item.evidenceLinks.length, 0),
  openRegistrations: competitions.filter((item) => item.registration.state === "open").length,
  registrationTiming: timingCounts
};

const siteMeta = {
  title: "广州软件学院竞赛清单",
  school: "广州软件学院",
  edition: SOURCE_EDITION,
  sourceTitle: SOURCE_TITLE,
  sourceDate: SOURCE_DATE,
  generatedAt: GENERATED_AT,
  repository: "Jianfeng777/gzist-competition-guide",
  counts
};

const catalogDocument = {
  schemaVersion: 1,
  siteMeta,
  categories: CATEGORIES,
  competitions
};

fs.writeFileSync(catalogPath, `${JSON.stringify(catalogDocument, null, 2)}\n`);
fs.writeFileSync(
  siteDataPath,
  `// 由 scripts/build-catalog.mjs 生成，请不要手动编辑。\nwindow.SITE_META = ${JSON.stringify(siteMeta, null, 2)};\n\nwindow.CATEGORIES = ${JSON.stringify(CATEGORIES, null, 2)};\n\nwindow.COMPETITIONS = ${JSON.stringify(competitions, null, 2)};\n`
);

console.log(JSON.stringify(counts, null, 2));
