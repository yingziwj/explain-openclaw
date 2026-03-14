import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const siteDataPath = path.join(projectRoot, "src", "generated", "site-data.json");
const reportPath = path.join(projectRoot, "reports", "content-audit.md");

const { default: siteData } = await import(siteDataPath, { with: { type: "json" } });

const pages = Array.isArray(siteData.pages) ? siteData.pages : [];

const normalizeText = (value) => (value || "")
  .replace(/```[\s\S]*?```/g, " ")
  .replace(/`[^`]+`/g, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/\[[^\]]+\]\([^)]+\)/g, " ")
  .replace(/[^\p{L}\p{N}\s]/gu, " ")
  .replace(/\s+/g, " ")
  .trim()
  .toLowerCase();

const extractInlineCode = (value) => {
  const matches = value.match(/`([^`\n]+)`/g) || [];
  return matches.map((item) => item.slice(1, -1).trim()).filter(Boolean);
};

const extractFencedCodeLines = (value) => {
  const blocks = [...value.matchAll(/```[^\n]*\n([\s\S]*?)```/g)];
  return blocks.flatMap((match) => match[1].split("\n").map((line) => line.trim()).filter(Boolean));
};

const isCommandLike = (value) => {
  if (!value) {
    return false;
  }

  if (/^https?:\/\//.test(value) || /^\//.test(value)) {
    return false;
  }

  if (!/\s/.test(value) && !/^openclaw\b/.test(value)) {
    return false;
  }

  return /^(openclaw|curl|iwr|npm|pnpm|yarn|node|npx|docker|brew|uv|python|pip|git|ssh)\b/.test(value);
};

const extractCommandCandidates = (value) => [...new Set(
  [...extractInlineCode(value), ...extractFencedCodeLines(value)]
    .map((item) => item.replace(/\s+/g, " ").trim())
    .filter(isCommandLike)
)];

const countProceduralSignals = (value) => {
  const patterns = [
    /<Steps>/g,
    /<Step\b/g,
    /^\s*##\s+/gm,
    /^\s*\*\s+/gm,
    /^\s*-\s+/gm,
    /^\s*\d+\.\s+/gm
  ];

  return patterns.reduce((total, pattern) => total + ((value.match(pattern) || []).length), 0);
};

const hasSequenceLanguage = (value) => /(首先|先|然后|接着|下一步|最后|第一步|第二步|第三步|1\.|2\.|3\.)/.test(value);

const overlapRatio = (summary, explanation) => {
  const summaryTokens = new Set(normalizeText(summary).split(" ").filter(Boolean));
  const explanationTokens = new Set(normalizeText(explanation).split(" ").filter(Boolean));

  if (summaryTokens.size === 0 || explanationTokens.size === 0) {
    return 0;
  }

  let overlap = 0;

  for (const token of summaryTokens) {
    if (explanationTokens.has(token)) {
      overlap += 1;
    }
  }

  return overlap / summaryTokens.size;
};

const issues = [];

const pushIssue = (severity, page, reason, details) => {
  issues.push({
    severity,
    path: page.path,
    title: page.title,
    reason,
    details
  });
};

