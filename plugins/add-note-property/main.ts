import { getAllTags, Notice, Plugin, type App, type TFile } from 'obsidian';

// HACK: Obsidian doesn't export executeCommandById in the public API
interface InternalCommands {
  commands?: {
    executeCommandById(id: string): void;
  };
}

export default class AddNotePropertyPlugin extends Plugin {
  public onload() {
    this.addCommand({
      id: 'add-note-property',
      name: 'Add note property',
      callback: () => {
        void this.addNoteProperty();
      },
    });
  }

  private async addNoteProperty() {
    const activeFile = this.app.workspace.getActiveFile();
    if (activeFile === null) {
      new Notice('No active file');
      return;
    }

    if (activeFile.extension !== 'md') {
      new Notice('Active file is not a Markdown note');
      return;
    }

    await this.ensureFrontmatter(activeFile);
    this.addFileProperty();
  }

  private async ensureFrontmatter(file: TFile) {
    const cache = this.app.metadataCache.getFileCache(file);
    if (cache?.frontmatterPosition !== undefined) {
      return;
    }

    const tags = getAllTags(cache ?? {}) ?? [];
    const inlineTags = cache?.tags ?? [];

    if (inlineTags.length > 0) {
      await this.app.vault.process(file, (content) =>
        this.removeInlineTags(content, inlineTags)
      );
    }

    await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
      if (tags.length > 0) {
        frontmatter.tags = tags;
      }
    });
  }

  private removeInlineTags(
    content: string,
    inlineTags: NonNullable<
      ReturnType<App['metadataCache']['getFileCache']>
    >['tags']
  ) {
    // Tag positions are absolute offsets into the original content. Remove from
    // the end first so earlier offsets stay valid after each deletion.
    const sortedByPositionTags = [...(inlineTags ?? [])].toSorted(
      (a, b) => b.position.start.offset - a.position.start.offset
    );

    return sortedByPositionTags.reduce(
      (result, tag) =>
        result.slice(0, tag.position.start.offset) +
        result.slice(tag.position.end.offset),
      content
    );
  }

  private addFileProperty() {
    const app = this.app as App & InternalCommands;
    app.commands?.executeCommandById('markdown:add-metadata-property');
  }
}
