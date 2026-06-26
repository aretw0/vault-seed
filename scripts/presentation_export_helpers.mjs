// Pure helpers for the presentation mobile experience, extracted so they can be
// unit-tested without running a full Marimo export.
//
// Why these exist: on mobile, Marimo's reveal.js slide runtime breaks (it builds
// an empty slideTriggers list and then reads slideTriggers[length - 1], throwing
// a RangeError) and offers no scroll. Instead of running reveal on mobile, each
// presentation also exports a *vertical* sibling — the same notebook without the
// slide layout — and mobile is redirected to it: real content, native scroll, no
// reveal. Desktop keeps the slide deck untouched.

/**
 * Maps a presentation output (`*-slides.html`) to its vertical sibling
 * (`*-vertical.html`). Returns the input unchanged if it is not a slides output.
 */
export function verticalOutputFor(output) {
	return output.replace(/-slides\.html$/, "-vertical.html");
}

/**
 * Removes the `layout_file="layouts/*.slides.json"` kwarg from a `marimo.App(...)`
 * call so the same notebook exports in the default vertical layout (no reveal).
 * Leaves non-presentation sources untouched.
 */
export function stripMarimoLayoutFile(sourceCode) {
	return sourceCode
		.replace(/,?[ \t]*layout_file[ \t]*=[ \t]*(['"])[^'"]*\1/g, "")
		.replace(/marimo\.App\(\s*,/g, "marimo.App(");
}

/**
 * Builds the `<head>` script that, on a mobile viewport, redirects a slides page
 * to its vertical sibling. No-op on desktop and on the vertical page itself.
 */
export function presentationMobileFallbackRedirectHtml(verticalOutput) {
	const target = JSON.stringify(`./${verticalOutput}`);
	const name = JSON.stringify(verticalOutput);
	return String.raw`
<script data-vault-marimo-presentation-mobile-fallback>
(() => {
  const isMobileViewport = window.matchMedia("(max-width: 64rem), (pointer: coarse)").matches;
  if (isMobileViewport && !location.pathname.endsWith(${name})) {
    location.replace(${target});
  }
})();
</script>
`;
}
