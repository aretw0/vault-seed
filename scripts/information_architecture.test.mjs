import { test, expect } from "vitest";
import { execFileSync } from "node:child_process";
import __refarmJsonModule0 from "../.site/vault-folders.json" with { type: "json" };
import configuredSidebarSections from "../.site/sidebar.sections.json" with { type: "json" };
const { folders: configuredVaultFolders } = __refarmJsonModule0;

async function loadRuntime() {
  return import("../.site/lib/information-architecture.mjs");
}

async function loadVaultFoldersRuntime() {
  return import("../.site/lib/vault-folders.mjs");
}

async function loadAuditRuntime() {
  return import("../.site/lib/information-architecture-audit.mjs");
}

test("vault folder contract is shared from data to runtime", async () => {
  const { PUBLISHED_VAULT_FOLDERS, VAULT_FOLDERS } = await loadVaultFoldersRuntime();

  expect(VAULT_FOLDERS).toEqual(configuredVaultFolders);
  expect(VAULT_FOLDERS.includes("99 - Meta e Anexos")).toBe(true);
  expect(PUBLISHED_VAULT_FOLDERS.includes("90 - Modelos")).toBe(false);
});

test("sidebar intent sections are backed by the shared information architecture", async () => {
  const { loadInformationArchitecture } = await loadRuntime();
  const ia = loadInformationArchitecture();
  const configuredIntents = configuredSidebarSections
    .filter((section) => Object.hasOwn(section, "intent"))
    .map((section) => section.intent);

  expect(configuredIntents).toEqual(Object.keys(ia.intents));
  expect(configuredSidebarSections.some((section) => section.directory === "docs"), "technical docs must remain an explicit sidebar section instead of leaking into intent sections").toBe(true);
});

test("information architecture audit exposes a reusable machine-readable report", async () => {
  const { buildInformationArchitectureReport } = await loadAuditRuntime();
  const moduleReport = buildInformationArchitectureReport();
  const cliOutput = execFileSync(process.execPath, ["scripts/audit_information_architecture.mjs", "--json"], {
    encoding: "utf8",
  });
  const cliReport = JSON.parse(cliOutput);

  expect(cliReport).toEqual(moduleReport);
  expect(moduleReport.errors.length).toBe(0);
  expect(moduleReport.warnings.some((warning) => warning.startsWith("Distribuição por intenção"))).toBe(false);
  expect(moduleReport.notices.some((notice) => notice.startsWith("Distribuição por intenção"))).toBe(true);
  expect(moduleReport.notesEvaluated > 0).toBeTruthy();
  expect(moduleReport.intentDistribution.map(({ intent }) => intent)).toEqual(configuredSidebarSections
      .filter((section) => Object.hasOwn(section, "intent"))
      .map((section) => section.intent)
      .sort((a, b) => a.localeCompare(b, "pt")));
  expect(moduleReport.promotionCandidates.every((note) => note.file && note.title)).toBeTruthy();
  expect(moduleReport.thinPublishedResources.every((note) => Number.isInteger(note.words))).toBeTruthy();
});

test("information architecture vocabulary normalizes aliases", async () => {
  const {
    getIntentLabel,
    loadInformationArchitecture,
    normalizeAudience,
    normalizeCategory,
  } = await loadRuntime();
  const ia = loadInformationArchitecture();

  expect(Object.keys(ia.intents)).toEqual([
    "comecar",
    "organizar",
    "explorar",
    "publicar",
    "automatizar",
    "manter",
  ]);
  expect(normalizeCategory("referência", ia)).toBe("referencia");
  expect(normalizeAudience("técnico", ia)).toBe("tecnico");
  expect(getIntentLabel("comecar", ia)).toBe("Começar");
});

test("information architecture derives explicit intents without broad guide fallback", async () => {
  const { deriveNoteIntents, loadInformationArchitecture } = await loadRuntime();
  const ia = loadInformationArchitecture();

  expect(deriveNoteIntents(
      { folder: "99 - Meta e Anexos", tags: ["meta/onboarding"], category: "guia" },
      ia,
      { fallback: null },
    )).toEqual(["comecar"]);

  expect(deriveNoteIntents(
      { folder: "99 - Meta e Anexos", tags: [], category: "guia" },
      ia,
      { fallback: null },
    ), "generic guide category must not make every guide appear in Começar").toEqual([]);

  expect(deriveNoteIntents(
      { folder: "40 - Recursos", tags: ["obsidian/templates"], category: "ferramenta" },
      ia,
      { fallback: null },
    )).toEqual(["organizar"]);
});

test("information architecture keeps a safe UI fallback separate from audit strictness", async () => {
  const { deriveNoteIntents, loadInformationArchitecture } = await loadRuntime();
  const ia = loadInformationArchitecture();

  expect(deriveNoteIntents({ folder: "", tags: [], category: "" }, ia)).toEqual(["organizar"]);
  expect(deriveNoteIntents({ folder: "", tags: [], category: "" }, ia, { fallback: null })).toEqual([]);
});
