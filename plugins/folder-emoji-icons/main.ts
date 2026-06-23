import {
  AbstractInputSuggest,
  Plugin,
  SuggestModal,
  TAbstractFile,
  TFolder,
  type WorkspaceLeaf,
} from 'obsidian';

type FolderEmojiMap = Record<string, string>;
type UnknownFunction = (...args: unknown[]) => unknown;

const ICON_CLASS = 'folder-emoji-icons-icon';
const FILE_EXPLORER_VIEW_TYPE = 'file-explorer';

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function hasProperties(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseFolderEmojiMap(value: unknown): FolderEmojiMap {
  if (value === null || value === undefined) {
    return {};
  }

  if (!isRecord(value)) {
    console.warn(
      'Folder Emoji Icons: expected plugin data to be a JSON object.'
    );
    return {};
  }

  const map: FolderEmojiMap = {};
  for (const [folderName, emoji] of Object.entries(value)) {
    if (typeof folderName === 'string' && typeof emoji === 'string') {
      map[folderName] = emoji;
    } else {
      console.warn(
        `Folder Emoji Icons: ignored invalid mapping for "${folderName}".`
      );
    }
  }

  return map;
}

export default class FolderEmojiIconsPlugin extends Plugin {
  private folderEmojis: FolderEmojiMap = {};
  private readonly mutationObservers = new Map<HTMLElement, MutationObserver>();
  private readonly patchedSuggestionRenderers = new WeakSet<object>();
  private onOpenOriginal: typeof SuggestModal.prototype.onOpen | undefined;
  private onOpenProxy: typeof SuggestModal.prototype.onOpen | undefined;
  private showSuggestionsOriginal: UnknownFunction | undefined;
  private showSuggestionsProxy: UnknownFunction | undefined;
  private refreshTimerId: number | undefined;

  public async onload() {
    this.folderEmojis = parseFolderEmojiMap(await this.loadData());

    this.registerEvent(
      this.app.workspace.on('layout-change', this.refreshFileExplorers)
    );
    this.registerEvent(this.app.vault.on('create', this.handleVaultChange));
    this.registerEvent(this.app.vault.on('delete', this.handleVaultChange));
    this.registerEvent(this.app.vault.on('rename', this.handleVaultChange));

    this.patchFolderSuggestionDialogs();
    this.patchFolderSuggestionPopovers();
    this.refreshFileExplorers();
  }

  public onunload() {
    globalThis.clearTimeout(this.refreshTimerId);
    this.clearFileExplorerIcons();
    this.disconnectMutationObservers();
    this.restoreFolderSuggestionDialogs();
  }

  private readonly handleVaultChange = (file: TAbstractFile) => {
    if (file instanceof TFolder) {
      this.refreshFileExplorers();
    }
  };

  private readonly refreshFileExplorers = () => {
    this.app.workspace.iterateAllLeaves((leaf) => this.manageLeaf(leaf));
  };

  private manageLeaf(leaf: WorkspaceLeaf) {
    if (leaf.getViewState().type !== FILE_EXPLORER_VIEW_TYPE) {
      return;
    }

    const containerEl = leaf.view.containerEl.querySelector<HTMLElement>(
      ':scope > .nav-files-container > div'
    );
    if (containerEl === null) {
      return;
    }

    this.observeFileExplorer(containerEl);
    this.decorateFileExplorer(containerEl);
  }

  private observeFileExplorer(containerEl: HTMLElement) {
    if (this.mutationObservers.has(containerEl)) {
      return;
    }

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (
          mutation.attributeName === 'data-path' ||
          [...mutation.addedNodes].some(
            (node) => node instanceof HTMLElement && node.hasClass('tree-item')
          )
        ) {
          this.scheduleFileExplorerRefresh(containerEl);
          return;
        }
      }
    });

    observer.observe(containerEl, {
      subtree: true,
      childList: true,
      attributeFilter: ['data-path'],
    });
    this.mutationObservers.set(containerEl, observer);
  }

  private scheduleFileExplorerRefresh(containerEl: HTMLElement) {
    globalThis.clearTimeout(this.refreshTimerId);
    this.refreshTimerId = globalThis.setTimeout(() => {
      this.decorateFileExplorer(containerEl);
    }, 50);
  }

  private decorateFileExplorer(containerEl: HTMLElement) {
    for (const selfEl of containerEl.querySelectorAll<HTMLElement>(
      '.tree-item-self[data-path]'
    )) {
      const path = selfEl.dataset.path;
      const file = path ? this.app.vault.getAbstractFileByPath(path) : null;

      if (file instanceof TFolder) {
        this.setFolderEmoji(selfEl, this.folderEmojis[file.name], {
          beforeSelector: ':scope > .tree-item-inner',
        });
      } else {
        this.removeFolderEmoji(selfEl);
      }
    }
  }

  private setFolderEmoji(
    parentEl: HTMLElement,
    emoji: string | undefined,
    options: { beforeSelector?: string } = {}
  ) {
    let iconEl = parentEl.querySelector<HTMLElement>(`:scope > .${ICON_CLASS}`);

    if (emoji === undefined || emoji === '') {
      iconEl?.remove();
      return;
    }

    iconEl ??= parentEl.createSpan({ cls: ICON_CLASS });
    iconEl.setText(emoji);

    const beforeEl =
      options.beforeSelector === undefined
        ? null
        : parentEl.querySelector<HTMLElement>(options.beforeSelector);
    if (beforeEl !== null && iconEl.nextElementSibling !== beforeEl) {
      beforeEl.before(iconEl);
    } else if (beforeEl === null && parentEl.firstElementChild !== iconEl) {
      parentEl.prepend(iconEl);
    }
  }

  private removeFolderEmoji(parentEl: HTMLElement) {
    parentEl.querySelector(`:scope > .${ICON_CLASS}`)?.remove();
  }

  private clearFileExplorerIcons() {
    for (const iconEl of activeDocument.querySelectorAll(`.${ICON_CLASS}`)) {
      iconEl.remove();
    }
  }

  private disconnectMutationObservers() {
    for (const observer of this.mutationObservers.values()) {
      observer.disconnect();
    }
    this.mutationObservers.clear();
  }

  private patchFolderSuggestionDialogs() {
    const onOpenOriginal = Reflect.get(
      SuggestModal.prototype,
      'onOpen'
    ) as typeof SuggestModal.prototype.onOpen;
    this.onOpenOriginal = onOpenOriginal;

    this.onOpenProxy = new Proxy(onOpenOriginal, {
      apply: (onOpen, modalArg: SuggestModal<unknown>, args) => {
        this.patchSuggestionRenderer(modalArg);
        return Reflect.apply(onOpen, modalArg, args);
      },
    });

    SuggestModal.prototype.onOpen = this.onOpenProxy;
  }

  private patchFolderSuggestionPopovers() {
    const showSuggestionsOriginal = Reflect.get(
      AbstractInputSuggest.prototype,
      'showSuggestions'
    ) as UnknownFunction;
    this.showSuggestionsOriginal = showSuggestionsOriginal;

    this.showSuggestionsProxy = new Proxy(showSuggestionsOriginal, {
      apply: (
        showSuggestions,
        popoverArg: AbstractInputSuggest<unknown>,
        args
      ) => {
        this.patchSuggestionRenderer(popoverArg);
        return Reflect.apply(showSuggestions, popoverArg, args);
      },
    });

    Reflect.set(
      AbstractInputSuggest.prototype,
      'showSuggestions',
      this.showSuggestionsProxy
    );
  }

  private restoreFolderSuggestionDialogs() {
    if (
      this.onOpenOriginal !== undefined &&
      this.onOpenProxy !== undefined &&
      SuggestModal.prototype.onOpen === this.onOpenProxy
    ) {
      SuggestModal.prototype.onOpen = this.onOpenOriginal;
    }

    if (
      this.showSuggestionsOriginal !== undefined &&
      this.showSuggestionsProxy !== undefined &&
      Reflect.get(AbstractInputSuggest.prototype, 'showSuggestions') ===
        this.showSuggestionsProxy
    ) {
      Reflect.set(
        AbstractInputSuggest.prototype,
        'showSuggestions',
        this.showSuggestionsOriginal
      );
    }
  }

  private patchSuggestionRenderer(owner: object) {
    if (this.patchedSuggestionRenderers.has(owner)) {
      return;
    }

    const renderSuggestionOriginal = Reflect.get(
      owner,
      'renderSuggestion'
    ) as UnknownFunction;

    Reflect.set(
      owner,
      'renderSuggestion',
      new Proxy(renderSuggestionOriginal, {
        apply: (renderSuggestion, renderOwner, args) => {
          const result = Reflect.apply(renderSuggestion, renderOwner, args);
          const [value, suggestionEl] = args;
          if (suggestionEl instanceof HTMLElement) {
            this.decorateFolderSuggestion(value, suggestionEl);
          }
          return result;
        },
      })
    );
    this.patchedSuggestionRenderers.add(owner);
  }

  private decorateFolderSuggestion(value: unknown, suggestionEl: HTMLElement) {
    const folder = this.getFolderFromSuggestion(value);
    if (folder === null) {
      this.removeFolderEmoji(suggestionEl);
      return;
    }

    this.prepareFolderSuggestion(suggestionEl);
    this.setFolderEmoji(suggestionEl, this.folderEmojis[folder.name], {
      beforeSelector: ':scope > .suggestion-content',
    });
  }

  private getFolderFromSuggestion(value: unknown): TFolder | null {
    if (value instanceof TAbstractFile) {
      return value instanceof TFolder ? value : value.parent;
    }

    if (value instanceof TFolder) {
      return value;
    }

    if (!hasProperties(value)) {
      return null;
    }

    for (const key of ['item', 'file', 'folder'] as const) {
      const folder = this.getFolderFromSuggestion(value[key]);
      if (folder !== null) {
        return folder;
      }
    }

    for (const key of ['path', 'filePath'] as const) {
      const folder = this.getFolderByPath(value[key]);
      if (folder !== null) {
        return folder;
      }
    }

    return null;
  }

  private getFolderByPath(path: unknown): TFolder | null {
    if (typeof path !== 'string') {
      return null;
    }

    const file =
      this.app.vault.getAbstractFileByPath(path) ??
      this.app.vault.getAbstractFileByPath(`${path}.md`);
    if (file === null) {
      return null;
    }

    return file instanceof TFolder ? file : file.parent;
  }

  private prepareFolderSuggestion(suggestionEl: HTMLElement) {
    suggestionEl.addClasses(['folder-emoji-icons-suggestion', 'mod-complex']);
    if (suggestionEl.querySelector(':scope > .suggestion-content') !== null) {
      return;
    }

    const contentEl = suggestionEl.createDiv({ cls: 'suggestion-content' });
    const titleEl = contentEl.createDiv({ cls: 'suggestion-title' });

    while (suggestionEl.firstChild !== contentEl) {
      const node = suggestionEl.firstChild;
      if (node === null) {
        return;
      }
      titleEl.append(node);
    }
  }
}
