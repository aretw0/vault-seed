const assert = require("node:assert/strict");
const { test } = require("node:test");
const { folders: configuredVaultFolders } = require("../.site/vault-folders.json");
const configuredSidebarSections = require("../.site/sidebar.sections.json");

async function loadRuntime() {
  return import("../.site/lib/information-architecture.mjs");
}

async function loadVaultFoldersRuntime() {
  return import("../.site/lib/vault-folders.mjs");
}

test("vault folder contract is shared from data to runtime", async () => {
  const { PUBLISHED_VAULT_FOLDERS, VAULT_FOLDERS } = await loadVaultFoldersRuntime();

  assert.deepEqual(VAULT_FOLDERS, configuredVaultFolders);
  assert.equal(VAULT_FOLDERS.includes("99 - Meta e Anexos"), true);
  assert.equal(PUBLISHED_VAULT_FOLDERS.includes("90 - Modelos"), false);
});

test("sidebar intent sections are backed by the shared information architecture", async () => {
  const { loadInformationArchitecture } = await loadRuntime();
  const ia = loadInformationArchitecture();
  const configuredIntents = configuredSidebarSections
    .filter((section) => Object.hasOwn(section, "intent"))
    .map((section) => section.intent);

  assert.deepEqual(configuredIntents, Object.keys(ia.intents));
  assert.equal(
    configuredSidebarSections.some((section) => section.directory === "docs"),
    true,
    "technical docs must remain an explicit sidebar section instead of leaking into intent sections",
  );
});

test("information architecture vocabulary normalizes aliases", async () => {
  const {
    getIntentLabel,
    loadInformationArchitecture,
    normalizeAudience,
    normalizeCategory,
  } = await loadRuntime();
  const ia = loadInformationArchitecture();

  assert.deepEqual(Object.keys(ia.intents), [
    "comecar",
    "organizar",
    "explorar",
    "publicar",
    "automatizar",
    "manter",
  ]);
  assert.equal(normalizeCategory("referência", ia), "referencia");
  assert.equal(normalizeAudience("técnico", ia), "tecnico");
  assert.equal(getIntentLabel("comecar", ia), "Começar");
});

test("information architecture derives explicit intents without broad guide fallback", async () => {
  const { deriveNoteIntents, loadInformationArchitecture } = await loadRuntime();
  const ia = loadInformationArchitecture();

  assert.deepEqual(
    deriveNoteIntents(
      { folder: "99 - Meta e Anexos", tags: ["meta/onboarding"], category: "guia" },
      ia,
      { fallback: null },
    ),
    ["comecar"],
  );

  assert.deepEqual(
    deriveNoteIntents(
      { folder: "99 - Meta e Anexos", tags: [], category: "guia" },
      ia,
      { fallback: null },
    ),
    [],
    "generic guide category must not make every guide appear in Começar",
  );

  assert.deepEqual(
    deriveNoteIntents(
      { folder: "40 - Recursos", tags: ["obsidian/templates"], category: "ferramenta" },
      ia,
      { fallback: null },
    ),
    ["organizar"],
  );
});

test("information architecture keeps a safe UI fallback separate from audit strictness", async () => {
  const { deriveNoteIntents, loadInformationArchitecture } = await loadRuntime();
  const ia = loadInformationArchitecture();

  assert.deepEqual(
    deriveNoteIntents({ folder: "", tags: [], category: "" }, ia),
    ["organizar"],
  );
  assert.deepEqual(
    deriveNoteIntents({ folder: "", tags: [], category: "" }, ia, { fallback: null }),
    [],
  );
});
