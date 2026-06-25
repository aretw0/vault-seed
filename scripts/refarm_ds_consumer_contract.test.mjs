import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

function read(path) {
  return readFileSync(join(ROOT, path), "utf8");
}

function blockVars(css, selector) {
  const index = css.indexOf(selector);
  assert.notEqual(index, -1, `missing selector: ${selector}`);
  const open = css.indexOf("{", index);
  const close = css.indexOf("}", open);
  const block = css.slice(open + 1, close);
  return Object.fromEntries(
    Array.from(block.matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/g)).map(
      ([, name, value]) => [name, value.trim()],
    ),
  );
}

test("Lab consumes the Refarm DS verde-jardim tarball for exported notebooks", () => {
  const pkg = JSON.parse(read("package.json"));
  assert.equal(
    pkg.devDependencies["@refarm.dev/ds"],
    "file:vendor/refarm.dev-ds-0.1.0.tgz",
  );

  const dsCss = read("node_modules/@refarm.dev/ds/src/themes/verde-jardim.css");
  const exportNotebooks = read("scripts/export_notebooks.mjs");
  const marimoCss = read(".site/styles/marimo-vault.css");

  assert.match(dsCss, /\[data-refarm-theme="verde-jardim"\]\[data-mode="light"\]/);
  assert.match(exportNotebooks, /REFARM_DS_VERDE_JARDIM_CSS/);
  assert.match(exportNotebooks, /root\.dataset\.refarmTheme = "verde-jardim"/);
  assert.match(exportNotebooks, /root\.dataset\.mode = resolved/);

  assert.match(marimoCss, /:root:not\(\[data-refarm-theme\]\)/);
  assert.doesNotMatch(
    marimoCss,
    /:root,\s*:root\[data-vault-marimo-theme="light"\],\s*\.light,\s*\.light-theme\s*\{[\s\S]*--background:/,
  );
});

test("Lab fallback verde-jardim values stay aligned with the DS light and dark modes", () => {
  const dsCss = read("node_modules/@refarm.dev/ds/src/themes/verde-jardim.css");
  const marimoCss = read(".site/styles/marimo-vault.css");

  const dsLight = blockVars(
    dsCss,
    '[data-refarm-theme="verde-jardim"][data-mode="light"]',
  );
  const dsDark = blockVars(dsCss, '[data-refarm-theme="verde-jardim"]');
  const labLight = blockVars(
    marimoCss,
    ':root[data-vault-marimo-theme="light"]:not([data-refarm-theme])',
  );
  const labDark = blockVars(
    marimoCss,
    ':root[data-vault-marimo-theme="dark"]:not([data-refarm-theme])',
  );

  for (const token of [
    "background",
    "foreground",
    "card",
    "card-foreground",
    "popover",
    "popover-foreground",
    "primary",
    "primary-foreground",
    "secondary",
    "secondary-foreground",
    "muted",
    "muted-foreground",
    "accent",
    "accent-foreground",
    "border",
    "input",
    "ring",
  ]) {
    assert.equal(labLight[token], dsLight[token], `light ${token}`);
    assert.equal(labDark[token], dsDark[token], `dark ${token}`);
  }
});
