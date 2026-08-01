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

function summaryFor(row, classification) {
  const label = CATEGORIES.find((category) => category.key === classification.primaryCategory)?.label || "综合竞赛";
  return `学校2026竞赛目录${row.level}类项目，主要归入${label}，常见参与形式包括${classification.typeTags.slice(0, 3).join("、")}。`;
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
    summary: summaryFor(row, classification),
    website,
    websiteStatus,
    websiteCheckedAt: website ? openRegistrationOverride?.checkedAt || overlayEntry?.websiteCheckedAt || null : null,
    registration,
    registrationMonths: timingEntry.registrationMonths || [],
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
