# Add Note Property Obsidian plugin

[Obsidian](https://obsidian.md) plugin that prepares a note for properties and opens the native “Add file property” command.

[![Washing your code. A book on clean code for frontend developers](https://sapegin.me/images/washing-code-github.jpg)](https://sapegin.me/book/)

## What this plugin does

When you run **Add note property**:

1. If the current note has no frontmatter, the plugin adds an empty frontmatter block.
2. Inline tags in the note body are moved into the `tags` frontmatter field.
3. Obsidian’s **Add file property** command is triggered.

If the note already has frontmatter, only step 3 runs.

## Authors and license

[Artem Sapegin](https://sapegin.me) and [contributors](https://github.com/sapegin/raccoon-obsidian/graphs/contributors).

MIT License, see the included [License.md](../../License.md) file.
