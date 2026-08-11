# Fonts

Both families here are licensed under the **SIL Open Font License, Version
1.1** (<https://openfontlicense.org>), which permits bundling and serving them
with this app.

| File | Family | Copyright |
| --- | --- | --- |
| `saira-condensed-600.woff2`, `saira-condensed-700.woff2` | Saira Condensed | © 2017 The Saira Project Authors (<https://github.com/Omnibus-Type/Saira>) |
| `barlow-400.woff2`, `barlow-500.woff2`, `barlow-600.woff2` | Barlow | © 2017 The Barlow Project Authors (<https://github.com/jpt/barlow>) |

These are the `latin` subsets as cut by Google Fonts, copied here rather than
linked from a CDN on purpose: this app must not load anything from a
third-party origin for as long as it handles a visitor's routing API key
(`CLAUDE.md`, `docs/adr/0002-restrict-and-contain-the-browser-held-routing-key.md`),
and the production Content-Security-Policy only permits `font-src 'self'`.
