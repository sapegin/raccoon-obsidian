# Folder Emoji Icons Obsidian plugin

[Obsidian](https://obsidian.md) plugin that adds emoji icons to folders in the file tree and file suggestion dialogs.

[![Washing your code. A book on clean code for frontend developers](https://sapegin.me/images/washing-code-github.jpg)](https://sapegin.me/book/)

## What this plugin does

This plugin adds emoji icons to:

- folders in the sidebar file tree;
- folder suggestions in the Move file dialog;
- note suggestions in the Open dialog.

## Configuration

Add a JSON mapping to the plugin data file in your vault:

```text
<Vault>/.obsidian/plugins/folder-emoji-icons/data.json
```

Example:

```json
{
  "Food": "🍕",
  "People": "👥",
  "Projects": "📁"
}
```

Keys are folder names, not paths. Every folder with the same name gets the same emoji.

Reload or disable and enable the plugin after editing `data.json`.

## Authors and license

[Artem Sapegin](https://sapegin.me) and [contributors](https://github.com/sapegin/raccoon-obsidian/graphs/contributors).

MIT License, see the included [License.md](../../License.md) file.
