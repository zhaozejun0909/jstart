Locally bundled dependencies (no runtime CDN):

- **streaming-markdown 0.2.15**, MIT, https://github.com/thetarnav/streaming-markdown. `streaming-markdown.js` is the published `smd.min.js`, unchanged.
- **Temml 0.13.5**, MIT, https://github.com/ronkok/Temml. `temml.js` is the published `dist/temml.min.js` with `export default temml` appended for lazy ES module loading. `temml.css` is `dist/Temml-Local.css`; `Temml.woff2` is the accompanying script font. Temml is loaded only when an answer contains a formula.
- **speed-highlight 2.1.0**, CC0-1.0, https://github.com/speed-highlight/core. The published browser core and common language modules are under `speed-highlight/`; `github-dark.css` keeps only the theme's token colors so JStart retains its existing code font and spacing. The highlighter and each requested language are loaded on demand when a fenced code block closes.
- **opencc-js 1.4.2**, MIT and Apache-2.0, https://github.com/nk2028/opencc-js. `opencc-t2cn.js` is the published `dist/esm/t2cn.js` build, used to normalize Google suggestions to Simplified Chinese.

Both npm tarballs were checked against the registry's SHA-512 integrity before extraction. Licenses are included alongside the files.
