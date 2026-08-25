import {
  calculateContrastRatio,
  generateAriaProps,
  hexToRgb,
} from '../../src/lib/a11y';

describe('WCAG 2.1 Accessibility & Color Contrast (Unit Tests)', () => {
  describe('Hex to RGB Converter', () => {
    it('should parse 6-character hex string', () => {
      const rgb = hexToRgb('#ffffff');
      expect(rgb).toEqual({ r: 255, g: 255, b: 255 });
    });

    it('should parse 3-character hex shorthand', () => {
      const rgb = hexToRgb('#000');
      expect(rgb).toEqual({ r: 0, g: 0, b: 0 });
    });
  });

  describe('WCAG Contrast Ratio Calculation', () => {
    it('should calculate 21:1 for pure black on white (Passes AA & AAA)', () => {
      const result = calculateContrastRatio('#000000', '#ffffff');
      expect(result.ratio).toBe(21);
      expect(result.isNormalTextAA).toBe(true);
      expect(result.isLargeTextAA).toBe(true);
      expect(result.isNormalTextAAA).toBe(true);
    });

    it('should fail WCAG AA normal text threshold for low contrast grey on white', () => {
      const result = calculateContrastRatio('#cccccc', '#ffffff');
      expect(result.ratio).toBeLessThan(4.5);
      expect(result.isNormalTextAA).toBe(false);
    });

    it('should pass WCAG AA for high contrast enterprise blue on white', () => {
      const result = calculateContrastRatio('#1e3a8a', '#ffffff');
      expect(result.ratio).toBeGreaterThanOrEqual(4.5);
      expect(result.isNormalTextAA).toBe(true);
    });
  });

  describe('ARIA Props Generator', () => {
    it('should generate accessible dialog attributes', () => {
      const props = generateAriaProps('dialog', {
        label: 'Create Ticket Modal',
        expanded: true,
        hasPopup: 'dialog',
      });
      expect(props.role).toBe('dialog');
      expect(props['aria-label']).toBe('Create Ticket Modal');
      expect(props['aria-expanded']).toBe(true);
    });

    it('should generate live region status attributes', () => {
      const props = generateAriaProps('status', {
        live: 'polite',
        label: 'Saving changes...',
      });
      expect(props.role).toBe('status');
      expect(props['aria-live']).toBe('polite');
    });
  });
});
