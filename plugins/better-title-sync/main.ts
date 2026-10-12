import {
  Plugin,
  TFile,
  getFrontMatterInfo,
  type TAbstractFile,
} from 'obsidian';

function getBasename(filepath: string) {
  return filepath.split(/[/\\]/).pop()?.replace(/\.md$/, '') ?? '';
}

function findFirstH1(
  contents: string,
  searchFrom = 0
): { heading: string; start: number; end: number } | undefined {
  let offset = searchFrom;
  let inFence = false;

  while (offset < contents.length) {
    const lineEnd = contents.indexOf('\n', offset);
    const end = lineEnd === -1 ? contents.length : lineEnd;
    const line = contents.slice(offset, end);

    if (line.startsWith('```')) {
      inFence = !inFence;
    } else if (!inFence) {
      const match = line.match(/^# +(.+)$/);
      if (match) {
        return {
          heading: match[1].trim(),
          start: offset,
          end,
        };
      }
    }

    if (lineEnd === -1) {
      break;
    }
    offset = lineEnd + 1;
  }

  return undefined;
}

function getUpdatedContents(
  contents: string,
  newBasename: string,
  oldFilename: string
): string | undefined {
  const frontmatterInfo = getFrontMatterInfo(contents);
  const bodyStart = frontmatterInfo.exists ? frontmatterInfo.contentStart : 0;
  const h1 = findFirstH1(contents, bodyStart);
  const newHeading = `# ${newBasename}`;

  if (h1 === undefined) {
    if (frontmatterInfo.exists) {
      const beforeFrontmatter = contents.slice(0, bodyStart);
      const afterFrontmatter = contents.slice(bodyStart);
      return `${beforeFrontmatter.trimEnd()}\n${newHeading}\n${afterFrontmatter.trimStart()}`;
    }

    return `${newHeading}\n${contents.trimStart()}`;
  }

  if (h1.heading !== oldFilename) {
    return undefined;
  }

  const beforeHeading = contents.slice(0, h1.start);
  const afterHeading = contents.slice(h1.end);
  return `${beforeHeading}${newHeading}${afterHeading}`;
}

export default class TitleSyncPlugin extends Plugin {
  private handleRename = async (file: TAbstractFile, oldPath: string) => {
    // Skip folders and non-Markdown files
    if (file instanceof TFile === false || file.extension !== 'md') {
      return;
    }

    const oldFilename = getBasename(oldPath);

    // Read file content directly: after a rename, especially on mobile, the
    // metadata cache for the new path is often incomplete (no headings or
    // frontmatterPosition yet), which caused headings to be inserted before
    // frontmatter.
    const contents = await this.app.vault.read(file);
    const updated = getUpdatedContents(contents, file.basename, oldFilename);
    if (updated === undefined) {
      return;
    }

    await this.app.vault.modify(file, updated);
  };

  public onload() {
    this.registerEvent(this.app.vault.on('rename', this.handleRename));
  }

  public onunload() {}
}
