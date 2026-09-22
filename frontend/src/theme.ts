import { createContext, useContext, useMemo } from "react";
import { StyleSheet } from "react-native";
import type { ThemeId } from "@/src/game/types";

export type ColorScheme = "light" | "dark";

// ─── Palette factory ──────────────────────────────────────────────────────────
function palette(p: {
  surface: string; surface2: string; surface3: string;
  onSurface: string; muted: string;
  primary: string; onPrimary: string;
  secondary: string; onSecondary: string;
  tertiary: string; onTertiary: string;
  success: string; warning: string; error: string; info: string;
  border: string; divider: string;
}) {
  return {
    surface: p.surface,
    onSurface: p.onSurface,
    surfaceSecondary: p.surface2,
    onSurfaceSecondary: p.onSurface,
    surfaceTertiary: p.surface3,
    onSurfaceTertiary: p.onSurface,
    surfaceInverse: p.onSurface,
    onSurfaceInverse: p.surface,
    muted: p.muted,
    brand: p.primary,
    onBrand: p.onPrimary,
    brandPrimary: p.primary,
    onBrandPrimary: p.onPrimary,
    brandSecondary: p.secondary,
    onBrandSecondary: p.onSecondary,
    brandTertiary: p.tertiary,
    onBrandTertiary: p.onTertiary,
    success: p.success,
    onSuccess: "#FFFFFF",
    warning: p.warning,
    onWarning: "#1A1A1A",
    error: p.error,
    onError: "#FFFFFF",
    info: p.info,
    onInfo: "#FFFFFF",
    border: p.border,
    borderStrong: p.primary,
    divider: p.divider,
    glowCorrect: p.success + "88",
    glowIncorrect: p.error + "88",
    glowBlitz: p.secondary + "88",
    darkBackground: "#FFFDF9",
    neonCyan: "#00b4d8",
    neonMagenta: "#e63946",
  };
}

