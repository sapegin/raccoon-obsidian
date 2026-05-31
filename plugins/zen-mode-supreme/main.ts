import { Plugin } from 'obsidian';

export default class ZenModeSupremePlugin extends Plugin {
  public onload() {
    document.body.classList.add('zen-mode-supreme');

    this.addCommand({
      id: 'zen-mode-supreme-toggle',
      name: 'Toggle',
      callback: this.toggle,
    });
  }

  public onunload() {
    document.body.classList.remove(
      'zen-mode-supreme',
      'zen-mode-supreme-active',
    );
  }

  private toggle = () => {
    document.body.classList.toggle('zen-mode-supreme-active');
  };
}
