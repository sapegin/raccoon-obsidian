import {
  Notice,
  Platform,
  Plugin,
  TFile,
  setIcon,
  type App,
  type View,
} from 'obsidian';

const EMPTY_VIEW_TYPE = 'empty';
const ACTION_MARKER_CLASS = 'new-tab-links-action';
const HIDDEN_DEFAULT_CLASS = 'new-tab-links-hidden-default';
const BUTTON_CLASSES = 'text-icon-button mod-pill empty-state-action tappable';

interface NewTabAction {
  label: string;
  icon?: string;
  command?: string;
  file?: string;
}

interface EmptyViewWithActions extends View {
  actionListEl?: HTMLElement;
}

// HACK: Obsidian doesn't export executeCommandById in the public API
interface InternalCommands {
  commands?: {
    executeCommandById(id: string, source?: unknown): void;
  };
}

/**
 * Shared across plugin reloads so onOpen stays wired to the live plugin
 * instance.
 */
let activePlugin: NewTabLinksPlugin | null = null;
let emptyViewOnOpenHookInstalled = false;
let originalEmptyViewOnOpen: ((this: EmptyViewWithActions) => unknown) | null =
  null;

function setActivePlugin(plugin: NewTabLinksPlugin | null) {
  activePlugin = plugin;
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

function installEmptyViewOnOpenHook(view: View) {
  if (emptyViewOnOpenHookInstalled) {
    return;
  }

  const proto = Object.getPrototypeOf(view) as {
    onOpen?: (this: EmptyViewWithActions) => unknown;
  };
  const { onOpen } = proto;
  if (onOpen === undefined) {
    return;
  }

  originalEmptyViewOnOpen = onOpen;
  proto.onOpen = async function (this: EmptyViewWithActions) {
    const result = originalEmptyViewOnOpen?.call(this);
    await Promise.resolve(result);
    activePlugin?.decorateEmptyView(this);
    return undefined;
  };
  emptyViewOnOpenHookInstalled = true;
}

export default class NewTabLinksPlugin extends Plugin {
  private actions: NewTabAction[] = [];
  private readonly observedActionLists = new WeakSet<HTMLElement>();
  private decorateTimerId: ReturnType<typeof globalThis.setTimeout> | undefined;

  public async onload() {
    setActivePlugin(this);
    this.register(() => {
      if (activePlugin === this) {
        setActivePlugin(null);
      }
      globalThis.clearTimeout(this.decorateTimerId);
    });

    this.actions = parseActions(await this.loadData());

    this.registerEvent(
      this.app.workspace.on('layout-change', this.scheduleDecorateEmptyViews)
    );
    this.registerEvent(
      this.app.workspace.on(
        'active-leaf-change',
        this.scheduleDecorateEmptyViews
      )
    );
    this.app.workspace.onLayoutReady(this.scheduleDecorateEmptyViews);
  }

  private readonly scheduleDecorateEmptyViews = () => {
    if (activePlugin !== this) {
      return;
    }

    globalThis.clearTimeout(this.decorateTimerId);
    const delay = Platform.isMobileApp ? 50 : 0;
    this.decorateTimerId = globalThis.setTimeout(() => {
      this.decorateAllEmptyStates();
    }, delay);
  };

  private getActionListElement(view: View): HTMLElement | null {
    const emptyView = view as EmptyViewWithActions;
    const actionListElement = emptyView.actionListEl;
    if (actionListElement instanceof HTMLElement) {
      return actionListElement;
    }

    return view.containerEl.querySelector('.empty-state-action-list');
  }

  private collectActionListElements(): HTMLElement[] {
    const found = new Set<HTMLElement>();
    for (const node of this.app.workspace.containerEl.querySelectorAll(
      '.workspace-leaf-content[data-type="empty"] .empty-state-action-list'
    )) {
      if (node instanceof HTMLElement) {
        found.add(node);
      }
    }

    return [...found];
  }

  private observeActionList(actionListElement: HTMLElement) {
    if (this.observedActionLists.has(actionListElement)) {
      return;
    }
    this.observedActionLists.add(actionListElement);

    const observer = new MutationObserver(() => {
      this.scheduleDecorateEmptyViews();
    });
    observer.observe(actionListElement, { childList: true });
    this.register(() => {
      observer.disconnect();
    });
  }

  public decorateEmptyView(view: View) {
    if (view.getViewType() !== EMPTY_VIEW_TYPE) {
      return;
    }

    installEmptyViewOnOpenHook(view);

    if (this.actions.length === 0) {
      return;
    }

    const actionListElement = this.getActionListElement(view);
    if (actionListElement === null) {
      return;
    }

    this.observeActionList(actionListElement);
    this.decorateActionList(actionListElement);
  }

  private decorateAllEmptyStates() {
    if (this.actions.length === 0) {
      return;
    }

    for (const leaf of this.app.workspace.getLeavesOfType(EMPTY_VIEW_TYPE)) {
      this.decorateEmptyView(leaf.view);
    }

    for (const actionListElement of this.collectActionListElements()) {
      this.observeActionList(actionListElement);
      this.decorateActionList(actionListElement);
    }
  }

  private getVisibleDefaultButtons(
    actionListElement: HTMLElement
  ): HTMLElement[] {
    return [...actionListElement.children].filter(
      (child): child is HTMLElement =>
        child instanceof HTMLElement &&
        !child.hasClass(ACTION_MARKER_CLASS) &&
        !child.hasClass(HIDDEN_DEFAULT_CLASS)
    );
  }

  private decorateActionList(actionListElement: HTMLElement) {
    const customButtons = actionListElement.querySelectorAll(
      `:scope > .${ACTION_MARKER_CLASS}`
    );
    const visibleDefaults = this.getVisibleDefaultButtons(actionListElement);

    if (customButtons.length > 0 && visibleDefaults.length === 0) {
      return;
    }

    for (const button of customButtons) {
      button.remove();
    }

    for (const child of actionListElement.children) {
      if (!(child instanceof HTMLElement)) {
        continue;
      }
      if (child.hasClass(ACTION_MARKER_CLASS)) {
        continue;
      }
      child.addClass(HIDDEN_DEFAULT_CLASS);
    }

    for (const action of this.actions) {
      this.addActionButton(actionListElement, action);
    }

    const emptyStateElement = actionListElement.closest('.empty-state');
    if (emptyStateElement instanceof HTMLElement) {
      emptyStateElement.addClass('new-tab-links-active');
    }
  }

  private addActionButton(
    actionListElement: HTMLElement,
    action: NewTabAction
  ) {
    const buttonElement = actionListElement.createDiv({
      cls: `${BUTTON_CLASSES} ${ACTION_MARKER_CLASS}`,
      attr: { tabIndex: 0, role: 'button' },
    });
    const iconElement = buttonElement.createSpan({ cls: 'text-button-icon' });
    buttonElement.createSpan({
      cls: 'text-button-label',
      text: action.label,
    });

    const onActivate = (event: Event) => {
      event.preventDefault();
      void this.runAction(action, event);
    };

    buttonElement.addEventListener('click', onActivate);
    buttonElement.addEventListener('keydown', (event) => {
      if (event.isComposing || event.defaultPrevented) {
        return;
      }
      if (event.key !== ' ' && event.key !== 'Enter') {
        return;
      }
      event.preventDefault();
      onActivate(event);
    });

    if (action.icon !== undefined && action.icon !== '') {
      setIcon(iconElement, action.icon);
    } else {
      iconElement.hide();
    }
  }

  private async runAction(action: NewTabAction, sourceEvent?: Event) {
    if (action.command !== undefined) {
      const app = this.app as App & InternalCommands;
      app.commands?.executeCommandById(action.command, sourceEvent);
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

    const leaf =
      this.app.workspace.activeLeaf ?? this.app.workspace.getMostRecentLeaf();
    if (leaf === null) {
      await this.app.workspace.getLeaf().openFile(file);
      return;
    }

    await leaf.openFile(file);
  }
}
