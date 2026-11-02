import { canvasScale, relativeBounds } from './workspaceGeometry';
import type { Bounds } from './workspaceGeometry';
import { layerKind, layerName } from './layerIdentity';
import type { LayerKind } from './layerIdentity';

export type LayerProperty = { label: string; value: string; color?: string };
export type LayerProperties = {
  variantId: string;
  count: number;
  name: string;
  tag: string;
  kind: LayerKind;
  bounds: Bounds;
  appearance: LayerProperty[];
  typography: LayerProperty[];
};

const round = (value: number, precision = 1) => {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
};
const length = (value: string) =>
  value.endsWith('px') ? `${round(parseFloat(value), 2)}px` : value;

function colorValue(color: string) {
  if (!color.startsWith('rgb')) return color === 'transparent' ? null : color;
  const parts = color.match(/[\d.]+/g)?.map(Number);
  if (!parts || parts[3] === 0) return null;
  const channels = parts.slice(0, 3);
  if (parts[3] !== undefined && parts[3] < 1)
    channels.push(Math.round(parts[3] * 255));
  return `#${channels
    .map((value) => Math.round(value).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()}`;
}

export function readLayerProperties(
  elements: Element[],
  box: Bounds,
  design: HTMLElement,
  surface: HTMLElement,
): LayerProperties {
  const origin = relativeBounds(design, surface);
  const scale = canvasScale(design);
  const element = elements[0];
  const result: LayerProperties = {
    variantId:
      design.closest<HTMLElement>('[data-variant-id]')?.dataset.variantId ?? '',
    count: elements.length,
    name: `${elements.length} layers`,
    tag: '',
    kind: 'group',
    bounds: {
      x: round((box.x - origin.x) / scale),
      y: round((box.y - origin.y) / scale),
      width: round(box.width / scale),
      height: round(box.height / scale),
    },
    appearance: [],
    typography: [],
  };
  if (elements.length !== 1) return result;

  const style = getComputedStyle(element);
  const text = element.textContent?.trim().replace(/\s+/g, ' ') ?? '';
  const hasText =
    !(element instanceof SVGElement) &&
    text.length > 0 &&
    ([...element.childNodes].some(
      (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
    ) ||
      element.matches(
        'h1, h2, h3, h4, h5, h6, p, button, a, label, legend, figcaption',
      ));
  result.tag = element.tagName.toLowerCase();
  result.name = layerName(element);
  result.kind = layerKind(element);

  const fill = colorValue(style.backgroundColor);
  if (fill)
    result.appearance.push({
      label: 'Fill',
      value: fill,
      color: style.backgroundColor,
    });
  if (style.backgroundImage !== 'none')
    result.appearance.push({
      label: 'Background',
      value: style.backgroundImage.includes('gradient(') ? 'Gradient' : 'Image',
    });
  const ink = hasText ? colorValue(style.color) : null;
  if (ink)
    result.appearance.push({
      label: 'Text color',
      value: ink,
      color: style.color,
    });

  const edges = ['top', 'right', 'bottom', 'left'].map((side) => {
    const width = style.getPropertyValue(`border-${side}-width`);
    const borderStyle = style.getPropertyValue(`border-${side}-style`);
    const color = style.getPropertyValue(`border-${side}-color`);
    const value = colorValue(color);
    return parseFloat(width) > 0 && borderStyle !== 'none' && value
      ? {
          label: `Border ${side}`,
          value: `${length(width)} ${borderStyle} ${value}`,
          color,
        }
      : null;
  });
  if (edges[0] && edges.every((edge) => edge?.value === edges[0]?.value))
    result.appearance.push({ ...edges[0], label: 'Border' });
  else result.appearance.push(...edges.filter((edge) => edge !== null));
  const radii = [
    style.borderTopLeftRadius,
    style.borderTopRightRadius,
    style.borderBottomRightRadius,
    style.borderBottomLeftRadius,
  ];
  if (radii.some((radius) => parseFloat(radius) > 0))
    result.appearance.push({
      label: 'Radius',
      value: radii.every((radius) => radius === radii[0])
        ? length(radii[0])
        : radii.map(length).join(' '),
    });

  if (hasText)
    result.typography = [
      {
        label: 'Font',
        value: style.fontFamily
          .split(',')[0]
          .trim()
          .replace(/^['"]|['"]$/g, '')
          .replace(/ Variable$/, ''),
      },
      { label: 'Size', value: length(style.fontSize) },
      { label: 'Weight', value: style.fontWeight },
      { label: 'Line height', value: length(style.lineHeight) },
      {
        label: 'Letter spacing',
        value:
          style.letterSpacing === 'normal'
            ? '0px'
            : length(style.letterSpacing),
      },
    ];
  return result;
}
