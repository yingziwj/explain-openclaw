import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import * as cheerio from "cheerio";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const outputPath = path.join(projectRoot, "src", "generated", "site-data.json");
const cachePath = path.join(projectRoot, "src", "generated", "page-cache.json");
const navTranslationPath = path.join(projectRoot, "src", "generated", "nav-translation-cache.json");

const SOURCE_ORIGIN = process.env.SOURCE_ORIGIN || "https://docs.openclaw.ai";
const LLM_SOURCE_URL = `${SOURCE_ORIGIN}/llms-full.txt`;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const SYNC_CONCURRENCY = Number(process.env.SYNC_CONCURRENCY || "3");
const PROMPT_VERSION = process.env.PROMPT_VERSION || "v3-kid-friendly-but-complete";
const SYNC_ONLY_PATHS = (process.env.SYNC_ONLY_PATHS || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const SYNC_FORCE_PATHS = new Set(
  (process.env.SYNC_FORCE_PATHS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const MANUAL_TRANSLATIONS = {
  "Get started": "开始使用",
  "Install": "安装",
  "Channels": "聊天渠道",
  "Agents": "智能体",
  "Tools": "工具",
  "Models": "模型",
  "Platforms": "平台",
  "Gateway & Ops": "网关与运维",
  "Reference": "参考资料",
  "Help": "帮助",
  "Home": "首页",
  "Overview": "概览",
  "Core concepts": "核心概念",
  "First steps": "第一步",
  "Guides": "指南",
  "Messaging platforms": "消息平台",
  "Configuration": "配置",
  "Fundamentals": "基础知识",
  "Bootstrapping": "启动准备",
  "Sessions and memory": "会话与记忆",
  "Multi-agent": "多智能体",
  "Messages and delivery": "消息与投递",
  "Built-in tools": "内置工具",
  "Browser": "浏览器",
  "Agent coordination": "智能体协作",
  "Skills": "技能",
  "Extensions": "扩展",
  "Automation": "自动化",
  "Media and devices": "媒体与设备",
  "Model concepts": "模型概念",
  "Providers": "提供商",
  "Platforms overview": "平台概览",
  "macOS companion app": "macOS 配套应用",
  "Gateway": "网关",
  "Remote access": "远程访问",
  "Security": "安全",
  "Web interfaces": "网页界面",
  "CLI commands": "CLI 命令",
  "RPC and API": "RPC 与 API",
  "Templates": "模板",
  "Technical reference": "技术参考",
  "Concept internals": "概念内部机制",
  "Project": "项目",
  "Release notes": "发布说明",
  "Experiments": "实验",
  "Community": "社区",
  "Environment and debugging": "环境与调试",
  "Node runtime": "Node 运行时",
  "Compaction internals": "压缩机制内部原理",
  "Developer setup": "开发者设置",
  "Contributing": "参与贡献",
  "Docs meta": "文档信息",
  "OpenClaw": "OpenClaw",
  "Chat Channels": "聊天渠道",
  "Tools": "工具",
  "Model Providers": "模型提供商",
  "Platforms": "平台",
  "Help": "帮助",
  "CLI Reference": "CLI 参考"
};

const fetchText = async (url) => {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "explain-openclaw-sync/1.0"
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  return response.text();
};

const normalizePath = (href) => {
  if (!href) {
    return null;
  }

  const url = new URL(href, SOURCE_ORIGIN);

  if (url.origin !== SOURCE_ORIGIN) {
    return null;
  }

  if (url.hash) {
    url.hash = "";
  }

  if (url.search) {
    url.search = "";
  }

  return url.pathname.replace(/\/$/, "") || "/";
};

const slugFromPath = (pathname) => pathname === "/" ? "" : pathname.replace(/^\//, "");

const titleCaseFallback = (pathname) => {
  const last = pathname.split("/").filter(Boolean).at(-1) || "home";
  return last
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const groupTitleFromPath = (pathname) => {
  if (pathname === "/") {
    return "Documentation";
  }

  const firstSegment = pathname.split("/").filter(Boolean)[0] || "documentation";
  return firstSegment
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const parseSidebar = (html) => {
  const $ = cheerio.load(html);
  const sidebarNode = $("aside").first();
  const groups = [];
  let currentGroup = null;
  const seen = new Set();

  sidebarNode.find("h2, h3, h4, h5, h6, a").each((_, element) => {
    const node = $(element);
    const tagName = element.tagName.toLowerCase();
    const text = node.text().trim().replace(/\s+/g, " ");

    if (!text) {
      return;
    }

    if (tagName.startsWith("h")) {
      currentGroup = { title: text, items: [] };
      groups.push(currentGroup);
      return;
    }

    const href = normalizePath(node.attr("href"));

    if (!href || seen.has(href)) {
      return;
    }

    if (!currentGroup) {
      currentGroup = { title: "Documentation", items: [] };
      groups.push(currentGroup);
    }

    currentGroup.items.push({
      title: text,
      href
    });
    seen.add(href);
  });

  return groups.filter((group) => group.items.length > 0);
};

const parseSidebarForSection = (html) => {
  const $ = cheerio.load(html);
  const groups = [];

  $("h5#sidebar-title").each((_, element) => {
    const title = $(element).text().trim().replace(/\s+/g, " ");
    const list = $(element).parent().next("ul#sidebar-group");

    if (!title || list.length === 0) {
      return;
    }

    const items = list.find("li").map((__, item) => {
      const node = $(item);
      const href = normalizePath(node.find("a").attr("href"));
      const itemTitle = (node.attr("data-title") || node.text()).trim().replace(/\s+/g, " ");

      if (!href || !itemTitle) {
        return null;
      }

      return {
        title: itemTitle,
        href
      };
    }).get().filter(Boolean);

    if (items.length > 0) {
      groups.push({ title, items });
    }
  });

  return groups;
};

const parseTopNav = (html, sidebar) => {
  const $ = cheerio.load(html);
  const seen = new Set();
  const items = [];

  $(".nav-tabs a.nav-tabs-item, header a[href], nav a[href]").each((_, element) => {
    const node = $(element);
    const href = normalizePath(node.attr("href"));
    const label = node.text().trim().replace(/\s+/g, " ");

    if (!href || !label || seen.has(href)) {
      return;
    }

    if (href.startsWith("/")) {
      items.push({ label, href });
      seen.add(href);
    }
  });

  if (items.length > 0) {
    return items;
  }

  return sidebar.slice(0, 6).map((group, index) => ({
    label: group.title,
    href: group.items[0]?.href || (index === 0 ? "/" : "/")
  }));
};

const buildFallbackSidebar = (pages) => {
  const groups = new Map();

  for (const page of pages) {
    const title = groupTitleFromPath(page.path);

    if (!groups.has(title)) {
      groups.set(title, []);
    }

    groups.get(title).push({
      title: page.title || titleCaseFallback(page.path),
      href: page.path
    });
  }

  return [...groups.entries()].map(([title, items]) => ({
    title,
    items: items.sort((a, b) => a.href.localeCompare(b.href))
  }));
};

const chunkArray = (values, size) => {
  const chunks = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
};

const pageAliasesForPath = (pathname) => {
  if (pathname === "/index") {
    return ["/"];
  }

  if (pathname.endsWith("/index")) {
    return [pathname.slice(0, -"/index".length)];
  }

  return [];
};

const resolvePagePath = (pathname, pageMap) => {
  if (pageMap.has(pathname)) {
    return pathname;
  }

  const normalizedIndexPath = pathname === "/" ? "/index" : `${pathname}/index`;
  if (pageMap.has(normalizedIndexPath)) {
    return normalizedIndexPath;
  }

  return pathname;
};

const parsePagesFromLLMSource = (text) => {
  const matches = [...text.matchAll(/^# (.+)\n+Source:\s+(https:\/\/docs\.openclaw\.ai[^\n]+)\n/gm)];

  return matches.map((match, index) => {
    const title = match[1].trim();
    const sourceUrl = match[2].trim();
    const bodyStart = match.index + match[0].length;
    const bodyEnd = index + 1 < matches.length ? matches[index + 1].index : text.length;
    const sourceMarkdown = text.slice(bodyStart, bodyEnd).trim();
    const pathname = normalizePath(sourceUrl);

    return {
      title,
      sourceUrl,
      path: pathname,
      slug: slugFromPath(pathname),
      sourceMarkdown,
      contentHash: createHash("sha256").update(sourceMarkdown).digest("hex"),
      generationHash: createHash("sha256")
        .update(sourceMarkdown)
        .update(OPENAI_MODEL)
        .update(OPENAI_BASE_URL)
        .update(PROMPT_VERSION)
        .digest("hex")
    };
  });
};

const safeJsonParse = (value) => {
  try {
    return JSON.parse(value);
  } catch (error) {
    const match = value.match(/\{[\s\S]*\}/);
    if (!match) {
      throw error;
    }
    return JSON.parse(match[0]);
  }
};

const parseTaggedContent = (value) => {
  const extract = (tag) => {
    const match = value.match(new RegExp(`\\[\\[\\[${tag}\\]\\]\\]([\\s\\S]*?)\\[\\[\\[\\/${tag}\\]\\]\\]`, "i"));
    return match?.[1]?.trim() || "";
  };

  const summaryMd = extract("SUMMARY");
  const explanationMd = extract("EXPLANATION");
  const seoDescription = extract("SEO");

  if (!summaryMd || !explanationMd || !seoDescription) {
    throw new Error(`Model output could not be parsed. Preview: ${value.slice(0, 500)}`);
  }

  return {
    summaryMd,
    explanationMd,
    seoDescription
  };
};

const parseGeneratedContent = (value) => {
  try {
    return safeJsonParse(value);
  } catch {
    return parseTaggedContent(value);
  }
};

const createPrompt = (page) => `
你是一个儿童说明书改写助手。请根据下面的原始文档内容，用简体中文输出固定标签格式。

目标：
1. 使用简体中文。
2. 让五岁小孩也能听懂。
3. 先给一个简要总结，再给更完整的“解释版”。
4. 原文里重要的安装、配置、操作步骤、命令、前提条件、限制、注意事项，不能省略。
5. 如果原文是教程或操作指南，要保留原来的大致步骤顺序。
6. 允许把难词讲简单，但不能把关键步骤删掉。
7. 如果原文里有专业词，先用一句很简单的话解释它像什么，再继续讲。
8. 不要乱编原文没有的步骤、参数或命令。
9. 语气要像大人耐心给小朋友讲，不要太正式，不要太像技术文档。
10. 可以用“像……一样”“你可以把它想成……”这样的比喻来帮助理解。
11. 讲步骤时，句子要短，先说“要做什么”，再说“怎么做”。
12. 不要输出代码块，不要输出解释说明，不要输出标签以外的额外文字。

输出格式必须严格如下：
[[[SUMMARY]]]
这里写 1 到 2 段 markdown 总结，总字数尽量控制在 180 字以内；要说清这页是做什么的、适合什么时候看；语气像给小朋友先讲一遍“这页在教什么”
[[[/SUMMARY]]]
[[[EXPLANATION]]]
这里写 4 到 8 段 markdown 解释。
要求：
- 如果原文有步骤，用编号列表保留关键步骤。
- 如果原文有命令、配置项、按钮名、页面名、参数名，可以保留原文英文写法并顺手解释。
- 如果原文有警告、限制、版本要求、平台差异，要单独讲出来。
- 每一步都用五岁小孩能听懂的话重说，不要只把原文直接翻译成正式中文。
- 可以先用一句话解释“这一步是在做什么”，再写具体动作。
- 如果某一步容易出错，要像提醒小朋友一样说清楚“这里要小心什么”。
- 总字数尽量控制在 900 字以内，但宁可稍长，也不要漏掉重要步骤。
[[[/EXPLANATION]]]
[[[SEO]]]
这里写 120 字以内的中文描述
[[[/SEO]]]

页面标题：${page.title}
页面地址：${page.sourceUrl}

原始内容：
${page.sourceMarkdown}
`.trim();

const requestModelText = async (prompt) => {
  const response = await fetch(`${OPENAI_BASE_URL}/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      input: prompt,
      max_output_tokens: 2600
    })
  });

  if (response.ok) {
    const payload = await response.json();
    return (
      payload.output_text ||
      payload.output?.flatMap((item) => item.content ?? []).map((item) => item.text ?? "").join("") ||
      ""
    );
  }

  if (response.status !== 404) {
    const errorText = await response.text();
    throw new Error(`OpenAI request failed: ${response.status} ${response.statusText} ${errorText}`);
  }

  const fallbackResponse = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      max_tokens: 2600,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    })
  });

  if (!fallbackResponse.ok) {
    const errorText = await fallbackResponse.text();
    throw new Error(`OpenAI fallback request failed: ${fallbackResponse.status} ${fallbackResponse.statusText} ${errorText}`);
  }

  const fallbackPayload = await fallbackResponse.json();
  return fallbackPayload.choices?.[0]?.message?.content ?? "";
};

const translateLabels = async (labels, existingTranslations) => {
  const translations = { ...existingTranslations, ...MANUAL_TRANSLATIONS };
  const pending = labels.filter((label) => label && !translations[label]);

  for (const batch of chunkArray(pending, 40)) {
    let translatedBatch = null;

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const prompt = `
把下面这些文档导航标签翻译成简体中文，要求简洁、适合导航菜单。

规则：
1. 返回严格 JSON 对象，键是原文，值是中文翻译。
2. 不要遗漏任何键。
3. 品牌名、产品名、协议名、缩写可保留原文或采用常见中文写法。
4. 不要输出 JSON 以外的任何内容。

标签列表：
${JSON.stringify(batch, null, 2)}
      `.trim();

      try {
        translatedBatch = safeJsonParse(await requestModelText(prompt));
        break;
      } catch (error) {
        if (attempt === 3) {
          throw error;
        }
        await sleep(500 * attempt);
      }
    }

    for (const label of batch) {
      const translated = translatedBatch?.[label];
      translations[label] = typeof translated === "string" && translated.trim() ? translated.trim() : label;
    }

    await writeNavTranslations(translations);
  }

  return translations;
};

const generateWithOpenAI = async (page) => {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required to generate simplified content.");
  }

  const basePrompt = createPrompt(page);

  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const prompt = attempt === 1
      ? basePrompt
      : `${basePrompt}\n\n上一次你的输出不完整或格式错误。这一次必须完整输出 SUMMARY、EXPLANATION、SEO 三个闭合标签，内容更短一点。`;

    try {
      const text = await requestModelText(prompt);
      return parseGeneratedContent(text);
    } catch (error) {
      if (attempt === 4) {
        throw error;
      }
      console.warn(`Retrying ${page.path} after failure on attempt ${attempt}: ${error.message}`);
      await sleep(1000 * attempt);
    }
  }
};

const readExistingSiteData = async () => {
  try {
    const file = await readFile(outputPath, "utf8");
    return JSON.parse(file);
  } catch {
    return null;
  }
};

const readExistingCache = async () => {
  try {
    const file = await readFile(cachePath, "utf8");
    return JSON.parse(file);
  } catch {
    return {};
  }
};

const readNavTranslations = async () => {
  try {
    const file = await readFile(navTranslationPath, "utf8");
    return JSON.parse(file);
  } catch {
    return {};
  }
};

const writeNavTranslations = async (translations) => {
  await writeFile(navTranslationPath, `${JSON.stringify(translations, null, 2)}\n`, "utf8");
};

const mapPageTitles = (sidebar, pages) => {
  const pageMap = new Map(pages.map((page) => [page.path, page]));

  for (const group of sidebar) {
    for (const item of group.items) {
      const page = pageMap.get(item.href);
      if (page && (!page.title || page.title === titleCaseFallback(page.path))) {
        page.title = item.title;
      }
    }
  }
};

const main = async () => {
  const [homepageHtml, llmSourceText, existingSiteData, existingCache, existingNavTranslations] = await Promise.all([
    fetchText(SOURCE_ORIGIN),
    fetchText(LLM_SOURCE_URL),
    readExistingSiteData(),
    readExistingCache(),
    readNavTranslations()
  ]);

  const topNav = parseTopNav(homepageHtml, []);
  const rawPages = parsePagesFromLLMSource(llmSourceText);
  const existingPages = new Map((existingSiteData?.pages ?? []).map((page) => [page.path, page]));
  for (const [pagePath, page] of Object.entries(existingCache)) {
    existingPages.set(pagePath, page);
  }

  const pageMap = new Map(rawPages.map((page) => [page.path, page]));
  const sidebarPaths = new Set();
  const sections = [];

  for (const item of topNav) {
    const html = await fetchText(new URL(item.href, SOURCE_ORIGIN).toString());
    const sidebar = parseSidebarForSection(html);
    const normalizedSidebar = (sidebar.length > 0 ? sidebar : buildFallbackSidebar(rawPages)).map((group) => ({
      title: group.title,
      items: group.items
        .map((entry) => {
          const actualPath = resolvePagePath(entry.href, pageMap);
          const page = pageMap.get(actualPath);

          if (!page) {
            return null;
          }

          sidebarPaths.add(actualPath);
          return {
            title: entry.title,
            href: entry.href,
            actualPath
          };
        })
        .filter(Boolean)
    })).filter((group) => group.items.length > 0);

    sections.push({
      key: item.href === "/" ? "get-started" : item.href.replace(/^\//, "").replace(/\//g, "-") || "root",
      label: item.label,
      href: item.href,
      actualPath: resolvePagePath(item.href, pageMap),
      sidebar: normalizedSidebar
    });
  }

  const pagesInSections = new Set(sections.flatMap((section) => section.sidebar.flatMap((group) => group.items.map((item) => item.actualPath))));
  const filteredPages = rawPages.filter((page) => {
    const inSidebar = pagesInSections.has(page.path) || page.path === "/index";
    const inRequestedSet = SYNC_ONLY_PATHS.length === 0 || SYNC_ONLY_PATHS.includes(page.path);
    return inSidebar && inRequestedSet;
  });
  const allVisiblePages = rawPages.filter((page) => pagesInSections.has(page.path) || page.path === "/index");
  const finalPages = new Array(filteredPages.length);
  let completed = 0;
  const persistedPages = Object.fromEntries([...existingPages.entries()]);
  let persistQueue = Promise.resolve();

  const persistCache = () => {
    const cachePayload = Object.fromEntries(
      Object.entries(persistedPages).sort((a, b) => a[0].localeCompare(b[0]))
    );
    persistQueue = persistQueue.then(() =>
      writeFile(cachePath, `${JSON.stringify(cachePayload, null, 2)}\n`, "utf8")
    );
    return persistQueue;
  };

  const processPage = async (page, index) => {
    const existingPage = existingPages.get(page.path);

    if (!SYNC_FORCE_PATHS.has(page.path) && existingPage && existingPage.generationHash === page.generationHash) {
      finalPages[index] = { ...existingPage, ...page };
      persistedPages[page.path] = finalPages[index];
      completed += 1;
      console.log(`[${completed}/${filteredPages.length}] cached ${page.path}`);
      return;
    }

    console.log(`[${completed + 1}/${filteredPages.length}] generating ${page.path}`);
    const generated = await generateWithOpenAI(page);
    finalPages[index] = {
      ...page,
      summaryMd: generated.summaryMd,
      explanationMd: generated.explanationMd,
      seoDescription: generated.seoDescription || `${page.title} 的儿童版中文解释`
    };
    persistedPages[page.path] = finalPages[index];
    await persistCache();
    completed += 1;
    console.log(`[${completed}/${filteredPages.length}] done ${page.path}`);
  };

  let cursor = 0;
  const workers = Array.from({ length: Math.max(1, SYNC_CONCURRENCY) }, async () => {
    while (cursor < filteredPages.length) {
      const currentIndex = cursor;
      cursor += 1;
      await processPage(filteredPages[currentIndex], currentIndex);
    }
  });

  await Promise.all(workers);
  await persistQueue;

  if (SYNC_ONLY_PATHS.length > 0) {
    for (const page of allVisiblePages) {
      const alreadyIncluded = finalPages.some((entry) => entry?.path === page.path);
      if (alreadyIncluded) {
        continue;
      }

      const existingPage = persistedPages[page.path] || existingPages.get(page.path);
      if (!existingPage) {
        continue;
      }

      finalPages.push({
        ...existingPage,
        ...page,
        summaryMd: existingPage.summaryMd,
        explanationMd: existingPage.explanationMd,
        seoDescription: existingPage.seoDescription
      });
    }
  }

  const finalPageMap = new Map(finalPages.map((page) => [page.path, page]));
  const navLabels = new Set();

  for (const section of sections) {
    navLabels.add(section.label);
    for (const group of section.sidebar) {
      navLabels.add(group.title);
      for (const item of group.items) {
        navLabels.add(item.title);
      }
    }
  }

  const navTranslations = await translateLabels([...navLabels], existingNavTranslations);
  const pageToSection = new Map();

  for (const section of sections) {
    for (const group of section.sidebar) {
      for (const item of group.items) {
        if (!pageToSection.has(item.actualPath)) {
          pageToSection.set(item.actualPath, section.key);
        }
      }
    }
  }

  const pathToPage = new Map(finalPages.map((page) => [page.path, page]));
  const normalizedSections = sections.map((section) => ({
    key: section.key,
    label: section.label,
    translatedLabel: navTranslations[section.label] || section.label,
    href: section.href,
    actualPath: pathToPage.has(section.actualPath) ? section.actualPath : resolvePagePath(section.href, pathToPage),
    sidebar: section.sidebar.map((group) => ({
      title: group.title,
      translatedTitle: navTranslations[group.title] || group.title,
      items: group.items.map((item) => ({
        title: item.title,
        translatedTitle: navTranslations[item.title] || item.title,
        href: item.href,
        actualPath: item.actualPath
      }))
    }))
  }));

  const siteData = {
    generatedAt: new Date().toISOString(),
    sourceOrigin: SOURCE_ORIGIN,
    firstPageSlug: finalPages[0]?.slug ?? "",
    homePagePath: resolvePagePath("/", pathToPage),
    topNav: normalizedSections.map((section) => ({
      key: section.key,
      label: section.label,
      translatedLabel: section.translatedLabel,
      href: section.href,
      actualPath: section.actualPath
    })),
    sections: normalizedSections,
    pages: finalPages
      .sort((a, b) => a.path.localeCompare(b.path))
      .map((page) => ({
        ...page,
        title: page.title || titleCaseFallback(page.path),
        sectionKey: pageToSection.get(page.path) || normalizedSections[0]?.key || "get-started",
        aliases: pageAliasesForPath(page.path)
      }))
  };

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(siteData, null, 2)}\n`, "utf8");
  console.log(`Wrote ${siteData.pages.length} pages to ${outputPath}`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
