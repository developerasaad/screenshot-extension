import type { NestedContainerInfo } from './page-analyzer.js';

interface StyleRecord {
  element: HTMLElement;
  value: string;
  priority: string;
}

interface SavedContainerState {
  info: NestedContainerInfo;
  styles: Map<string, { value: string; priority: string }>;
}

export class PageStateManager {
  private originalScroll: { x: number; y: number } | null = null;
  private visibilityRecords = new Map<HTMLElement, StyleRecord>();
  private nestedContainerStates: SavedContainerState[] = [];
  private injectedStyleEl: HTMLStyleElement | null = null;

  recordScroll(): void {
    this.originalScroll = { x: window.scrollX, y: window.scrollY };
  }

  disableSmoothScroll(): void {
    if (!this.injectedStyleEl) {
      const style = document.createElement('style');
      style.id = '__ss_no_smooth_scroll';
      style.textContent = `
        html, body, * {
          scroll-behavior: auto !important;
        }
        ::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }
        html, body {
          scrollbar-width: none !important;
        }
        .__ss_hide_scrollbar::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }
      `;
      (document.head || document.documentElement).appendChild(style);
      this.injectedStyleEl = style;
    }
  }

  expandNestedContainers(containers: NestedContainerInfo[]): void {
    this.nestedContainerStates = [];

    const styleProps = [
      'max-height',
      'min-height',
      'height',
      'max-width',
      'min-width',
      'width',
      'overflow',
      'overflow-y',
      'overflow-x',
      'scrollbar-width',
    ];

    for (const info of containers) {
      const el = info.element;
      const savedStyles = new Map<string, { value: string; priority: string }>();

      for (const prop of styleProps) {
        savedStyles.set(prop, {
          value: el.style.getPropertyValue(prop),
          priority: el.style.getPropertyPriority(prop),
        });
      }

      this.nestedContainerStates.push({
        info,
        styles: savedStyles,
      });

      // Expand to expose all inner scrollable content safely
      if (info.overflowY) {
        const fullHeight = Math.max(el.scrollHeight, info.clientHeight);
        el.style.setProperty('max-height', 'none', 'important');
        el.style.setProperty('min-height', `${fullHeight}px`, 'important');
        el.style.setProperty('height', 'auto', 'important');
        el.style.setProperty('overflow-y', 'visible', 'important');
      }

      if (info.overflowX) {
        const fullWidth = Math.max(el.scrollWidth, info.clientWidth);
        el.style.setProperty('max-width', 'none', 'important');
        el.style.setProperty('min-width', `${fullWidth}px`, 'important');
        el.style.setProperty('width', 'auto', 'important');
        el.style.setProperty('overflow-x', 'visible', 'important');
      }

      el.style.setProperty('overflow', 'visible', 'important');
      el.style.setProperty('scrollbar-width', 'none', 'important');
      el.classList.add('__ss_hide_scrollbar');
    }
  }

  restoreNestedContainers(): void {
    for (const saved of this.nestedContainerStates) {
      const el = saved.info.element;

      for (const [prop, record] of saved.styles.entries()) {
        if (record.value) {
          el.style.setProperty(prop, record.value, record.priority);
        } else {
          el.style.removeProperty(prop);
        }
      }

      el.classList.remove('__ss_hide_scrollbar');
      el.scrollTop = saved.info.scrollTop;
      el.scrollLeft = saved.info.scrollLeft;
    }

    this.nestedContainerStates = [];
  }

  hideOverlays(overlays: HTMLElement[]): void {
    for (const element of overlays) {
      if (!this.visibilityRecords.has(element)) {
        this.visibilityRecords.set(element, {
          element,
          value: element.style.getPropertyValue('visibility'),
          priority: element.style.getPropertyPriority('visibility'),
        });
      }
      element.style.setProperty('visibility', 'hidden', 'important');
    }
  }

  restoreStyles(): void {
    for (const record of this.visibilityRecords.values()) {
      if (record.value) {
        record.element.style.setProperty('visibility', record.value, record.priority);
      } else {
        record.element.style.removeProperty('visibility');
      }
    }
    this.visibilityRecords.clear();
  }

  async restoreAll(): Promise<void> {
    this.restoreNestedContainers();
    this.restoreStyles();

    if (this.injectedStyleEl) {
      this.injectedStyleEl.remove();
      this.injectedStyleEl = null;
    }

    if (this.originalScroll) {
      window.scrollTo({
        left: this.originalScroll.x,
        top: this.originalScroll.y,
        behavior: 'instant',
      });
      await waitForFrame();
    }
  }
}

function waitForFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}
