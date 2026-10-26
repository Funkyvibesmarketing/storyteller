export const themes = {
  brand: { background: "#782b81", foreground: "#ffffff" },
  dark: { background: "#0b0b0c", foreground: "#f2f0eb" },
  light: { background: "#ffffff", foreground: "#0b0b0c" },
  accent: { background: "#c6f432", foreground: "#0b0b0c" },
} as const;

export type ThemeName = keyof typeof themes;

export function isThemeName(value: string | undefined): value is ThemeName {
  return !!value && value in themes;
}
