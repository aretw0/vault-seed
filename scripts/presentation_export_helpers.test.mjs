import { test, expect } from "vitest";
import {
	verticalOutputFor,
	stripMarimoLayoutFile,
	presentationMobileFallbackRedirectHtml,
} from "./presentation_export_helpers.mjs";

test("verticalOutputFor maps *-slides.html to *-vertical.html", () => {
	expect(verticalOutputFor("visao-geral-slides.html")).toBe("visao-geral-vertical.html");
	expect(verticalOutputFor("o-lab-slides.html")).toBe("o-lab-vertical.html");
	expect(verticalOutputFor("agentes-slides.html")).toBe("agentes-vertical.html");
	// Non-slides outputs are returned unchanged.
	expect(verticalOutputFor("publishing.html")).toBe("publishing.html");
});

test("stripMarimoLayoutFile removes the slide layout so the export is vertical", () => {
	const slides = 'app = marimo.App(width="medium", layout_file="layouts/visao-geral.slides.json")';
	const stripped = stripMarimoLayoutFile(slides);
	expect(stripped, "layout_file kwarg must be gone").not.toMatch(/layout_file/);
	expect(stripped, "remaining App() call must stay valid").toMatch(/app = marimo\.App\(width="medium"\)/);
});

test("stripMarimoLayoutFile handles layout_file as the first argument", () => {
	const slides = 'app = marimo.App(layout_file="layouts/o-lab.slides.json", width="medium")';
	const stripped = stripMarimoLayoutFile(slides);
	expect(stripped).not.toMatch(/layout_file/);
	expect(stripped).toMatch(/width="medium"/);
	expect(stripped, "must not leave a dangling leading comma").not.toMatch(/marimo\.App\(\s*,/);
});

test("stripMarimoLayoutFile leaves non-presentation sources untouched", () => {
	const vertical = 'app = marimo.App(width="medium")';
	expect(stripMarimoLayoutFile(vertical)).toBe(vertical);
});

test("mobile fallback redirects a slides page to its vertical sibling", () => {
	const html = presentationMobileFallbackRedirectHtml("o-lab-vertical.html");
	expect(html).toMatch(/data-vault-marimo-presentation-mobile-fallback/);
	expect(html).toMatch(/max-width: 64rem.*pointer: coarse/);
	expect(html).toMatch(/location\.replace\("\.\/o-lab-vertical\.html"\)/);
	// Must not redirect when already on the vertical page (no loop).
	expect(html).toMatch(/!location\.pathname\.endsWith\("o-lab-vertical\.html"\)/);
});
