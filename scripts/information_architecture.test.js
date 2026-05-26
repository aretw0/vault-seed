const assert = require("node:assert/strict");
const { test } = require("node:test");

async function loadRuntime() {
  return import("../.site/lib/information-architecture.mjs");
}

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
