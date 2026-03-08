import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: process.env.SITE_URL || "https://explain-openclaw.pages.dev",
  output: "static",
  integrations: [sitemap()]
});
