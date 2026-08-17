import type { PageMetrics } from '../shared/types.js';

export interface NestedContainerInfo {
  element: HTMLElement;
  depth: number;
  scrollWidth: number;
  scrollHeight: number;
  clientWidth: number;
  clientHeight: number;
  scrollTop: number;
  scrollLeft: number;
  overflowX: boolean;
  overflowY: boolean;
}

export function analyzePage(): PageMetrics {
  const doc = document.documentElement;
  const body = document.body;

  const pageWidth = Math.max(
    doc?.scrollWidth ?? 0,
    doc?.offsetWidth ?? 0,
    doc?.clientWidth ?? 0,
    body?.scrollWidth ?? 0,
    body?.offsetWidth ?? 0,
    body?.clientWidth ?? 0,
    window.innerWidth
  );

  const pageHeight = Math.max(
    doc?.scrollHeight ?? 0,
    doc?.offsetHeight ?? 0,
    doc?.clientHeight ?? 0,
    body?.scrollHeight ?? 0,
    body?.offsetHeight ?? 0,
    body?.clientHeight ?? 0,
    window.innerHeight
  );

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  return {
    pageWidth: Math.ceil(pageWidth),
    pageHeight: Math.ceil(pageHeight),
    viewportWidth,
    viewportHeight,
    scrollX: window.scrollX,
    scrollY: window.scrollY,
    maxScrollX: Math.max(0, Math.ceil(pageWidth) - viewportWidth),
    maxScrollY: Math.max(0, Math.ceil(pageHeight) - viewportHeight),
    devicePixelRatio: window.devicePixelRatio || 1,
  };
}

/**
 * Discovers all fixed and sticky elements across the entire document.
 * This includes headers, floating action buttons (scroll-to-top, chat widgets, cookie banners, floating navbars).
 */
export function findAllFixedAndStickyOverlays(): HTMLElement[] {
  const overlays: HTMLElement[] = [];
  const elements = document.querySelectorAll<HTMLElement>('*');

  for (const element of Array.from(elements)) {
    if (
      element === document.documentElement ||
      element === document.body ||
      element.id === '__screenshot_ext_host' ||
      element.closest('#__screenshot_ext_host')
    ) {
      continue;
    }

    const style = getComputedStyle(element);
    const pos = style.position;

    if (pos === 'fixed' || pos === 'sticky') {
      if (style.display === 'none' || style.visibility === 'hidden') {
        continue;
      }

      const rect = element.getBoundingClientRect();
      if (rect.width <= 0 && rect.height <= 0) {
        continue;
      }

      overlays.push(element);
    }
  }

  return overlays;
}

/**
 * Discovers meaningful nested scroll containers across the DOM.
 * Filters out false positives (tiny wrappers, hidden elements, root scrollers).
 * Sorts containers by DOM depth (deepest first) to safely handle nested hierarchies.
 */
export function findNestedScrollContainers(): NestedContainerInfo[] {
  const containers: NestedContainerInfo[] = [];
  const elements = document.querySelectorAll<HTMLElement>('body *');

  for (const element of Array.from(elements)) {
    if (
      element === document.documentElement ||
      element === document.body ||
      element.id === '__screenshot_ext_host' ||
      element.closest('#__screenshot_ext_host')
    ) {
      continue;
    }

    // Ignore media/form elements
    const tag = element.tagName.toLowerCase();
    if (tag === 'textarea' || tag === 'input' || tag === 'select' || tag === 'video' || tag === 'audio' || tag === 'svg' || tag === 'canvas') {
      continue;
    }

    const style = getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden' || Number.parseFloat(style.opacity) === 0) {
      continue;
    }

    const rect = element.getBoundingClientRect();
    if (rect.width < 40 || rect.height < 40) {
      continue;
    }

    const isScrollY =
      (style.overflowY === 'auto' || style.overflowY === 'scroll' || style.overflow === 'auto' || style.overflow === 'scroll') &&
      element.scrollHeight > element.clientHeight + 15;

    const isScrollX =
      (style.overflowX === 'auto' || style.overflowX === 'scroll' || style.overflow === 'auto' || style.overflow === 'scroll') &&
      element.scrollWidth > element.clientWidth + 15;

    if (!isScrollY && !isScrollX) {
      continue;
    }

    // Must contain meaningful children or content
    if (element.childElementCount === 0 && (!element.textContent || element.textContent.trim().length === 0)) {
      continue;
    }

    containers.push({
      element,
      depth: getElementDepth(element),
      scrollWidth: element.scrollWidth,
      scrollHeight: element.scrollHeight,
      clientWidth: element.clientWidth,
      clientHeight: element.clientHeight,
      scrollTop: element.scrollTop,
      scrollLeft: element.scrollLeft,
      overflowX: isScrollX,
      overflowY: isScrollY,
    });
  }

  // Sort by depth descending (deepest first)
  containers.sort((a, b) => b.depth - a.depth);
  return containers;
}

function getElementDepth(element: HTMLElement): number {
  let depth = 0;
  let current: HTMLElement | null = element;
  while (current && current !== document.body) {
    depth++;
    current = current.parentElement;
  }
  return depth;
}
