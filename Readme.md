# Raccoon Obsidian

Monorepo of Artem Sapegin's Obsidian plugins, built and installed locally
(no marketplace round-trip) by [sync-obsidian-plugins](https://github.com/sapegin/dotfiles/blob/master/bin/sync-obsidian-plugins).

## Plugins

- [daily-notes-navigation](plugins/daily-notes-navigation) — commands to navigate to previous and next daily notes.

## Usage

```sh
npm install
npm run build
```

The built artefacts (`main.js`, `manifest.json`, optional `styles.css`) live next to each plugin's source. They are copied into the vault by the `sync-obsidian-plugins` script in dotfiles.

## Authors and license

[Artem Sapegin](https://sapegin.me) and contributors.

MIT License, see the included [License.md](License.md) file.