for (const page of pages) {
  const source = page.sourceMarkdown || "";
  const summary = page.summaryMd || "";
  const explanation = page.explanationMd || "";

  const sourceCommands = extractCommandCandidates(source);
  const explanationCommands = new Set(extractCommandCandidates(explanation));
  const importantCommands = sourceCommands.slice(0, 6);
  const missingCommands = importantCommands.filter((command) => !explanationCommands.has(command));
  const sourceTextLength = normalizeText(source).length;
  const explanationLength = normalizeText(explanation).length;
  const proceduralScore = countProceduralSignals(source);
  const overlap = overlapRatio(summary, explanation);

  if (!summary.trim()) {
    pushIssue("high", page, "缺少简要总结", "summaryMd 为空。");
  }

  if (!explanation.trim()) {
    pushIssue("high", page, "缺少解释正文", "explanationMd 为空。");
    continue;
  }

  if (sourceTextLength > 1200 && explanationLength < 260) {
    pushIssue("high", page, "正文解释过短", `原文较长，但解释正文只有 ${explanationLength} 个标准化字符。`);
  }

  if (importantCommands.length >= 2 && missingCommands.length >= Math.max(2, Math.ceil(importantCommands.length * 0.6))) {
    pushIssue(
      importantCommands.length >= 4 ? "high" : "medium",
      page,
      "关键命令保留不足",
      `抽样关键命令 ${importantCommands.length} 个，解释中缺失 ${missingCommands.length} 个。示例：${missingCommands.slice(0, 4).join(" / ")}`
    );
  }

  if (proceduralScore >= 8 && !hasSequenceLanguage(explanation)) {
    pushIssue("medium", page, "步骤感不足", "原文明显是教程页，但解释里几乎没有顺序提示词。");
  }

  if (summary.trim() && overlap > 0.82) {
    pushIssue("medium", page, "总结与正文过于重复", `总结词汇有 ${(overlap * 100).toFixed(0)}% 出现在正文里。`);
  }

  if (/(TODO|待补充|稍后补充|lorem ipsum)/i.test(`${summary}\n${explanation}`)) {
    pushIssue("medium", page, "存在占位内容", "页面里出现了明显的占位词。");
  }

  if (/sk-[a-z0-9]+/i.test(`${summary}\n${explanation}`)) {
    pushIssue("high", page, "疑似泄露敏感 Key", "检测到类似 API Key 的文本片段。");
  }
}

const severityWeight = { high: 0, medium: 1, low: 2 };
issues.sort((a, b) => (severityWeight[a.severity] - severityWeight[b.severity]) || a.path.localeCompare(b.path));

const summaryCounts = issues.reduce((accumulator, issue) => {
  accumulator[issue.severity] = (accumulator[issue.severity] || 0) + 1;
  return accumulator;
}, {});

const topIssues = issues.slice(0, 30);
const reportLines = [
  "# Content Audit Report",
  "",
  `Generated at: ${new Date().toISOString()}`,
  `Pages checked: ${pages.length}`,
  `High issues: ${summaryCounts.high || 0}`,
  `Medium issues: ${summaryCounts.medium || 0}`,
  `Low issues: ${summaryCounts.low || 0}`,
  "",
  "## Rules",
  "",
  "- Missing summary or explanation",
  "- Long source page but very short explanation",
  "- Important commands missing from the explanation",
  "- Procedural pages without clear sequence language",
  "- Summary overly overlaps with explanation",
  "- Placeholder text or leaked key patterns",
  "",
  "## Top Findings",
  ""
];

if (topIssues.length === 0) {
  reportLines.push("No issues found.");
} else {
  for (const issue of topIssues) {
    reportLines.push(`- [${issue.severity.toUpperCase()}] ${issue.path} | ${issue.title} | ${issue.reason}`);
    reportLines.push(`  ${issue.details}`);
  }
}

reportLines.push("");
reportLines.push("## Full Counts");
reportLines.push("");
reportLines.push(`- High: ${summaryCounts.high || 0}`);
reportLines.push(`- Medium: ${summaryCounts.medium || 0}`);
reportLines.push(`- Total issues: ${issues.length}`);
reportLines.push("");

await mkdir(path.dirname(reportPath), { recursive: true });
await writeFile(reportPath, `${reportLines.join("\n")}\n`, "utf8");

console.log(`Content audit report written to ${reportPath}`);
console.log(`Pages checked: ${pages.length}`);
console.log(`High issues: ${summaryCounts.high || 0}`);
console.log(`Medium issues: ${summaryCounts.medium || 0}`);

if ((summaryCounts.high || 0) > 0) {
  process.exitCode = 1;
}
