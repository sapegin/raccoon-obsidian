# New Tab Links Obsidian plugin

[Obsidian](https://obsidian.md) plugin that adds configurable links to the new tab page.

[![Washing your code. A book on clean code for frontend developers](https://sapegin.me/images/washing-code-github.jpg)](https://sapegin.me/book/)

## What this plugin does

Replaces the default empty-tab action buttons with entries from plugin data. Each action opens a vault file or runs an Obsidian command (by ID).

## Configuration

Add actions to the plugin data file in your vault:

```text
<Vault>/.obsidian/plugins/new-tab-links/data.json
```

See [`data.json.example`](data.json.example) in this folder for the shape. Each action needs a `label` and either a `file` path or a `command` ID (not both). Optional `icon` uses Obsidian’s icon id (same as in the app).

Reload or disable and enable the plugin after editing `data.json`.

## Authors and license

[Artem Sapegin](https://sapegin.me) and [contributors](https://github.com/sapegin/raccoon-obsidian/graphs/contributors).

MIT License, see the included [License.md](../../License.md) file.
