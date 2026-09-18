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
};

export type ThemeColors = typeof light;
export const defaultScheme = "light" satisfies ColorScheme;
export const themes: { light: ThemeColors; dark?: ThemeColors } = { light };

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