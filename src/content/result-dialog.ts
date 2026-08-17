/**
 * Premium Minimal Result Dialog — rendered inside isolated Shadow DOM.
 * Uses the exact sleek dark Zinc color palette and button hierarchy from the Viewer page.
 * Flat, modern, zero gradients.
 */

import type { CaptureResult, ResultActionState } from '../shared/types.js';
import {
  DIALOG_AUTO_DISMISS_MS,
  DIALOG_INTERACTION_EXTEND_MS,
} from '../shared/constants.js';

type DialogAction = 'view' | 'save' | 'copy';
type ActionHandler = (action: DialogAction, sessionId: string) => Promise<void>;

const ICONS = {
  check: `<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3.5 8.5 6.5 11.5 12.5 4.5"/></svg>`,
  alert: `<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="7"/><line x1="8" y1="4.5" x2="8" y2="8.5"/><line x1="8" y1="11.5" x2="8" y2="12"/></svg>`,
  view: `<svg class="btn-icon" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z"/><circle cx="8" cy="8" r="2.5"/></svg>`,
  copy: `<svg class="btn-icon" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5.5" y="5.5" width="8" height="8" rx="1.5"/><path d="M3.5 10.5H3a1.5 1.5 0 0 1-1.5-1.5V3A1.5 1.5 0 0 1 3 1.5h6A1.5 1.5 0 0 1 10.5 3v.5"/></svg>`,
  save: `<svg class="btn-icon" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v8m-3.5-3.5L8 10l3.5-3.5M2 13.5h12"/></svg>`,
  btnSuccess: `<svg class="btn-icon" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 8.5 6 11.5 13 4.5"/></svg>`,
  close: `<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="3" x2="13" y2="13"/><line x1="13" y1="3" x2="3" y2="13"/></svg>`,
};

const ACTION_CONFIG: Record<DialogAction, { label: string; icon: string; isPrimary: boolean; successLabel: string; errorLabel: string }> = {
  view: { label: 'View', icon: ICONS.view, isPrimary: false, successLabel: 'Viewed', errorLabel: 'Failed' },
  copy: { label: 'Copy', icon: ICONS.copy, isPrimary: false, successLabel: 'Copied', errorLabel: 'Failed' },
  save: { label: 'Save PNG', icon: ICONS.save, isPrimary: true, successLabel: 'Saved', errorLabel: 'Failed' },
};

