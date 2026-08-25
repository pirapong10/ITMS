/**
 * WCAG 2.1 Level AA / AAA Accessibility Utility Library
 */

/**
 * Converts Hex color string (#ffffff or #fff) to RGB values.
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let cleaned = hex.replace('#', '').trim();
  if (cleaned.length === 3) {
    cleaned = cleaned
      .split('')
      .map((c) => c + c)
      .join('');
  }

  const num = parseInt(cleaned, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

/**
 * Calculates relative luminance of an sRGB color per WCAG 2.1 definition.
 */
export function getRelativeLuminance(rgb: { r: number; g: number; b: number }): number {
  const [rs, gs, bs] = [rgb.r / 255, rgb.g / 255, rgb.b / 255].map((c) => {
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

export interface ContrastRatioResult {
  ratio: number;
  formattedRatio: string;
  isNormalTextAA: boolean;
  isLargeTextAA: boolean;
  isNormalTextAAA: boolean;
  isLargeTextAAA: boolean;
}

/**
 * Computes WCAG 2.1 Contrast Ratio between two hex colors.
 */
export function calculateContrastRatio(
  foregroundHex: string,
  backgroundHex: string
): ContrastRatioResult {
  const fg = hexToRgb(foregroundHex);
  const bg = hexToRgb(backgroundHex);

  const l1 = getRelativeLuminance(fg);
  const l2 = getRelativeLuminance(bg);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  const ratio = (lighter + 0.05) / (darker + 0.05);
  const roundedRatio = Math.round(ratio * 100) / 100;

  return {
    ratio: roundedRatio,
    formattedRatio: `${roundedRatio.toFixed(2)}:1`,
    isNormalTextAA: roundedRatio >= 4.5,
    isLargeTextAA: roundedRatio >= 3.0,
    isNormalTextAAA: roundedRatio >= 7.0,
    isLargeTextAAA: roundedRatio >= 4.5,
  };
}

/**
 * Standard ARIA attribute helper for interactive and accessible components.
 */
export function generateAriaProps(
  role: 'button' | 'dialog' | 'alert' | 'status' | 'menu' | 'menuitem' | 'tab' | 'search',
  options: {
    label?: string;
    description?: string;
    expanded?: boolean;
    hasPopup?: boolean | 'dialog' | 'menu' | 'listbox';
    live?: 'polite' | 'assertive' | 'off';
    selected?: boolean;
    controls?: string;
  } = {}
): Record<string, any> {
  const props: Record<string, any> = { role };

  if (options.label) props['aria-label'] = options.label;
  if (options.description) props['aria-description'] = options.description;
  if (options.expanded !== undefined) props['aria-expanded'] = options.expanded;
  if (options.hasPopup !== undefined) props['aria-haspopup'] = options.hasPopup;
  if (options.live) props['aria-live'] = options.live;
  if (options.selected !== undefined) props['aria-selected'] = options.selected;
  if (options.controls) props['aria-controls'] = options.controls;

  return props;
}
