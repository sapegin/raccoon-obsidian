import { Plugin } from 'obsidian';

export default class ZenModeSupremePlugin extends Plugin {
  public onload() {
    this.addCommand({
      id: 'zen-mode-supreme-toggle',
      name: 'Toggle',
      callback: this.toggle,
    });
  }

  public onunload() {}

  private toggle = () => {
    document.body.classList.toggle('zen-mode-supreme-active');
  };
}
