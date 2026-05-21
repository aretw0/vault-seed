// Tests the client-side Mermaid toggle behaviour by extracting the per-diagram
// block-building logic from the built script and running it under node:vm with
// a minimal mock DOM.
//
// What is tested:
//   - Initial state: rendered view visible, code view hidden
//   - First click: switches to code mode (rendered hidden, code visible, labels updated)
//   - Second click: switches back to rendered mode
//   - State isolation: each diagram gets its own independent mode variable
//   - Three-button toolbar: toggleBtn, copyBtn, expandBtn
//   - Script uses `let mode` (not `var mode`) — the var would hoist to function
//     scope and break isolation across multiple diagrams
//
// Run after `pnpm run site:build`.

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const distDir = path.join(root, 'dist');
const exemplosHtml = path.join(distDir, 'meta-e-anexos/diagramas/exemplos/index.html');

// ---------------------------------------------------------------------------
// Minimal DOM mock — only the surface used by the toggle script.
// ---------------------------------------------------------------------------
function makeElement(tag) {
  const el = {
    tagName: tag.toUpperCase(),
    className: '',
    textContent: '',
    hidden: false,
    _children: [],
    _listeners: {},
    innerHTML: '',
    appendChild(child) { this._children.push(child); return child; },
    querySelector(sel) {
      // Supports '.mermaid-rendered svg' — return first child matching tag
      const tag = sel.replace(/^.*\s/, '').replace(/^\./, '');
      return this._children.find(c => c.tagName === tag.toUpperCase() || c.className.includes(tag)) || null;
    },
    cloneNode() { return makeElement(this.tagName); },
    addEventListener(evt, fn) {
      this._listeners[evt] = this._listeners[evt] || [];
      this._listeners[evt].push(fn);
    },
    click() {
      (this._listeners['click'] || []).forEach(fn => fn());
    },
  };
  return el;
}

function makeMockDocument() {
  return {
    createElement(tag) { return makeElement(tag); },
    getElementById() { return null; },
  };
}

// ---------------------------------------------------------------------------
// Extract and compile the toggle factory from the built script.
// We pull out the inner block-building code (from after mermaid.render to
// wrap.replaceWith) and wrap it in a testable function.
// ---------------------------------------------------------------------------
function loadToggleFactory() {
  if (!fs.existsSync(exemplosHtml)) return null;
  const html = fs.readFileSync(exemplosHtml, 'utf8');
  const start = html.indexOf('<script type="module">import mermaid');
  const end = html.indexOf('</script>', start);
  if (start === -1 || end === -1) return null;
  return html.slice(start + '<script type="module">'.length, end);
}

