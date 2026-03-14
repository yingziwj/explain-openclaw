# Explain OpenClaw Roadmap

## Current Status

The site is already usable and deployable. Core content sync, Chinese rewrite, original navigation mirroring, Cloudflare Pages deployment, SEO baseline, and update automation are in place.

## Completed

### Content and site structure

- Mirrored the original OpenClaw docs navigation structure and sidebar grouping
- Translated top navigation and sidebar labels into Chinese
- Generated Chinese child-friendly summaries and explanations for visible docs pages
- Preserved important steps, commands, warnings, and configuration details more aggressively

### Sync and generation

- Added incremental sync based on homepage and `llms-full.txt` signatures
- Reduced scheduled sync frequency to every 3 days
- Reused cached pages when source content, model, and prompt version are unchanged
- Added prompt versioning so model or prompt changes trigger regeneration safely
- Added a dedicated high-risk regeneration flow based on audit output

### Quality control

- Added `npm run audit:content`
- Added report output at `reports/content-audit.md`
- Checks now cover:
  - missing summary or explanation
  - very short explanation on long source pages
  - command retention problems
  - procedural pages missing step language
  - summary/explanation over-duplication
  - placeholder text and suspicious key patterns

### SEO and sharing

- Added stronger page-level metadata fallback
- Added JSON-LD structured data for homepage and article pages
- Improved OG and Twitter metadata consistency
- Added favicon and social cover
- Added share/poster assets for marketing

### UX

- Added client-side local search in the header
- Search supports title, path, alias, and keyword matching
- Added optional ad placeholders without loading real ad scripts
- Added optional Cloudflare Web Analytics token-based script injection

## Important Commands

### Regenerate all content

```bash
npm run sync
```

### Audit generated pages

```bash
npm run audit:content
```

### Regenerate only high-risk pages from the audit report

```bash
npm run sync:high-risk
```

### Build the static site

```bash
npm run build
```

## Current Gaps

### Needs real regeneration run

The latest prompt improvements for command-heavy pages are already in code, but they still need to be executed with a live model key in an environment that can access `docs.openclaw.ai`.

Recommended sequence:

```bash
export OPENAI_API_KEY=...
export OPENAI_MODEL=deepseek-chat
export OPENAI_BASE_URL=https://api.deepseek.com
export PROMPT_VERSION=v4-kid-friendly-complete-command-safe
npm run sync:high-risk
npm run audit:content
npm run build
```

### High-risk pages still need another pass

The current audit report still shows command-retention issues concentrated in:

- automation pages
- channel integration pages
- CLI reference pages

These should be the next manual spot-check targets after the next regeneration run.

## Recommended Next Steps

### Before next deployment

1. Run `npm run sync:high-risk`
2. Run `npm run audit:content`
3. Spot-check 10 to 20 command-heavy pages
4. Run `npm run build`
5. Commit and push

### After deployment

1. Enable Cloudflare Web Analytics
2. Decide whether to expose ad placeholders in production
3. Review search behavior on mobile
4. Improve top 20 highest-traffic pages manually

## Environment Variables

### Required for content generation

- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `OPENAI_BASE_URL`
- `PROMPT_VERSION`

### Optional for site behavior

- `SITE_URL`
- `SOURCE_ORIGIN`
- `PUBLIC_ENABLE_AD_PLACEHOLDERS`
- `PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN`
