import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const reportPath = path.join(projectRoot, "reports", "content-audit.md");

const limit = Math.max(1, Number(process.env.AUDIT_HIGH_RISK_LIMIT || "20"));
const report = await readFile(reportPath, "utf8");
const highRiskPaths = [...report.matchAll(/^- \[HIGH\] (\S+)/gm)].map((match) => match[1]).slice(0, limit);

if (highRiskPaths.length === 0) {
  console.log("No high-risk paths found in reports/content-audit.md");
  process.exit(0);
}

console.log(`Regenerating ${highRiskPaths.length} high-risk pages from audit report...`);
console.log(highRiskPaths.join(", "));

const child = spawn(
  process.execPath,
  [path.join(projectRoot, "scripts", "sync-docs.mjs")],
  {
    cwd: projectRoot,
    stdio: "inherit",
    env: {
      ...process.env,
      SYNC_ONLY_PATHS: highRiskPaths.join(","),
      SYNC_FORCE_PATHS: highRiskPaths.join(",")
    }
  }
);

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