// ─── All 12 Themes ───────────────────────────────────────────────────────────
const THEME_PALETTES: Record<ThemeId, ReturnType<typeof palette>> = {
  classic: palette({
    surface: "#FFFDF9", surface2: "#FFF4EC", surface3: "#FFE8D6",
    onSurface: "#1A1A1A", muted: "#7A6E65",
    primary: "#FF6B35", onPrimary: "#FFFFFF",
    secondary: "#FF9F1C", onSecondary: "#1A1A1A",
    tertiary: "#FFE1CC", onTertiary: "#D3480C",
    success: "#2EC4B6", warning: "#FFB703", error: "#E71D36", info: "#3A86FF",
    border: "#E6D7CD", divider: "#F0E4DC",
  }),

  cosmic: palette({
    surface: "#0D0B1A", surface2: "#1A1535", surface3: "#241E4E",
    onSurface: "#E8DEFF", muted: "#9B89CC",
    primary: "#7C3AED", onPrimary: "#FFFFFF",
    secondary: "#A78BFA", onSecondary: "#1A0A3A",
    tertiary: "#2D1B69", onTertiary: "#C4B5FD",
    success: "#10B981", warning: "#F59E0B", error: "#EF4444", info: "#818CF8",
    border: "#2D1B69", divider: "#1E1145",
  }),

  ocean: palette({
    surface: "#F0F9FF", surface2: "#E0F2FE", surface3: "#BAE6FD",
    onSurface: "#0C2340", muted: "#5B8FA8",
    primary: "#0369A1", onPrimary: "#FFFFFF",
    secondary: "#0EA5E9", onSecondary: "#FFFFFF",
    tertiary: "#DBEAFE", onTertiary: "#1D4ED8",
    success: "#059669", warning: "#D97706", error: "#DC2626", info: "#2563EB",
    border: "#BAE6FD", divider: "#E0F2FE",
  }),

  forest: palette({
    surface: "#F0FDF4", surface2: "#DCFCE7", surface3: "#BBF7D0",
    onSurface: "#052e16", muted: "#4D7A5A",
    primary: "#15803D", onPrimary: "#FFFFFF",
    secondary: "#22C55E", onSecondary: "#052E16",
    tertiary: "#D1FAE5", onTertiary: "#065F46",
    success: "#10B981", warning: "#CA8A04", error: "#DC2626", info: "#0284C7",
    border: "#BBF7D0", divider: "#DCFCE7",
  }),

  candy: palette({
    surface: "#FFF0F7", surface2: "#FCE7F3", surface3: "#FBCFE8",
    onSurface: "#4A0030", muted: "#9E4C78",
    primary: "#EC4899", onPrimary: "#FFFFFF",
    secondary: "#F9A8D4", onSecondary: "#831843",
    tertiary: "#FDE8EF", onTertiary: "#BE185D",
    success: "#10B981", warning: "#F59E0B", error: "#DC2626", info: "#6366F1",
    border: "#FBCFE8", divider: "#FCE7F3",
  }),

  neon: palette({
    surface: "#050505", surface2: "#0A1A0A", surface3: "#0F2A0F",
    onSurface: "#00FF88", muted: "#00AA55",
    primary: "#00F0FF", onPrimary: "#000000",
    secondary: "#FF00FF", onSecondary: "#000000",
    tertiary: "#001A1A", onTertiary: "#00F0FF",
    success: "#00FF88", warning: "#FFFF00", error: "#FF0033", info: "#00AAFF",
    border: "#003333", divider: "#001A1A",
  }),

  volcano: palette({
    surface: "#1A0500", surface2: "#2D0900", surface3: "#4A1000",
    onSurface: "#FFD4B3", muted: "#A0553A",
    primary: "#DC2626", onPrimary: "#FFFFFF",
    secondary: "#F97316", onSecondary: "#1A0500",
    tertiary: "#3D0B00", onTertiary: "#FB923C",
    success: "#22C55E", warning: "#EAB308", error: "#FF0000", info: "#FB923C",
    border: "#6B1500", divider: "#4A1000",
  }),

  diwali: palette({
    surface: "#1A0A00", surface2: "#2D1500", surface3: "#472200",
    onSurface: "#FFE4A0", muted: "#B8913A",
    primary: "#F59E0B", onPrimary: "#1A0A00",
    secondary: "#EF4444", onSecondary: "#FFFFFF",
    tertiary: "#3D2200", onTertiary: "#FCD34D",
    success: "#22C55E", warning: "#FBBF24", error: "#EF4444", info: "#A78BFA",
    border: "#6B3A00", divider: "#472200",
  }),

  holi: palette({
    surface: "#FFF8FF", surface2: "#FAE8FF", surface3: "#F3D0FF",
    onSurface: "#2D0050", muted: "#894AAA",
    primary: "#A855F7", onPrimary: "#FFFFFF",
    secondary: "#F97316", onSecondary: "#FFFFFF",
    tertiary: "#EDE9FE", onTertiary: "#7C3AED",
    success: "#22C55E", warning: "#F59E0B", error: "#EF4444", info: "#3B82F6",
    border: "#E9D5FF", divider: "#F3E8FF",
  }),

  christmas: palette({
    surface: "#F0FFF4", surface2: "#DCFCE7", surface3: "#BBF7D0",
    onSurface: "#052E16", muted: "#4D7A5A",
    primary: "#16A34A", onPrimary: "#FFFFFF",
    secondary: "#DC2626", onSecondary: "#FFFFFF",
    tertiary: "#DCFCE7", onTertiary: "#166534",
    success: "#22C55E", warning: "#EAB308", error: "#DC2626", info: "#3B82F6",
    border: "#BBF7D0", divider: "#DCFCE7",
  }),

  eid: palette({
    surface: "#F0F9FF", surface2: "#E0F2FE", surface3: "#BAE6FD",
    onSurface: "#0C2340", muted: "#4B7A99",
    primary: "#0EA5E9", onPrimary: "#FFFFFF",
    secondary: "#F59E0B", onSecondary: "#0C2340",
    tertiary: "#DBEAFE", onTertiary: "#1D4ED8",
    success: "#10B981", warning: "#D97706", error: "#DC2626", info: "#6366F1",
    border: "#BAE6FD", divider: "#E0F2FE",
  }),

  midnight: palette({
    surface: "#0F172A", surface2: "#1E293B", surface3: "#334155",
    onSurface: "#F1F5F9", muted: "#94A3B8",
    primary: "#6366F1", onPrimary: "#FFFFFF",
    secondary: "#8B5CF6", onSecondary: "#FFFFFF",
    tertiary: "#1E293B", onTertiary: "#818CF8",
    success: "#10B981", warning: "#F59E0B", error: "#EF4444", info: "#38BDF8",
    border: "#334155", divider: "#1E293B",
  }),
};

