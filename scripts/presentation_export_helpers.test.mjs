import test from "node:test";
import assert from "node:assert/strict";
import {
	verticalOutputFor,
	stripMarimoLayoutFile,
	presentationMobileFallbackRedirectHtml,
} from "./presentation_export_helpers.mjs";

test("verticalOutputFor maps *-slides.html to *-vertical.html", () => {
	assert.equal(verticalOutputFor("visao-geral-slides.html"), "visao-geral-vertical.html");
	assert.equal(verticalOutputFor("o-lab-slides.html"), "o-lab-vertical.html");
	assert.equal(verticalOutputFor("agentes-slides.html"), "agentes-vertical.html");
	// Non-slides outputs are returned unchanged.
	assert.equal(verticalOutputFor("publishing.html"), "publishing.html");
});

test("stripMarimoLayoutFile removes the slide layout so the export is vertical", () => {
	const slides = 'app = marimo.App(width="medium", layout_file="layouts/visao-geral.slides.json")';
	const stripped = stripMarimoLayoutFile(slides);
	assert.doesNotMatch(stripped, /layout_file/, "layout_file kwarg must be gone");
	assert.match(stripped, /app = marimo\.App\(width="medium"\)/, "remaining App() call must stay valid");
});

test("stripMarimoLayoutFile handles layout_file as the first argument", () => {
	const slides = 'app = marimo.App(layout_file="layouts/o-lab.slides.json", width="medium")';
	const stripped = stripMarimoLayoutFile(slides);
	assert.doesNotMatch(stripped, /layout_file/);
	assert.match(stripped, /width="medium"/);
	assert.doesNotMatch(stripped, /marimo\.App\(\s*,/, "must not leave a dangling leading comma");
});

test("stripMarimoLayoutFile leaves non-presentation sources untouched", () => {
	const vertical = 'app = marimo.App(width="medium")';
	assert.equal(stripMarimoLayoutFile(vertical), vertical);
});

test("mobile fallback redirects a slides page to its vertical sibling", () => {
	const html = presentationMobileFallbackRedirectHtml("o-lab-vertical.html");
	assert.match(html, /data-vault-marimo-presentation-mobile-fallback/);
	assert.match(html, /max-width: 64rem.*pointer: coarse/);
	assert.match(html, /location\.replace\("\.\/o-lab-vertical\.html"\)/);
	// Must not redirect when already on the vertical page (no loop).
	assert.match(html, /!location\.pathname\.endsWith\("o-lab-vertical\.html"\)/);
});