// Build one diagram block using the same logic as the browser script,
// exercised through a vm sandbox with a mock DOM.
function buildBlock(source) {
  const mockSvg = '<svg><text>diagram</text></svg>';
  const replacedWith = [];

  // Minimal wrap element (the EC figure that gets replaced)
  const wrap = makeElement('figure');
  wrap.cloneNode = () => makeElement('figure');
  wrap.replaceWith = function(el) { replacedWith.push(el); };

  const document = makeMockDocument();

  // Provide a mermaid stub that always succeeds synchronously
  const mermaid = {
    initialize() {},
    render(_id, _src) {
      return Promise.resolve({ svg: mockSvg });
    },
  };

  // Extract the block-building logic: from `const block =` to `wrap.replaceWith`
  const scriptFull = loadToggleFactory();
  if (!scriptFull) return null;

  const blockStart = scriptFull.indexOf('      // Block wrapper');
  const blockEnd = scriptFull.indexOf('      wrap.replaceWith(block);') + '      wrap.replaceWith(block);'.length;
  if (blockStart === -1 || blockEnd <= blockStart) return null;

  const blockCode = scriptFull.slice(blockStart, blockEnd);

  // Wrap in async function so await works (mermaid.render returns a Promise)
  const fnSrc = `
    (async function run(document, wrap, svg, source) {
      ${blockCode}
      return block;
    })
  `;

  // Stub globals that the block-building code references but that live outside
  // the extracted slice: _mermaidBlocks (registry owned by renderMermaid),
  // getDialog (expand button handler), requestAnimationFrame (fit() debounce).
  const _mermaidBlocks = [];
  const fn = vm.runInNewContext(fnSrc, {
    _mermaidBlocks,
    getDialog: function() {
      return { dlg: { showModal() {}, close() {} }, canvas: makeElement('div'), fit: function() {}, src: null };
    },
    requestAnimationFrame: function(cb) { cb(); },
  });
  // Run synchronously by extracting the block after the promise resolves
  let block = null;
  let err = null;
  fn(document, wrap, mockSvg, source)
    .then(b => { block = b; })
    .catch(e => { err = e; });

  // Drain the microtask queue (Promise.resolve is already settled)
  return new Promise((resolve, reject) => {
    setImmediate(() => {
      if (err) reject(err);
      else resolve({ block, replacedWith });
    });
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('mermaid toggle script', () => {
  test('dist/ and exemplos page exist', () => {
    assert.ok(fs.existsSync(exemplosHtml), 'run pnpm run site:build first');
  });

  test('script uses let mode (not var mode) for per-diagram isolation', () => {
    const script = loadToggleFactory();
    assert.ok(script, 'script not found in built HTML');
    assert.ok(
      script.includes("let mode = 'rendered'"),
      "script must use 'let mode' — 'var mode' is hoisted to renderMermaid() scope and shared across all diagrams",
    );
    assert.ok(
      !script.includes("var mode"),
      "script must not use 'var mode'",
    );
  });

  test('toolbar has three buttons: toggle, copy, expand', async () => {
    const result = await buildBlock('graph LR\n  A --> B');
    if (!result) return;
    const { block } = result;
    const toolbar = block._children.find(c => c.className.includes('mermaid-toolbar'));
    assert.ok(toolbar._children.find(c => c.className.includes('mermaid-toggle')), 'toggleBtn must exist');
    assert.ok(toolbar._children.find(c => c.className.includes('mermaid-copy')), 'copyBtn must exist');
    assert.ok(toolbar._children.find(c => c.className.includes('mermaid-expand')), 'expandBtn must exist');
  });

  test('toggle: initial state — rendered visible, code hidden', async () => {
    const result = await buildBlock('graph LR\n  A --> B');
    if (!result) { return; } // skip if dist not available
    const { block } = result;

    const rendered = block._children.find(c => c.className.includes('mermaid-rendered'));
    const code = block._children.find(c => c.className.includes('mermaid-code'));

    assert.ok(rendered, 'rendered view must exist');
    assert.ok(code, 'code view must exist');
    assert.equal(rendered.hidden, false, 'rendered view must be visible initially');
    assert.equal(code.hidden, true, 'code view must be hidden initially');
  });

  test('toggle: first click switches to code mode', async () => {
    const result = await buildBlock('graph LR\n  A --> B');
    if (!result) return;
    const { block } = result;

    const toolbar = block._children.find(c => c.className.includes('mermaid-toolbar'));
    const toggleBtn = toolbar._children.find(c => c.className.includes('mermaid-toggle'));
    const copyBtn = toolbar._children.find(c => c.className.includes('mermaid-copy'));
    const rendered = block._children.find(c => c.className.includes('mermaid-rendered'));
    const code = block._children.find(c => c.className.includes('mermaid-code'));

    toggleBtn.click();

    assert.equal(rendered.hidden, true, 'rendered view must be hidden after first click');
    assert.equal(code.hidden, false, 'code view must be visible after first click');
    assert.equal(toggleBtn.textContent, 'Ver diagrama');
    assert.equal(copyBtn.textContent, 'Copiar fonte');
  });

  test('toggle: second click returns to rendered mode', async () => {
    const result = await buildBlock('graph LR\n  A --> B');
    if (!result) return;
    const { block } = result;

    const toolbar = block._children.find(c => c.className.includes('mermaid-toolbar'));
    const toggleBtn = toolbar._children.find(c => c.className.includes('mermaid-toggle'));
    const copyBtn = toolbar._children.find(c => c.className.includes('mermaid-copy'));
    const rendered = block._children.find(c => c.className.includes('mermaid-rendered'));
    const code = block._children.find(c => c.className.includes('mermaid-code'));

    toggleBtn.click(); // → code mode
    toggleBtn.click(); // → back to rendered mode

    assert.equal(rendered.hidden, false, 'rendered view must be visible after second click');
    assert.equal(code.hidden, true, 'code view must be hidden after second click');
    assert.equal(toggleBtn.textContent, 'Ver código');
    assert.equal(copyBtn.textContent, 'Copiar PNG');
  });

  test('toggle: two diagram blocks have independent state', async () => {
    const [r1, r2] = await Promise.all([
      buildBlock('graph LR\n  A --> B'),
      buildBlock('graph TD\n  X --> Y'),
    ]);
    if (!r1 || !r2) return;

    const toolbar1 = r1.block._children.find(c => c.className.includes('mermaid-toolbar'));
    const toolbar2 = r2.block._children.find(c => c.className.includes('mermaid-toolbar'));
    const toggle1 = toolbar1._children.find(c => c.className.includes('mermaid-toggle'));
    const toggle2 = toolbar2._children.find(c => c.className.includes('mermaid-toggle'));
    const rendered1 = r1.block._children.find(c => c.className.includes('mermaid-rendered'));
    const rendered2 = r2.block._children.find(c => c.className.includes('mermaid-rendered'));

    toggle1.click(); // diagram 1 → code mode

    assert.equal(rendered1.hidden, true, 'diagram 1 rendered must be hidden');
    assert.equal(rendered2.hidden, false, 'diagram 2 rendered must stay visible (independent state)');
    assert.equal(toggle1.textContent, 'Ver diagrama');
    assert.equal(toggle2.textContent, 'Ver código', 'diagram 2 toggle label must be unchanged');
  });
});