const DIALOG_CSS = `
  :host {
    all: initial;
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 2147483647;
    pointer-events: none;
    display: block;
    contain: layout style paint;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;

    /* Signature Dark Zinc Palette (matching Viewer Header) */
    --bg-surface: #18181b;
    --text-primary: #fafafa;
    --text-secondary: #a1a1aa;
    --border-color: #27272a;
    --border-hover: #3f3f46;
    --btn-bg: #18181b;
    --btn-hover: #27272a;
    --btn-active: #3f3f46;
    --btn-text: #f4f4f5;
    --btn-border: #27272a;
    --primary-btn-bg: #fafafa;
    --primary-btn-hover: #e4e4e7;
    --primary-btn-text: #09090b;
    --primary-btn-border: #fafafa;
    --success-bg: #052e16;
    --success-border: #15803d;
    --success-text: #86efac;
    --success-mark-bg: #052e16;
    --success-mark-text: #86efac;
    --error-card-bg: #2a1215;
    --error-card-border: #4c1d24;
    --error-text: #fca5a5;
    --error-mark-bg: #450a0a;
    --error-mark-text: #f87171;
    --shadow-dialog: 0 16px 40px -4px rgba(0, 0, 0, 0.6), 0 4px 16px -2px rgba(0, 0, 0, 0.4);
    --close-hover-bg: #27272a;
    --close-text: #71717a;
  }

  .dialog {
    pointer-events: auto;
    min-width: 290px;
    max-width: 340px;
    padding: 14px 16px 14px;
    border-radius: 10px;
    background: var(--bg-surface);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
    box-shadow: var(--shadow-dialog);
    animation: popupIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    box-sizing: border-box;
  }

  .dialog.leaving {
    animation: popupOut 0.16s cubic-bezier(0.4, 0, 1, 1) forwards;
  }

  @keyframes popupIn {
    from { transform: translateY(-8px) scale(0.96); opacity: 0; }
    to   { transform: translateY(0) scale(1); opacity: 1; }
  }

  @keyframes popupOut {
    from { transform: translateY(0) scale(1); opacity: 1; }
    to   { transform: translateY(-6px) scale(0.97); opacity: 0; }
  }

  /* Header Bar */
  .header-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
    gap: 8px;
  }

  .title-group {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
  }

  .status-badge {
    width: 20px;
    height: 20px;
    border-radius: 6px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: var(--success-mark-bg);
    color: var(--success-mark-text);
    flex-shrink: 0;
  }

  .status-badge.error {
    background: var(--error-mark-bg);
    color: var(--error-mark-text);
  }

  .title-text {
    font-size: 13.5px;
    font-weight: 600;
    line-height: 1.3;
    color: var(--text-primary);
    letter-spacing: -0.01em;
  }

  .close-btn {
    width: 22px;
    height: 22px;
    border-radius: 6px;
    border: none;
    background: transparent;
    color: var(--close-text);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    transition: background 0.12s ease, color 0.12s ease;
  }

  .close-btn:hover {
    background: var(--close-hover-bg);
    color: var(--text-primary);
  }

  /* Action Buttons Group */
  .actions {
    display: flex;
    gap: 7px;
  }

  .action-btn {
    flex: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 6px 10px;
    border-radius: 7px;
    border: 1px solid var(--btn-border);
    background: var(--btn-bg);
    color: var(--btn-text);
    font-size: 12.5px;
    font-weight: 550;
    font-family: inherit;
    cursor: pointer;
    transition: background 0.14s ease, border-color 0.14s ease, color 0.14s ease, transform 0.1s ease;
    user-select: none;
    box-sizing: border-box;
    white-space: nowrap;
  }

  .action-btn:hover:not(:disabled) {
    background: var(--btn-hover);
    border-color: var(--border-hover);
  }

  .action-btn:active:not(:disabled) {
    background: var(--btn-active);
    transform: scale(0.98);
  }

  .action-btn:disabled {
    cursor: default;
  }

  .action-btn.btn-primary {
    background: var(--primary-btn-bg);
    color: var(--primary-btn-text);
    border-color: var(--primary-btn-border);
    font-weight: 600;
  }

  .action-btn.btn-primary:hover:not(:disabled) {
    background: var(--primary-btn-hover);
  }

  .action-btn.btn-success {
    background: var(--success-bg) !important;
    border-color: var(--success-border) !important;
    color: var(--success-text) !important;
  }

  .action-btn.btn-error {
    background: var(--error-card-bg) !important;
    border-color: var(--error-card-border) !important;
    color: var(--error-text) !important;
  }

  /* Error State Card */
  .error-card {
    background: var(--error-card-bg);
    border: 1px solid var(--error-card-border);
    border-radius: 8px;
    padding: 10px 12px;
    margin: 2px 0 0;
  }

  .error-card-msg {
    font-size: 12.5px;
    line-height: 1.45;
    color: var(--error-text);
    word-break: break-word;
  }
`;

export class ResultDialog {
  private host: HTMLElement | null = null;
  private shadow: ShadowRoot | null = null;
  private dialogEl: HTMLElement | null = null;
  private dismissTimer: ReturnType<typeof setTimeout> | null = null;
  private buttons = new Map<DialogAction, HTMLButtonElement>();
  private sessionId: string | null = null;
  private busyAction: DialogAction | null = null;
  private isInteracting = false;

  showSuccess(result: CaptureResult, onAction: ActionHandler): void {
    this.sessionId = result.sessionId;
    this.ensureHost();
    this.clearTimer();
    this.buttons.clear();

    const dialog = this.makeDialog();
    dialog.appendChild(this.makeHeader(ICONS.check, 'Screenshot captured', false));

    const actions = document.createElement('div');
    actions.className = 'actions';

    for (const action of ['view', 'copy', 'save'] as DialogAction[]) {
      const cfg = ACTION_CONFIG[action];
      const button = document.createElement('button');
      button.className = `action-btn${cfg.isPrimary ? ' btn-primary' : ''}`;
      button.setAttribute('aria-label', cfg.label);
      button.innerHTML = `${cfg.icon}<span>${cfg.label}</span>`;
      button.addEventListener('click', () => {
        void this.runAction(action, onAction);
      });
      this.buttons.set(action, button);
      actions.appendChild(button);
    }

    dialog.appendChild(actions);

    this.attachInteractionHandlers(dialog);
    this.shadow?.appendChild(dialog);
    this.startDismissTimer(DIALOG_AUTO_DISMISS_MS);
  }

  showError(message: string): void {
    this.sessionId = null;
    this.ensureHost();
    this.clearTimer();

    const dialog = this.makeDialog();
    dialog.appendChild(this.makeHeader(ICONS.alert, 'Screenshot failed', true));

    const card = document.createElement('div');
    card.className = 'error-card';
    const msg = document.createElement('div');
    msg.className = 'error-card-msg';
    msg.textContent = message;
    card.appendChild(msg);
    dialog.appendChild(card);

    this.attachInteractionHandlers(dialog);
    this.shadow?.appendChild(dialog);
    this.startDismissTimer(DIALOG_AUTO_DISMISS_MS);
  }