export type ThemeColors = ReturnType<typeof palette>;

// Night / Dark mode variants for themes to match the cosmic astronaut wallpaper
const THEME_NIGHT_PALETTES: Partial<Record<ThemeId, ThemeColors>> = {
  classic: palette({
    surface: "rgba(10, 14, 26, 0.90)", surface2: "rgba(22, 29, 49, 0.90)", surface3: "rgba(33, 43, 70, 0.90)",
    onSurface: "#F8FAFC", muted: "#94A3B8",
    primary: "#FF6B35", onPrimary: "#FFFFFF",
    secondary: "#FF9F1C", onSecondary: "#0A0E1A",
    tertiary: "#2D1B36", onTertiary: "#FF8C5A",
    success: "#2EC4B6", warning: "#FFB703", error: "#E71D36", info: "#3A86FF",
    border: "rgba(255, 255, 255, 0.14)", divider: "rgba(255, 255, 255, 0.08)",
  }),
  ocean: palette({
    surface: "rgba(8, 20, 38, 0.90)", surface2: "rgba(14, 34, 62, 0.90)", surface3: "rgba(22, 48, 86, 0.90)",
    onSurface: "#F0F9FF", muted: "#7DD3FC",
    primary: "#38BDF8", onPrimary: "#081426",
    secondary: "#0EA5E9", onSecondary: "#FFFFFF",
    tertiary: "#1E3A5F", onTertiary: "#BAE6FD",
    success: "#10B981", warning: "#F59E0B", error: "#EF4444", info: "#60A5FA",
    border: "rgba(56, 189, 248, 0.22)", divider: "rgba(56, 189, 248, 0.12)",
  }),
  forest: palette({
    surface: "rgba(6, 24, 16, 0.90)", surface2: "rgba(12, 40, 28, 0.90)", surface3: "rgba(20, 58, 42, 0.90)",
    onSurface: "#F0FDF4", muted: "#86EFAC",
    primary: "#22C55E", onPrimary: "#061810",
    secondary: "#4ADE80", onSecondary: "#061810",
    tertiary: "#144832", onTertiary: "#BBF7D0",
    success: "#10B981", warning: "#F59E0B", error: "#EF4444", info: "#38BDF8",
    border: "rgba(34, 197, 94, 0.22)", divider: "rgba(34, 197, 94, 0.12)",
  }),
  candy: palette({
    surface: "rgba(28, 10, 24, 0.90)", surface2: "rgba(46, 18, 40, 0.90)", surface3: "rgba(66, 26, 58, 0.90)",
    onSurface: "#FDF2F8", muted: "#F472B6",
    primary: "#EC4899", onPrimary: "#FFFFFF",
    secondary: "#F472B6", onSecondary: "#1C0A18",
    tertiary: "#4A1840", onTertiary: "#FBCFE8",
    success: "#10B981", warning: "#F59E0B", error: "#EF4444", info: "#818CF8",
    border: "rgba(236, 72, 153, 0.22)", divider: "rgba(236, 72, 153, 0.12)",
  }),
  holi: palette({
    surface: "rgba(20, 10, 36, 0.90)", surface2: "rgba(36, 18, 62, 0.90)", surface3: "rgba(54, 28, 90, 0.90)",
    onSurface: "#FAF5FF", muted: "#C084FC",
    primary: "#A855F7", onPrimary: "#FFFFFF",
    secondary: "#F97316", onSecondary: "#140A24",
    tertiary: "#441D6E", onTertiary: "#E9D5FF",
    success: "#10B981", warning: "#F59E0B", error: "#EF4444", info: "#38BDF8",
    border: "rgba(168, 85, 247, 0.22)", divider: "rgba(168, 85, 247, 0.12)",
  }),
  christmas: palette({
    surface: "rgba(10, 24, 16, 0.90)", surface2: "rgba(18, 42, 28, 0.90)", surface3: "rgba(28, 60, 42, 0.90)",
    onSurface: "#F0FFF4", muted: "#86EFAC",
    primary: "#22C55E", onPrimary: "#FFFFFF",
    secondary: "#EF4444", onSecondary: "#FFFFFF",
    tertiary: "#204632", onTertiary: "#BBF7D0",
    success: "#10B981", warning: "#F59E0B", error: "#EF4444", info: "#38BDF8",
    border: "rgba(34, 197, 94, 0.22)", divider: "rgba(34, 197, 94, 0.12)",
  }),
  eid: palette({
    surface: "rgba(8, 20, 38, 0.90)", surface2: "rgba(14, 34, 62, 0.90)", surface3: "rgba(22, 48, 86, 0.90)",
    onSurface: "#F0F9FF", muted: "#7DD3FC",
    primary: "#38BDF8", onPrimary: "#081426",
    secondary: "#F59E0B", onSecondary: "#081426",
    tertiary: "#1E3A5F", onTertiary: "#BAE6FD",
    success: "#10B981", warning: "#F59E0B", error: "#EF4444", info: "#60A5FA",
    border: "rgba(56, 189, 248, 0.22)", divider: "rgba(56, 189, 248, 0.12)",
  }),
};

