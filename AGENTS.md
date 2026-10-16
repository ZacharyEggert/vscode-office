<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, and it invokes Vite through `vp dev` and `vp build`. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

Docs are local at `node_modules/vite-plus/docs` or online at https://viteplus.dev/guide/.

## Built-in Commands vs Scripts

`vp <name>` runs a built-in command. `vp run <name>` runs a `package.json` script or a `vite.config.ts` task. Scripts cannot overwrite built-ins, so `vp dev` and `vp run dev` may do different things. Check `package.json` and `vite.config.ts` first, and run `vp run <name>` when the project defines a script or task with that name.

## Tool Versions

Run `vp toolchain` to show versions and relationships in the active Vite+
release. Add a tool name to select part of the graph. For example, run
`vp toolchain vite`. Use `--global` to ignore the local `vite-plus` package. Use
`vp why <package>` to show the package-manager dependency graph.

## Review Checklist

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to format, lint, type check and test changes.
- [ ] Check if there are `vite.config.ts` tasks or `package.json` scripts necessary for validation, run via `vp run <script>`.
- [ ] If setup, runtime, or package-manager behavior looks wrong, run `vp env doctor` and include its output when asking for help.

<!--VITE PLUS END-->

# Codebase Guide

VS Code extension ("Office Viewer"): custom editors for office/archive/media files, a WYSIWYG markdown editor, an HTTP client, and a Git History panel.

## Map

Four separately built pieces; know which one a change lives in.

| Piece                                        | Source                                            | Built by                                            | Output                                                     |
| -------------------------------------------- | ------------------------------------------------- | --------------------------------------------------- | ---------------------------------------------------------- |
| Extension host                               | `src/` (minus `src/react`)                        | Rolldown (`vite/rolldown`) via `build.ts`           | `out/extension.js` (desktop), `out/extension.web.js` (web) |
| React webview (all viewers + Git History UI) | `src/react`                                       | Vite (`vite.config.ts`)                             | `out/webview`                                              |
| Markdown editor webview                      | `vditor/` fork + glue in `resource/markdown/*.js` | `vite/vditorPlugin.ts` runs `vditor/vite.config.ts` | `resource/markdown/dist`                                   |
| PDF viewer                                   | `resource/pdf` (vendored pdf.js)                  | none                                                | as-is                                                      |

- `vp dev`/`vp build` also start `build.ts` (imported from `vite.config.ts` when `--mode` is passed), so one command builds everything.
- Only `out/` (incl. `template/` copied in by `build.ts`), `resource/` and `package.nls*.json` ship (`.vscodeignore`); runtime files must land there.
- Two tsconfigs: root (strict, excludes `src/react`) and `src/react/tsconfig.json` (non-strict, DOM). `@/` → `src/`.
- Host feature areas: `src/provider/*` (custom editors, `http/` REST client, `yaml/`, `xml/`), `src/service/*` (markdown export, csv, icons, telemetry, archives), `src/gitHistory/{provider,service,types,util}`, `src/common` (shared plumbing).
- Vendored code — edit sparingly, keep formatting untouched: `vditor/`, `src/react/view/excel/x-spreadsheet`, `resource/pdf`, `*.min.*`.

## Two hosts

Every host feature registers in **both** `src/extension.ts` (desktop, Node) and `src/extension.web.ts` (web worker), or is consciously desktop-only.

- Web build swaps Node modules for `src/shims/*` (see `createNodeShimPlugin` in `build.ts`); any missing builtin becomes `empty-stub.ts` and fails at runtime, not build time.
- Desktop-only editors on web route to `webUnsupported` via `src/provider/webUnsupportedViewerProvider.ts`.
- Branch at runtime with `isWebExtensionHost()` (`src/common/extensionHost.ts`).
- Read files with `vscode.workspace.fs` / `src/common/workspaceFs.ts`, so `vscode-vfs:` and `vscode-remote:` URIs work.

## Host ↔ webview messaging

- Host: `Handler.bind(panel, uri)` (`src/common/handler.ts`); `.on(event, cb)` / `.emit(event, content)`. `.on` replaces the previous listener for that event, except `init`. Errors in callbacks become VS Code error toasts.
- Webview: `handler` from `src/react/util/vscode.ts`, same `{type, content}` shape.
- Handshake: webview `emit("init")` → host replies `open` with `{ path?, buffer?, error? }`; read it with `loadOfficeBuffer` (`src/react/util/loadOfficeContent.ts`).
- Shared events (`save`, `saveAs`, `change` → dirty title, `editInVSCode`, `openExternal`, file-change reload) come free from `handleCommonEvent` (`src/provider/handlers/commonHandler.ts`). Save sends a string or byte array.
- Initial data rides `ReactApp.view(webview, { route, ... })` (`src/service/reactApp.ts`) into a `data-config` attribute; webview reads it with `getConfigs()`. It includes `config` = the whole `vscode-office` settings section.

## Recipe: add a file viewer

1. `package.json` → `contributes.customEditors`: add the glob to an existing `viewType` (usually `cweijan.officeViewer`) or a new one (`priority: "option"` if it should not take over by default).
2. New viewType only: register it in `OfficeViewerProvider.bindCustomEditors` (`src/provider/officeViewerProvider.ts`).
3. `resolveCustomEditor` suffix `switch` there: map the extension to a `route`.
4. `src/react/main.tsx`: lazy-import the component and add the `case`.
5. Component in `src/react/view/<name>/`: `handler.on("open", …).emit("init")` in a `useEffect`, parse with `loadOfficeBuffer`, wrap in `office-viewer-themed`; `src/react/view/icns/IcnsViewer.tsx` is the smallest model.
6. Desktop-only? Add the glob to `webUnsupportedViewerProvider` instead of the web path.
7. Add the extension to `keywords`/README if user-facing.

## Recipe: command or setting

- Command: `contributes.commands` (+ `menus`/`keybindings`) in `package.json`, `registerCommand` in both entry files. Title strings use `%key%` → `package.nls.json` + every `package.nls.<locale>.json`.
- Setting: `contributes.configuration` with `vscode-office.` prefix; read via `Global.getConfig(key, default)` (`src/common/global.ts`). Markdown live-syncs keys listed in `MARKDOWN_SYNC_CONFIG_KEYS` (`src/provider/markdownEditorProvider.ts`).

## i18n

- Host strings: `i18n(key)` from `src/common/global.ts`, keys in `package.nls*.json`.
- React strings: `$t("area.key")` from `src/react/i18n/i18nConfig.ts`; `messages/en.ts` is the source, mirror every key into all 10 locale files.
- Markdown webview: `resource/markdown/lang.js`.

## Running and verifying

- Debug: VS Code launch config "Extension" (or "Extension (Web)") runs `vp run dev`; in Development mode `ReactApp` loads the webview from the Vite dev server at `127.0.0.1:5739`, so React edits hot-reload; host edits need a window reload. F12 in a webview opens devtools.
- No unit tests exist; `test/` holds perf scripts and markdown fixtures only. Verification = `vp check` + `vp run build` (CI only runs the build), then exercise the viewer in the debug host.
- No pre-commit hook (`vp staged` hung on large staged sets). Run `vp check --fix` manually before committing.
