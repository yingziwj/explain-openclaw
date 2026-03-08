# OpenClaw 中文解释版

这个项目会把 [docs.openclaw.ai](https://docs.openclaw.ai/) 的文档同步过来，保留原站导航结构，再把每一页转换成：

- 五岁小孩也能听懂的简体中文“简要总结”
- 五岁小孩也能听懂、但不省略关键步骤的简体中文“解释版”

站点适合部署到 Cloudflare Pages，默认目标域名是 `https://explain-openclaw.pages.dev`。

## 技术方案

- 前端：Astro 静态站点
- 内容同步：`scripts/sync-docs.mjs`
- 内容来源：
  - 导航：抓取原站顶部导航和各栏目侧边导航结构
  - 正文：抓取原站 `llms-full.txt`
- 内容生成：调用大语言模型，把原文改写成儿童可理解、但保留关键步骤的中文
- 自动更新：GitHub Actions 每天执行一次 `npm run sync`
  - 默认先做轻量检查，只抓首页和 `llms-full.txt`
  - 只有检测到导航或内容索引变化时，才进入全量同步和重生成
- SEO：静态页面、canonical、sitemap、robots、可索引 URL

## 本地开发

```bash
npm install
npm run dev
```

如果要重新抓取并生成内容：

```bash
export OPENAI_API_KEY=your_key
export OPENAI_MODEL=deepseek-chat
export OPENAI_BASE_URL=https://api.deepseek.com
export PROMPT_VERSION=v3-kid-friendly-but-complete
npm run sync
```

然后构建：

```bash
npm run build
```

## 环境变量

- `OPENAI_API_KEY`：必填，用于生成儿童版中文内容
- `OPENAI_MODEL`：推荐 `deepseek-chat`
- `OPENAI_BASE_URL`：推荐 `https://api.deepseek.com`
- `PROMPT_VERSION`：推荐 `v3-kid-friendly-but-complete`
- `SOURCE_ORIGIN`：可选，默认 `https://docs.openclaw.ai`
- `SITE_URL`：可选，默认 `https://explain-openclaw.pages.dev`

## Cloudflare Pages 部署

1. 把本项目推到 GitHub。
2. 在 Cloudflare Pages 创建新项目并连接 GitHub 仓库。
3. 构建命令填 `npm run build`。
4. 输出目录填 `dist`。
5. 项目名建议用 `explain-openclaw`，这样默认域名就是 `explain-openclaw.pages.dev`。
6. 在 Pages 项目里配置环境变量：
   - `SITE_URL=https://explain-openclaw.pages.dev`
   - `OPENAI_API_KEY=你的 DeepSeek key`
   - `OPENAI_MODEL=deepseek-chat`
   - `OPENAI_BASE_URL=https://api.deepseek.com`
   - `PROMPT_VERSION=v3-kid-friendly-but-complete`

## Git 提交流程

如果你还没初始化仓库，先在项目目录执行：

```bash
git init -b main
git add .
git commit -m "feat: initial explain-openclaw site"
```

然后创建 GitHub 仓库并关联远端：

```bash
git remote add origin git@github.com:<your-account>/explain-openclaw2.git
git push -u origin main
```

如果你更习惯 HTTPS，也可以把远端换成：

```bash
git remote add origin https://github.com/<your-account>/explain-openclaw2.git
git push -u origin main
```

以后内容更新的本地提交流程：

```bash
git add src/generated package.json astro.config.mjs src .github/workflows README.md
git commit -m "chore: update docs content"
git push
```

## 每日自动更新

仓库里已经带了 GitHub Actions：

- 文件：`/.github/workflows/daily-sync.yml`
- 频率：每天 UTC 02:00 运行一次
- 作用：
  - 先抓原站首页和 `llms-full.txt` 做轻量签名比对
  - 如果首页导航和文档内容索引都没变，就直接跳过，不做全量同步
  - 只有检测到变化时，才重生成 `src/generated/site-data.json` 并自动提交

需要在 GitHub 仓库 Secrets 中配置：

- `OPENAI_API_KEY`
- `OPENAI_MODEL=deepseek-chat`
- `OPENAI_BASE_URL=https://api.deepseek.com`
- `PROMPT_VERSION=v3-kid-friendly-but-complete`

Cloudflare Pages 连接 GitHub 后，新的 commit 会自动重新部署。

每日同步现在会一起提交这些生成文件：

- `src/generated/site-data.json`
- `src/generated/page-cache.json`
- `src/generated/nav-translation-cache.json`

## 广告联盟准备

项目已经预留了：

- `/ads.txt`
- 干净的静态 HTML 结构
- 适合继续补充文章描述、结构化数据和广告位容器

等 Google AdSense 审核通过后，只需要把广告脚本和 `ads.txt` 的真实发布商行补进去即可。
