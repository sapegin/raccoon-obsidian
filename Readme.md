# Obsidian plugins

Monorepo of [Artem Sapegin](https://sapegin.me/)’s Obsidian plugins, built and installed locally (no marketplace round-trip) by [sync-obsidian-plugins](https://github.com/sapegin/dotfiles/blob/master/bin/sync-obsidian-plugins) script.

[![Washing your code. A book on clean code for frontend developers](https://sapegin.me/images/washing-code-github.jpg)](https://sapegin.me/book/)

## Plugins

- [add-note-property](plugins/add-note-property): Ensures frontmatter exists, moves inline tags to frontmatter, then adds file property.
- [better-title-sync](plugins/better-title-sync): Updates first-level heading in Markdown when file is renamed.
- [daily-notes-navigation](plugins/daily-notes-navigation): Commands to navigate to previous and next daily notes.
- [zen-mode-supreme](plugins/zen-mode-supreme): Hides all UI so you can focus on writing.

## Usage

```sh
npm install
npm run build
```

The built artefacts (`main.js`, `manifest.json`, optional `styles.css`) live next to each plugin’s source. They are copied into the vault by the [sync-obsidian-plugins](https://github.com/sapegin/dotfiles/blob/master/bin/sync-obsidian-plugins) script.

## Contributing

Bug fixes are welcome, but not new features.

## Authors and license

[Artem Sapegin](https://sapegin.me) and [contributors](https://github.com/sapegin/raccoon-obsidian/graphs/contributors).

MIT License, see the included [License.md](License.md) file.
