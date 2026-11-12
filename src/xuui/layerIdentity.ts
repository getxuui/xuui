import {
  Frame,
  Image,
  Link2,
  MousePointer2,
  Type,
  VectorSquare,
} from 'lucide-react';

export type LayerKind =
  'group' | 'text' | 'image' | 'vector' | 'link' | 'button';

export function layerKind(element: Element): LayerKind {
  if (element.matches('svg')) return 'vector';
  if (element.matches('img, picture, video, canvas')) return 'image';
  if (element.matches('button, input, select, textarea')) return 'button';
  if (element.matches('a')) return 'link';
  if (
    element.matches('span') &&
    !element.textContent?.trim() &&
    !element.children.length
  )
    return 'vector';
  if (
    element.matches(
      'h1,h2,h3,h4,h5,h6,p,span,label,strong,em,small,figcaption',
    ) ||
    [...element.childNodes].some(
      (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
    )
  )
    return 'text';
  return 'group';
}

export const layerIcons = {
  group: Frame,
  text: Type,
  image: Image,
  vector: VectorSquare,
  link: Link2,
  button: MousePointer2,
};

function layerText(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
  if (node instanceof Element && node.matches('br')) return ' ';
  return [...node.childNodes].map(layerText).join('');
}

export function layerName(element: Element): string {
  const explicit =
    element.getAttribute('data-xuui-layer-name') ||
    element.getAttribute('aria-label') ||
    element.getAttribute('alt');
  if (explicit) return explicit;
  if (
    element.parentElement?.matches('[data-xuui-design]') &&
    element.parentElement.children.length === 1
  ) {
    const variant = element.closest<HTMLElement>('[data-variant-name]')?.dataset
      .variantName;
    if (variant) return variant;
  }
  const kind = layerKind(element);
  if (kind !== 'group' && kind !== 'vector') {
    const text = layerText(element).trim().replace(/\s+/g, ' ');
    if (text) return text;
  }
  const semanticClass = [...element.classList].find(
    (name) =>
      /^[a-z]+(?:-[a-z]+)+$/.test(name) &&
      !/^(bg|text|font|border|rounded|flex|grid|items|justify|overflow|pointer|select|object|shadow|gap|space|min|max|inline|block|w|h|p|m|px|py|mx|my)-/.test(
        name,
      ),
  );
  if (semanticClass) {
    const name = semanticClass.replace(/^lucide-/, '').replace(/-/g, ' ');
    return name[0].toUpperCase() + name.slice(1);
  }
  return kind[0].toUpperCase() + kind.slice(1);
}
