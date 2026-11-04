import { getElementClasses, getNearbyText, identifyElement } from 'agentation';
import type { Annotation } from 'agentation';
import type { Comment } from './model';

/** Scope a locator to the stable variant, independently of the canvas camera. */
export function selectorFor(element: Element, variantId: string) {
  const parts: string[] = [];
  let current: Element | null = element;
  while (current && !current.hasAttribute('data-xuui-design')) {
    const siblings: Element[] = current.parentElement
      ? Array.from(current.parentElement.children).filter(
          (sibling) => sibling.tagName === current!.tagName,
        )
      : [];
    parts.unshift(
      `${current.tagName.toLowerCase()}:nth-of-type(${siblings.indexOf(current) + 1})`,
    );
    current = current.parentElement;
  }
  return `[data-variant-id="${CSS.escape(variantId)}"] [data-xuui-design] > ${parts.join(' > ')}`;
}

export function captureComment(
  element: HTMLElement,
  variantId: string,
  point: { x: number; y: number },
): Comment {
  const id = crypto.randomUUID();
  const rect = element.getBoundingClientRect();
  const identified = identifyElement(element);
  const selector = selectorFor(element, variantId);
  const style = getComputedStyle(element);
  const styles = Object.fromEntries(
    [
      'display',
      'position',
      'width',
      'height',
      'padding',
      'gap',
      'font-family',
      'font-size',
      'font-weight',
      'line-height',
      'color',
      'background-color',
      'border-radius',
    ].map((key) => [key, style.getPropertyValue(key)]),
  );
  const accessibleName = (
    element.getAttribute('aria-label') ||
    element
      .getAttribute('aria-labelledby')
      ?.split(/\s+/)
      .map((label) => document.getElementById(label)?.textContent ?? '')
      .join(' ') ||
    element.getAttribute('alt') ||
    element.textContent ||
    ''
  )
    .trim()
    .slice(0, 300);
  const bounds = {
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
  };
  const annotation: Annotation = {
    id,
    x: (point.x / window.innerWidth) * 100,
    y: point.y + window.scrollY,
    comment: '',
    element: identified.name.slice(0, 500),
    elementPath: selector,
    fullPath: selector,
    timestamp: Date.now(),
    url: window.location.href,
    boundingBox: bounds,
    cssClasses: getElementClasses(element).slice(0, 4000),
    nearbyText: getNearbyText(element).slice(0, 2000),
    computedStyles: JSON.stringify(styles),
    accessibility: JSON.stringify({
      name: accessibleName,
      role: element.getAttribute('role'),
    }),
    attributes: { 'data-xuui-variant': variantId },
  };
  return {
    id,
    variantId: variantId,
    body: '',
    createdAt: new Date(annotation.timestamp).toISOString(),
    target: {
      selector,
      tagName: element.tagName.toLowerCase(),
      accessibleName,
      text: (element.textContent ?? '').trim().slice(0, 500),
      bounds,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      pin: {
        x: Math.max(0, Math.min(1, (point.x - rect.left) / (rect.width || 1))),
        y: Math.max(0, Math.min(1, (point.y - rect.top) / (rect.height || 1))),
      },
    },
    agentation: annotation,
  };
}

export function findCommentElement(comment: Comment): Element | null {
  try {
    return document.querySelector(comment.target.selector);
  } catch {
    return null;
  }
}