  applyActionState(state: ResultActionState): void {
    const button = this.buttons.get(state.action);
    if (!button) return;

    const cfg = ACTION_CONFIG[state.action];
    button.disabled = true;
    button.classList.remove('btn-success', 'btn-error');

    if (state.status === 'success') {
      button.classList.add('btn-success');
      button.innerHTML = `${ICONS.btnSuccess}<span>${cfg.successLabel}</span>`;
    } else {
      button.classList.add('btn-error');
      button.innerHTML = `${ICONS.alert}<span>${cfg.errorLabel}</span>`;
    }

    this.busyAction = null;
    this.enableIdleButtons();
    this.startDismissTimer(DIALOG_INTERACTION_EXTEND_MS);
  }

  dismiss(immediate = false): void {
    this.clearTimer();
    this.buttons.clear();
    this.busyAction = null;

    if (immediate || !this.dialogEl) {
      this.removeHost();
      return;
    }

    this.dialogEl.classList.add('leaving');
    setTimeout(() => {
      this.removeHost();
    }, 160);
  }

  private async runAction(action: DialogAction, onAction: ActionHandler): Promise<void> {
    if (!this.sessionId || this.busyAction) return;

    this.busyAction = action;
    this.clearTimer();

    for (const [name, button] of this.buttons.entries()) {
      button.disabled = true;
      if (name === action) {
        const cfg = ACTION_CONFIG[action];
        button.innerHTML = `${cfg.icon}<span>${cfg.label}…</span>`;
      }
    }

    try {
      await onAction(action, this.sessionId);
    } catch {
      this.applyActionState({ action, status: 'error' });
    }
  }

  private enableIdleButtons(): void {
    for (const [action, button] of this.buttons.entries()) {
      if (button.classList.contains('btn-success') || button.classList.contains('btn-error')) {
        continue;
      }

      const cfg = ACTION_CONFIG[action];
      button.disabled = false;
      button.innerHTML = `${cfg.icon}<span>${cfg.label}</span>`;
    }
  }

  private ensureHost(): void {
    if (!this.host) {
      this.host = document.createElement('div');
      this.host.id = '__screenshot_ext_host';
      this.shadow = this.host.attachShadow({ mode: 'closed' });
      const style = document.createElement('style');
      style.textContent = DIALOG_CSS;
      this.shadow.appendChild(style);
      document.documentElement.appendChild(this.host);
    }

    const existingDialog = this.shadow?.querySelector('.dialog');
    existingDialog?.remove();
  }

  private makeDialog(): HTMLElement {
    const dialog = document.createElement('div');
    dialog.className = 'dialog';
    dialog.setAttribute('role', 'dialog');
    this.dialogEl = dialog;
    return dialog;
  }

  private makeHeader(badgeIcon: string, titleText: string, isError: boolean): HTMLElement {
    const row = document.createElement('div');
    row.className = 'header-row';

    const group = document.createElement('div');
    group.className = 'title-group';

    const badge = document.createElement('span');
    badge.className = `status-badge${isError ? ' error' : ''}`;
    badge.innerHTML = badgeIcon;

    const label = document.createElement('span');
    label.className = 'title-text';
    label.textContent = titleText;

    group.append(badge, label);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'close-btn';
    closeBtn.setAttribute('aria-label', 'Close dialog');
    closeBtn.innerHTML = ICONS.close;
    closeBtn.addEventListener('click', () => this.dismiss());

    row.append(group, closeBtn);
    return row;
  }

  private attachInteractionHandlers(dialog: HTMLElement): void {
    dialog.addEventListener('mouseenter', () => {
      this.isInteracting = true;
      this.clearTimer();
    });

    dialog.addEventListener('mouseleave', () => {
      this.isInteracting = false;
      if (!this.busyAction) {
        this.startDismissTimer(DIALOG_INTERACTION_EXTEND_MS);
      }
    });
  }

  private startDismissTimer(timeoutMs: number): void {
    if (this.busyAction) return;
    this.clearTimer();
    this.dismissTimer = setTimeout(() => {
      if (!this.isInteracting) {
        this.dismiss();
      }
    }, timeoutMs);
  }

  private clearTimer(): void {
    if (this.dismissTimer) {
      clearTimeout(this.dismissTimer);
      this.dismissTimer = null;
    }
  }

  private removeHost(): void {
    this.host?.remove();
    this.host = null;
    this.shadow = null;
    this.dialogEl = null;
  }
}
