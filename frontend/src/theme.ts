import { useMemo } from "react";
import { Appearance, StyleSheet, useColorScheme } from "react-native";

export type ColorScheme = "light" | "dark";

const light = {
  surface: "#FFFDF9",
  onSurface: "#1A1A1A",
  surfaceSecondary: "#FFF4EC",
  onSurfaceSecondary: "#2C221E",
  surfaceTertiary: "#FFE8D6",
  onSurfaceTertiary: "#3D2C24",
  surfaceInverse: "#1F1B18",
  onSurfaceInverse: "#FFFDF9",
  muted: "#7A6E65",
  brand: "#FF6B35",
  onBrand: "#FFFFFF",
  brandPrimary: "#FF6B35",
  onBrandPrimary: "#FFFFFF",
  brandSecondary: "#FF9F1C",
  onBrandSecondary: "#1A1A1A",
  brandTertiary: "#FFE1CC",
  onBrandTertiary: "#D3480C",
  success: "#2EC4B6",
  onSuccess: "#FFFFFF",
  warning: "#FFB703",
  onWarning: "#1A1A1A",
  error: "#E71D36",
  onError: "#FFFFFF",
  info: "#3A86FF",
  onInfo: "#FFFFFF",
  border: "#E6D7CD",
  borderStrong: "#FF6B35",
  divider: "#F0E4DC",
  glowCorrect: "#2EC4B688",
  glowIncorrect: "#E71D3688",
  glowBlitz: "#FF9F1C88",
  darkBackground: "#050820",
  neonCyan: "#00f0ff",
  neonMagenta: "#ff003c",
};

const dark = {
  surface: "#080B1A", // Deep space dark blue
  onSurface: "#FFFFFF",
  surfaceSecondary: "#131835", // Slightly lighter for cards
  onSurfaceSecondary: "#E2E8F0",
  surfaceTertiary: "#1D244B", 
  onSurfaceTertiary: "#CBD5E1",
  surfaceInverse: "#FFFDF9",
  onSurfaceInverse: "#1A1A1A",
  muted: "#94A3B8",
  brand: "#38BDF8", // Bright cyan
  onBrand: "#0F172A",
  brandPrimary: "#38BDF8",
  onBrandPrimary: "#0F172A",
  brandSecondary: "#FBBF24", // Gold/yellow for tokens
  onBrandSecondary: "#0F172A",
  brandTertiary: "#1E293B",
  onBrandTertiary: "#38BDF8",
  success: "#10B981", // Neon green for correct
  onSuccess: "#FFFFFF",
  warning: "#F59E0B", // Bright orange
  onWarning: "#FFFFFF",
  error: "#EF4444", // Bright red
  onError: "#FFFFFF",
  info: "#3B82F6",
  onInfo: "#FFFFFF",
  border: "#1E293B",
  borderStrong: "#38BDF8",
  divider: "#1E293B",
  glowCorrect: "rgba(16, 185, 129, 0.4)",
  glowIncorrect: "rgba(239, 68, 68, 0.4)",
  glowBlitz: "rgba(251, 191, 36, 0.4)",
  darkBackground: "#03040B",
  neonCyan: "#00f0ff",
  neonMagenta: "#ff003c",
};

export type ThemeColors = typeof light;
export const defaultScheme = "dark" satisfies ColorScheme;
export const themes: { light: ThemeColors; dark?: ThemeColors } = { light, dark };

export function setColorScheme(scheme: ColorScheme | null) {
  Appearance.setColorScheme?.(scheme ?? "unspecified");
}

setColorScheme(defaultScheme);

export function useTheme(): { scheme: ColorScheme; colors: ThemeColors } {
  const system = useColorScheme();
  const scheme: ColorScheme = system === "dark" && themes.dark ? "dark" : defaultScheme;
  return { scheme, colors: themes[scheme] ?? themes.light };
}

export function makeStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (colors: ThemeColors) => T & StyleSheet.NamedStyles<any>,
): () => T {
  return function useStyles(): T {
    const { colors } = useTheme();
    return useMemo(() => StyleSheet.create(factory(colors)), [colors]);
  };
}