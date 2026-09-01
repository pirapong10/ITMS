import { getSystemTheme } from '../../src/components/ui/ThemeContext';
import { calculateContrastRatio } from '../../src/lib/a11y';

describe('Frontend Theme Engine (Unit Tests)', () => {
  describe('getSystemTheme helper', () => {
    let originalWindow: any;

    beforeAll(() => {
      originalWindow = (global as any).window;
    });

    afterAll(() => {
      if (originalWindow !== undefined) {
        (global as any).window = originalWindow;
      } else {
        delete (global as any).window;
      }
    });

    it('should return light when window is undefined (SSR environment)', () => {
      delete (global as any).window;
      expect(getSystemTheme()).toBe('light');
    });

    it('should return dark when matchMedia matches dark preference', () => {
      (global as any).window = {
        matchMedia: jest.fn().mockImplementation((query) => ({
          matches: query === '(prefers-color-scheme: dark)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      };

      expect(getSystemTheme()).toBe('dark');
    });

    it('should return light when matchMedia does not match dark preference', () => {
      (global as any).window = {
        matchMedia: jest.fn().mockImplementation(() => ({
          matches: false,
          media: '',
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      };

      expect(getSystemTheme()).toBe('light');
    });
  });

  describe('WCAG 2.1 Contrast Ratios for Dark Mode Palette', () => {
    // Dark Theme tokens from globals.css:
    // --color-bg: #0B0F19
    // --color-surface: #111827
    // --color-text-primary: #F9FAFB
    // --color-text-secondary: #94A3B8
    // --color-primary: #3B82F6

    it('should pass WCAG AA (>4.5:1) for primary text on dark surface', () => {
      const result = calculateContrastRatio('#F9FAFB', '#111827');
      expect(result.ratio).toBeGreaterThanOrEqual(14.0); // Extremely high contrast (>14:1)
      expect(result.isNormalTextAA).toBe(true);
      expect(result.isNormalTextAAA).toBe(true);
    });

    it('should pass WCAG AA (>4.5:1) for secondary text on dark surface', () => {
      const result = calculateContrastRatio('#94A3B8', '#111827');
      expect(result.ratio).toBeGreaterThanOrEqual(4.5);
      expect(result.isNormalTextAA).toBe(true);
    });

    it('should pass WCAG AA (>4.5:1) for primary text on dark background', () => {
      const result = calculateContrastRatio('#F9FAFB', '#0B0F19');
      expect(result.ratio).toBeGreaterThanOrEqual(15.0);
      expect(result.isNormalTextAA).toBe(true);
    });

    it('should pass WCAG AA large text threshold for primary accent on dark surface', () => {
      const result = calculateContrastRatio('#3B82F6', '#111827');
      expect(result.ratio).toBeGreaterThanOrEqual(3.0);
      expect(result.isLargeTextAA).toBe(true);
    });
  });

  describe('WCAG 2.1 Contrast Ratios for Light Mode Palette', () => {
    // Light Theme tokens from globals.css:
    // --color-bg: #F8FAFC
    // --color-surface: #FFFFFF
    // --color-text-primary: #0F172A
    // --color-text-secondary: #64748B
    // --color-primary: #2563EB

    it('should pass WCAG AA (>4.5:1) for dark primary text on white surface', () => {
      const result = calculateContrastRatio('#0F172A', '#FFFFFF');
      expect(result.ratio).toBeGreaterThanOrEqual(14.0);
      expect(result.isNormalTextAA).toBe(true);
      expect(result.isNormalTextAAA).toBe(true);
    });

    it('should pass WCAG AA (>4.5:1) for secondary text on white surface', () => {
      const result = calculateContrastRatio('#64748B', '#FFFFFF');
      expect(result.ratio).toBeGreaterThanOrEqual(4.5);
      expect(result.isNormalTextAA).toBe(true);
    });
  });
});
