# Sleeve portable demo

A self-contained copy of the existing Sleeve UI concept. The original project is preserved. This copy contains the editable source and public assets; the ready-to-run build lives at `../../public/demos/sleeve/`.

See `../../handoff/SLEEVE-DEMO.md` for integration details and validation.

Portfolio-hosted entry: `/demos/sleeve/index.html#/templates` (keep the explicit `index.html` for Vite dev). Standalone `dev --port 5193` entry: `http://127.0.0.1:5193/#/templates`.

## Commands

```sh
pnpm install --frozen-lockfile
pnpm run dev --port 5193
pnpm run build
pnpm run build:demo
```

- `build` writes only this copy's `dist/`.
- `build:demo` writes the portfolio's generated `public/demos/sleeve/` directory.
- The root portfolio does not need to install these dependencies just to serve the supplied demo.
- Use Node 20.19+ or 22.12+ and pnpm 10.31.0.
- Both builds use relative paths and local fonts.
- UI labels currently use English; Chinese text input is supported. The portfolio language switch has not been wired into this isolated application.
- The default architecture image is AI-generated demonstration imagery, not the portfolio owner's photography.

Original application features and all seven templates are preserved. No root homepage interaction has been added in this packaging task.