import type { ThemeMode } from "@/src/game/types";

export function isNightTime(): boolean {
  const hour = new Date().getHours();
  return hour < 6 || hour >= 18; // 6 PM to 6 AM is night
}

export type ThemeContextType = {
  themeId: ThemeId;
  colors: ThemeColors;
  themeMode: ThemeMode;
  isNight: boolean;
  toggleThemeMode?: () => void;
  setThemeMode?: (mode: ThemeMode) => void;
};

// ─── React Context ────────────────────────────────────────────────────────────
export const ThemeContext = createContext<ThemeContextType>({
  themeId: "classic",
  colors: THEME_PALETTES.classic,
  themeMode: "auto",
  isNight: false,
});

export function getThemeColors(themeId: ThemeId, isNight: boolean = false): ThemeColors {
  if (isNight && THEME_NIGHT_PALETTES[themeId]) {
    return THEME_NIGHT_PALETTES[themeId]!;
  }
  return THEME_PALETTES[themeId] ?? THEME_PALETTES.classic;
}

export function useTheme(): {
  scheme: ColorScheme;
  colors: ThemeColors;
  themeId: ThemeId;
  themeMode: ThemeMode;
  isNight: boolean;
  toggleThemeMode?: () => void;
  setThemeMode?: (mode: ThemeMode) => void;
} {
  const ctx = useContext(ThemeContext);
  return {
    scheme: ctx.isNight ? "dark" : "light",
    colors: ctx.colors,
    themeId: ctx.themeId,
    themeMode: ctx.themeMode,
    isNight: ctx.isNight,
    toggleThemeMode: ctx.toggleThemeMode,
    setThemeMode: ctx.setThemeMode,
  };
}

export function makeStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (colors: ThemeColors) => T & StyleSheet.NamedStyles<any>,
): () => T {
  return function useStyles(): T {
    const { colors } = useTheme();
    return useMemo(() => StyleSheet.create(factory(colors)), [colors]);
  };
}

// Legacy compat
export const themes = { light: THEME_PALETTES.classic };
export const defaultScheme = "light" satisfies ColorScheme;