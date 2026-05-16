Monorepo of Obsidian plugins. One workspace per plugin under `plugins/<id>/`.

## Plugin contract

Each plugin MUST:

- export `default` — a class extending `obsidian.Plugin` with an `onload` method
- have a `manifest.json` whose `id` matches the directory name
- bundle to `main.js` next to `manifest.json` via `npm run build`
- set `isDesktopOnly: false` in `manifest.json` if it should run on iOS/iPadOS, and in that case restrict itself to the [mobile-safe Obsidian API](https://docs.obsidian.md/Plugins/Getting+started/Mobile+development) (no Node `fs`, no `child_process`, no native modules)

## Commands

```sh
npm install              # root: install all workspaces
npm run build            # build every plugin
npm run dev              # esbuild watch in every plugin
npm test                 # lint + build
npm run format           # format code
```

## Install

Plugins are installed into vaults by [`sync-obsidian-plugins`](https://github.com/sapegin/dotfiles/blob/master/bin/sync-obsidian-plugins) in the dotfiles repo. That script builds, smoke-tests, and copies `main.js`, `manifest.json`, and `styles.css` (when present) into each target vault, then updates `~/dotfiles/obsidian/installed-plugins.json` with git SHA and content hashes.

## When adding a new plugin

1. `mkdir plugins/<id>`, and copy the structure from an existing plugin.
2. Update `manifest.json` (`id`, `name`, `description`).
3. Add the plugin to the list in [Readme.md](Readme.md).
4. Run `npm install && npm run build` to verify it bundles.
5. Run `sync-obsidian-plugins` in dotfiles to install into the vault.
