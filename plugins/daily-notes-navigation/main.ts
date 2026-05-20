import { Notice, Plugin, type App, type TFile } from 'obsidian';

// HACK: Obsidian doesn't seem to export this type
interface InternalPluginsConfig {
  internalPlugins?: {
    getPluginById(id: string): {
      enabled: boolean;
      instance?: {
        options?: {
          folder?: string;
        };
      };
    } | null;
  };
}

export default class DailyNotesNavigationPlugin extends Plugin {
  public onload() {
    this.addCommand({
      id: 'go-to-previous-daily-note',
      name: 'Go to previous daily note',
      callback: () => this.navigateToDailyNote(-1),
    });

    this.addCommand({
      id: 'go-to-next-daily-note',
      name: 'Go to next daily note',
      callback: () => this.navigateToDailyNote(1),
    });

    this.addCommand({
      id: 'go-to-last-daily-note',
      name: 'Go to last daily note',
      callback: () => this.navigateToLastDailyNote(),
    });
  }

  private navigateToLastDailyNote() {
    const dailyNoteFiles = this.getDailyNotes();
    if (dailyNoteFiles.length === 0) {
      new Notice('No daily notes found');
      return;
    }

    const targetFile = dailyNoteFiles.at(-1);
    if (targetFile) {
      void this.app.workspace.getLeaf().openFile(targetFile);
    }
  }

  private getDailyNotesFolder(): string {
    const app = this.app as App & InternalPluginsConfig;
    const dailyNotesPlugin = app.internalPlugins?.getPluginById('daily-notes');

    if (dailyNotesPlugin?.enabled === undefined) {
      return '';
    }

    return dailyNotesPlugin.instance?.options?.folder ?? '';
  }

  private getDailyNotes(): TFile[] {
    const folder = this.getDailyNotesFolder();
    const allFiles = this.app.vault.getMarkdownFiles();

    if (folder === '') {
      return allFiles;
    }

    const folderWithSlash = `${folder}/`;
    return allFiles
      .filter((file) => file.path.startsWith(folderWithSlash))
      .toSorted((a, b) => a.basename.localeCompare(b.basename));
  }

  private navigateToDailyNote(direction: -1 | 1) {
    const activeFile = this.app.workspace.getActiveFile();
    if (activeFile === null) {
      new Notice('No active file');
      return;
    }

    const dailyNoteFiles = this.getDailyNotes();

    const currentNoteIndex = dailyNoteFiles.findIndex(
      (file: TFile) => file.path === activeFile.path
    );

    if (currentNoteIndex === -1) {
      new Notice('Current file is not a daily note');
      return;
    }

    const targetNoteIndex = currentNoteIndex + direction;
    if (targetNoteIndex < 0 || targetNoteIndex >= dailyNoteFiles.length) {
      new Notice(
        direction === -1 ? 'No previous daily note' : 'No next daily note'
      );
      return;
    }

    const targetFile = dailyNoteFiles[targetNoteIndex];
    void this.app.workspace.getLeaf().openFile(targetFile);
  }
}
