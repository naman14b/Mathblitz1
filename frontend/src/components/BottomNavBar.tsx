import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { makeStyles, useTheme } from "@/src/theme";

export type NavTab = "home" | "sudoku-hub" | "puzzles-hub" | "leaderboards" | "achievements";

type BottomNavBarProps = {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  vibrationEnabled?: boolean;
};

const TABS: { id: NavTab; label: string; activeIcon: keyof typeof Ionicons.glyphMap; inactiveIcon: keyof typeof Ionicons.glyphMap }[] = [
  { id: "home", label: "Blitz", activeIcon: "flash", inactiveIcon: "flash-outline" },
  { id: "sudoku-hub", label: "Sudoku", activeIcon: "grid", inactiveIcon: "grid-outline" },
  { id: "puzzles-hub", label: "Puzzles", activeIcon: "shapes", inactiveIcon: "shapes-outline" },
  { id: "leaderboards", label: "Rankings", activeIcon: "trophy", inactiveIcon: "trophy-outline" },
  { id: "achievements", label: "Badges", activeIcon: "ribbon", inactiveIcon: "ribbon-outline" },
];

export function BottomNavBar({ currentTab, onSelectTab, vibrationEnabled = true }: BottomNavBarProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useStyles();

  const handlePress = (tab: NavTab) => {
    if (tab === currentTab) return;
    if (vibrationEnabled) {
      Haptics.selectionAsync().catch(() => {});
    }
    onSelectTab(tab);
  };

  return (
    <View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={styles.container}>
        {TABS.map((tab) => {
          const isActive = currentTab === tab.id;
          const iconName = isActive ? tab.activeIcon : tab.inactiveIcon;

          return (
            <Pressable
              key={tab.id}
              onPress={() => handlePress(tab.id)}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              style={({ pressed }) => [
                styles.tabBtn,
                isActive && styles.activeTabBtn,
                pressed && { opacity: 0.8 },
              ]}
            >
              <View style={[styles.iconContainer, isActive && styles.activeIconContainer]}>
                <Ionicons
                  name={iconName}
                  size={22}
                  color={isActive ? colors.onBrandPrimary : colors.muted}
                />
              </View>
              <Text
                style={[
                  styles.tabLabel,
                  { color: isActive ? colors.brandPrimary : colors.muted },
                  isActive && styles.activeLabel,
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  wrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "transparent",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  container: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderColor: colors.divider,
    borderWidth: 1.5,
    borderRadius: 28,
    paddingVertical: 6,
    paddingHorizontal: 8,
    width: "100%",
    maxWidth: 440,
    justifyContent: "space-around",
    alignItems: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  },
  tabBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    borderRadius: 20,
    gap: 3,
  },
  activeTabBtn: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  iconContainer: {
    width: 38,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  activeIconContainer: {
    backgroundColor: colors.brandPrimary,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "700",
  },
  activeLabel: {
    fontWeight: "900",
  },
}));
