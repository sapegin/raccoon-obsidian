import { Notice, Plugin, TFile, setIcon, type App } from 'obsidian';

const EMPTY_VIEW_TYPE = 'empty';
const ACTION_MARKER_CLASS = 'new-tab-links-action';
const NATIVE_BUTTON_CLASSES =
  'text-icon-button mod-pill empty-state-action tappable';

interface NewTabAction {
  label: string;
  icon?: string;
  command?: string;
  file?: string;
}

interface EmptyViewWithActions {
  actionListEl?: HTMLElement;
}

// HACK: Obsidian doesn't export executeCommandById in the public API
interface InternalCommands {
  commands?: {
    executeCommandById(id: string): void;
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function parseAction(value: unknown): NewTabAction | null {
  if (!isRecord(value) || typeof value.label !== 'string') {
    return null;
  }

  const command = typeof value.command === 'string' ? value.command : undefined;
  const file = typeof value.file === 'string' ? value.file : undefined;
  const icon = typeof value.icon === 'string' ? value.icon : undefined;

  if (command === undefined && file === undefined) {
    return null;
  }
  if (command !== undefined && file !== undefined) {
    return null;
  }

  return { label: value.label, icon, command, file };
}

function parseActions(value: unknown): NewTabAction[] {
  if (value === null || value === undefined) {
    return [];
  }

  if (!isRecord(value) || !Array.isArray(value.actions)) {
    console.warn(
      'New Tab Links: expected plugin data.json with an "actions" array.'
    );
    return [];
  }

  const actions: NewTabAction[] = [];
  for (const rawAction of value.actions) {
    const action = parseAction(rawAction);
    if (action === null) {
      console.warn('New Tab Links: ignored invalid action entry.', rawAction);
      continue;
    }
    actions.push(action);
  }

  return actions;
}

export default class NewTabLinksPlugin extends Plugin {
  private actions: NewTabAction[] = [];

  public async onload() {
    this.actions = parseActions(await this.loadData());

    this.registerEvent(
      this.app.workspace.on('layout-change', this.decorateEmptyViews)
    );
    this.app.workspace.onLayoutReady(this.decorateEmptyViews);
  }

  private readonly decorateEmptyViews = () => {
    if (this.actions.length === 0) {
      return;
    }

    for (const leaf of this.app.workspace.getLeavesOfType(EMPTY_VIEW_TYPE)) {
      const emptyView = leaf.view as unknown as EmptyViewWithActions;
      const { actionListEl } = emptyView;
      if (actionListEl === undefined) {
        continue;
      }
      this.decorateActionList(actionListEl);
    }
  };

  private decorateActionList(actionListEl: HTMLElement) {
    if (
      actionListEl.querySelector(`:scope > .${ACTION_MARKER_CLASS}`) !== null
    ) {
      return;
    }

    for (const child of actionListEl.children) {
      if (!(child instanceof HTMLElement)) {
        continue;
      }
      child.addClass('new-tab-links-hidden-default');
    }

    for (const action of this.actions) {
      this.addActionButton(actionListEl, action);
    }
  }

  private addActionButton(actionListEl: HTMLElement, action: NewTabAction) {
    const buttonEl = actionListEl.createDiv({
      cls: `${NATIVE_BUTTON_CLASSES} ${ACTION_MARKER_CLASS}`,
    });

    buttonEl.addEventListener('click', () => {
      void this.runAction(action);
    });

    if (action.icon !== undefined && action.icon !== '') {
      setIcon(buttonEl, action.icon);
    }

    buttonEl.createDiv({ cls: 'text-button-label', text: action.label });
  }

  private async runAction(action: NewTabAction) {
    if (action.command !== undefined) {
      const app = this.app as App & InternalCommands;
      app.commands?.executeCommandById(action.command);
      return;
    }

    if (action.file === undefined) {
      return;
    }

    const file = this.app.vault.getAbstractFileByPath(action.file);
    if (!(file instanceof TFile)) {
      new Notice(`New Tab Links: file not found: ${action.file}`);
      return;
    }

    const leaf = this.app.workspace.getMostRecentLeaf();
    if (leaf === null) {
      await this.app.workspace.getLeaf().openFile(file);
      return;
    }

    await leaf.openFile(file);
  }
}
