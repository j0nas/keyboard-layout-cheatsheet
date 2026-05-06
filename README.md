# keyboard-layout-cheatsheet

Cheatsheets for the keys actually in front of you.

Existing keyboard-shortcut sites assume US-ANSI. Pick AeroSpace's `Alt+/` on a
Norwegian Mac and the docs lie about what to press: it's actually `Option + -`.
This site translates each app's defaults to the physical keys produced by your
layout — automatically, deterministically, without curating a separate cheatsheet
per layout.

## How it works

Two inputs:

1. **App's default bindings**, captured once from each app's source/docs.
2. **App's interpretation model**:
   - `positional` — app reads virtual key codes directly. Binding key names
     refer to physical positions, not characters. Example: AeroSpace, i3, sxhkd.
   - `symbolic` — app reads characters after the OS layout maps them. User has
     to press whatever combo produces that character. Example: Vim's `<C-/>`,
     tmux.

One layout-specific input:

3. **Keyboard layout** — a map from canonical key names (e.g. `Slash`, `Section`,
   `A`) to characters under each modifier state. Sourced from open layout data
   (macOS .keylayout XML, Windows kbdlayout.info JSON, Linux xkbcommon).

The translator resolves `(binding, app, layout)` → `{key the user must press,
character printed on it, modifiers}`. See `src/lib/translate.ts`.

## Project layout

```
src/
├── data/
│   ├── apps/         # default bindings + interpretation model per app (JSON)
│   └── layouts/      # keymap per layout (JSON)
├── lib/
│   ├── types.ts      # Layout, App, Binding, TranslatedBinding
│   ├── keys.ts       # canonical key-name resolution
│   ├── translate.ts  # core translator
│   └── translate.test.ts
├── components/
│   ├── Cheatsheet.tsx   # React island: app/layout pickers + list view
│   └── Keyboard.tsx     # React island: visual keyboard with bindings overlaid
├── layouts/
│   └── Layout.astro     # base HTML shell, imports global.css
└── pages/
    └── index.astro      # entry point
```

## Commands

Package manager is pnpm (≥11). `pnpm install` once, then:

| Command            | Action                                         |
| :----------------- | :--------------------------------------------- |
| `pnpm dev`         | Dev server at `localhost:4321`                 |
| `pnpm build`       | Build static site to `./dist/`                 |
| `pnpm preview`     | Preview the production build                   |
| `pnpm check`       | Astro + TypeScript diagnostics                 |
| `pnpm test`        | Run Vitest once                                |
| `pnpm test:watch`  | Run Vitest in watch mode                       |
| `pnpm lint`        | Biome lint check                               |
| `pnpm lint:fix`    | Biome lint + safe autofix                      |
| `pnpm format`      | Biome format                                   |
| `pnpm verify`      | lint + check + test (run before committing)    |

## Stack

Astro 6 + React 19 (islands) + Tailwind v4. Biome for lint/format. Vitest for
the translator unit tests. Strict TypeScript. Static output — deployable to any
CDN. Package manager: pnpm 11.

## Adding an app

Drop a JSON file in `src/data/apps/`:

```json
{
  "id": "myapp",
  "name": "My App",
  "interpretationModel": "positional",
  "bindings": [
    { "keys": ["alt", "slash"], "action": "Do thing", "category": "Stuff" }
  ]
}
```

Then list it in `src/pages/index.astro`'s `apps` array.

Binding key tokens: modifiers (`cmd`, `ctrl`, `alt`, `shift`) plus exactly one
non-modifier key. Non-modifier keys can be:

- A single letter `a`-`z`
- A digit `0`-`9`
- A named key: `slash`, `comma`, `period`, `minus`, `equal`, `semicolon`,
  `quote`, `leftbracket`, `rightbracket`, `backslash`, `grave`/`backtick`,
  `section`/`sectionsign` (ISO-only)

## Adding a layout

Layout JSONs are generated, not hand-written. On macOS:

```sh
npm run gen:mac-layouts
```

This runs `tools/dump-mac-layouts.swift`, which uses Apple's `UCKeyTranslate`
Carbon API to dump every layout the system has installed (≈250 of them) into
`src/data/layouts/`. The dumper is the source of truth — never edit those files
by hand.

Future generators for Windows (kbdlayout.info JSON) and Linux (xkbcommon /
xkeyboard-config) emit into the same directory in the same shape.

## Spike scope (current)

- **Apps**: AeroSpace (positional), Vim (symbolic) — both interpretation models
  live and validated.
- **Layouts**: every layout shipped by macOS, dumped via UCKeyTranslate.
  ~249 entries.
- **Routes**: `/` (live picker) + `/app/[appId]/[layoutId]` for every combo
  (~500 static pages).
- **UI**: app + layout dropdowns, full-text binding filter, virtual keyboard
  showing all 4 modifier states per key (base / shift / alt / alt+shift) with
  bindings highlighted, hover-to-cross-highlight between binding rows and
  keyboard.
- **Tests**: Vitest covers both interpretation models including layout-specific
  assertions (e.g., AeroSpace's `alt-slash` resolves to Option+`-` on Norwegian
  Mac, Vim's `Ctrl+/` resolves to Ctrl+Shift+7).

## Next

- Generators for Windows (kbdlayout.info) and Linux (xkbcommon) layouts.
- More apps. Quick wins: tmux (symbolic), i3 (positional), VS Code's
  default keymap, JetBrains, sxhkd, Hyprland.
- ANSI/ISO chassis toggle in the UI (currently each layout has a hard default —
  US-family layouts default ANSI, others ISO).
- Print-friendly view → physical product upsell pathway (A3 paper, laser-
  engraved bamboo).
- URL-driven picker state so the picker writes to `/app/.../...` as you change
  it, making cheatsheets shareable by URL.
