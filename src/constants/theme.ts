/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#1C1C1E',
    textSecondary: '#6E6E73',
    textTertiary: '#8E8E93',
    background: '#F2F2F7',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#E5E5EA',
    surface: '#FFFFFF',
    secondarySurface: '#F8F8FA',
    separator: '#D1D1D6',
    border: '#E5E5EA',
    accent: '#007AFF',
    success: '#34C759',
    warning: '#FF9500',
    destructive: '#FF3B30',
  },
  dark: {
    text: '#FFFFFF',
    textSecondary: '#B0B4BA',
    textTertiary: '#8E8E93',
    background: '#000000',
    backgroundElement: '#1C1C1E',
    backgroundSelected: '#2E3135',
    surface: '#1C1C1E',
    secondarySurface: '#212225',
    separator: '#38383A',
    border: '#38383A',
    accent: '#0A84FF',
    success: '#32D74B',
    warning: '#FF9F0A',
    destructive: '#FF453A',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

// Shared iOS-style layout constants so screens don't hand-roll one-off radii/heights.
export const Radius = {
  card: 14,
  control: 12,
} as const;

export const ControlHeight = {
  primaryButton: 52,
  listRow: 54,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80, web: 90 }) ?? 0;
export const MaxContentWidth = 800;
