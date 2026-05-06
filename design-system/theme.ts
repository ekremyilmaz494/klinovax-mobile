import { useColorScheme } from '@/hooks/use-color-scheme';
import { Hairline, Motion, Palette, Radius, Shadow, Space } from './tokens';

export type ThemeMode = 'light' | 'dark';

export interface SemanticColors {
  surface: { canvas: string; primary: string; secondary: string; sunken: string; inverse: string };
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
    onAccent: string;
    onInverse: string;
    danger: string;
    success: string;
  };
  border: { subtle: string; default: string; strong: string; focus: string };
  accent: {
    clay: string;
    clayHover: string;
    clayMuted: string;
    clayOnAccent: string;
    bgMuted: string;
  };
  status: {
    success: string;
    successBg: string;
    danger: string;
    dangerBg: string;
    warning: string;
    warningBg: string;
    info: string;
    infoBg: string;
  };
  overlay: { scrim: string; pressed: string };
}

export const lightTheme: SemanticColors = {
  surface: {
    canvas: Palette.sand[100],
    primary: Palette.sand[50],
    secondary: Palette.sand[200],
    sunken: Palette.sand[200],
    inverse: Palette.ink[900],
  },
  text: {
    primary: Palette.ink[900],
    secondary: Palette.ink[700],
    tertiary: Palette.stone[500],
    onAccent: Palette.sand[50],
    onInverse: Palette.sand[50],
    danger: Palette.ember[700],
    success: Palette.sage[700],
  },
  border: {
    subtle: Palette.sand[200],
    default: Palette.sand[300],
    strong: Palette.stone[400],
    focus: Palette.clay[600],
  },
  accent: {
    clay: Palette.clay[600],
    clayHover: Palette.clay[700],
    clayMuted: Palette.clay[300],
    clayOnAccent: Palette.sand[50],
    // accent variant Card arka plan tonu — sand-50'den sıcak, clay-300'den soluk
    bgMuted: '#FBEFE5',
  },
  status: {
    success: Palette.sage[700],
    successBg: Palette.sage[200],
    danger: Palette.ember[700],
    dangerBg: Palette.ember[200],
    warning: Palette.amber[600],
    warningBg: Palette.amber[200],
    info: Palette.ink[700],
    infoBg: Palette.sand[200],
  },
  overlay: {
    scrim: 'rgba(27,26,23,0.45)',
    pressed: 'rgba(27,26,23,0.06)',
  },
};

export const darkTheme: SemanticColors = {
  surface: {
    canvas: Palette.night[900],
    primary: Palette.night[800],
    secondary: Palette.night[700],
    sunken: Palette.night[900],
    inverse: Palette.sand[100],
  },
  text: {
    primary: Palette.parchment[50],
    secondary: Palette.parchment[200],
    tertiary: Palette.parchment[400],
    onAccent: Palette.night[900],
    onInverse: Palette.ink[900],
    danger: Palette.ember[400],
    success: Palette.sage[400],
  },
  border: {
    subtle: Palette.night[700],
    default: Palette.night[600],
    strong: Palette.parchment[400],
    focus: Palette.clay[400],
  },
  accent: {
    clay: Palette.clay[400],
    clayHover: '#F2A06D',
    clayMuted: '#5A2C18',
    clayOnAccent: Palette.night[900],
    // dark mode accent Card: clay 400 düşük opacity overlay night-800 üzerinde
    bgMuted: 'rgba(224,122,69,0.18)',
  },
  status: {
    success: Palette.sage[400],
    successBg: 'rgba(110,149,96,0.18)',
    danger: Palette.ember[400],
    dangerBg: 'rgba(185,28,28,0.20)',
    warning: Palette.amber[400],
    warningBg: 'rgba(180,83,9,0.20)',
    info: Palette.parchment[200],
    infoBg: 'rgba(146,137,121,0.16)',
  },
  overlay: {
    scrim: 'rgba(0,0,0,0.55)',
    pressed: 'rgba(255,255,255,0.06)',
  },
};

export interface Theme {
  mode: ThemeMode;
  colors: SemanticColors;
  radius: typeof Radius;
  space: typeof Space;
  shadow: typeof Shadow;
  motion: typeof Motion;
  hairline: number;
}

export function useTheme(): Theme {
  const scheme = useColorScheme();
  const mode: ThemeMode = scheme === 'dark' ? 'dark' : 'light';
  return {
    mode,
    colors: mode === 'dark' ? darkTheme : lightTheme,
    radius: Radius,
    space: Space,
    shadow: Shadow,
    motion: Motion,
    hairline: Hairline,
  };
}
