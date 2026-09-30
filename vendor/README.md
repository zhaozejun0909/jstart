Locally bundled dependencies (no runtime CDN):

- **streaming-markdown 0.2.15**, MIT, https://github.com/thetarnav/streaming-markdown. `streaming-markdown.js` is the published `smd.min.js`, unchanged.
- **speed-highlight 2.1.0**, CC0-1.0, https://github.com/speed-highlight/core. The published browser core and common language modules are under `speed-highlight/`; `github-dark.css` keeps only the theme's token colors so JStart retains its existing code font and spacing. The highlighter and each requested language are loaded on demand when a fenced code block closes.

Licenses are included alongside the files.
