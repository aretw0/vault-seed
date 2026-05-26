#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import { buildInformationArchitectureReport } from "../.site/lib/information-architecture-audit.mjs";

function runCli(argv = process.argv.slice(2)) {
  const json = argv.includes("--json");
  const report = buildInformationArchitectureReport();

  if (json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`IA audit: ${report.notesEvaluated} nota(s) publicada(s) avaliadas.`);
    if (report.warnings.length) {
      for (const warning of report.warnings) console.warn(`[warn] ${warning}`);
    }
    if (report.notices?.length) {
      for (const notice of report.notices) console.log(`[info] ${notice}`);
    }
  }

  if (report.errors.length) {
    if (!json) {
      console.error("IA audit failed:");
      for (const error of report.errors) console.error(`- ${error}`);
    }
    process.exit(1);
  }

  if (!json) {
    console.log("IA audit passed.");
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runCli();
}
