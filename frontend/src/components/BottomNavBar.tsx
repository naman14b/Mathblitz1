import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { makeStyles, useTheme } from "@/src/theme";

export type NavTab = "home" | "ai-coach" | "sudoku-hub" | "puzzles-hub" | "leaderboards" | "achievements";

type BottomNavBarProps = {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  vibrationEnabled?: boolean;
};

const TABS: { id: NavTab; label: string; activeIcon: keyof typeof Ionicons.glyphMap; inactiveIcon: keyof typeof Ionicons.glyphMap }[] = [
  { id: "home", label: "Blitz", activeIcon: "rocket", inactiveIcon: "rocket-outline" },
  { id: "ai-coach", label: "Coach", activeIcon: "school", inactiveIcon: "school-outline" },
  { id: "sudoku-hub", label: "Sudoku", activeIcon: "grid", inactiveIcon: "grid-outline" },
  { id: "puzzles-hub", label: "Puzzles", activeIcon: "shapes", inactiveIcon: "shapes-outline" },
  { id: "leaderboards", label: "Rankings", activeIcon: "trophy", inactiveIcon: "trophy-outline" },
  { id: "achievements", label: "Badges", activeIcon: "ribbon", inactiveIcon: "ribbon-outline" },
];


export function BottomNavBar({ currentTab, onSelectTab, vibrationEnabled = true }: BottomNavBarProps) {
  const insets = useSafeAreaInsets();
  const { colors, isNight } = useTheme();
  const styles = useStyles();

  const handlePress = (tab: NavTab) => {
    if (tab === currentTab) return;
    if (vibrationEnabled) {
      Haptics.selectionAsync().catch(() => {});
    }
    onSelectTab(tab);
  };

  return (
    <View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <View style={[styles.container, isNight ? styles.containerNight : styles.containerDay]}>
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
                pressed && { opacity: 0.8 },
              ]}
            >
              <View style={[styles.iconContainer, isActive && styles.activeIconContainer]}>
                <Ionicons
                  name={iconName}
                  size={isActive ? 20 : 21}
                  color={isActive ? "#FFFFFF" : isNight ? "#8B9BB4" : "#6B7280"}
                />
              </View>
              <Text
                style={[
                  styles.tabLabel,
                  { color: isActive ? "#FF6B00" : isNight ? "#8B9BB4" : "#6B7280" },
                  isActive && styles.activeLabel,
                ]}
              >
                {tab.label}
              </Text>
              {isActive && <View style={styles.activeTabIndicator} />}
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
    paddingHorizontal: 14,
    marginBottom: 6,
  },
  container: {
    flexDirection: "row",
    borderWidth: 1.5,
    borderRadius: 34,
    paddingVertical: 6,
    paddingHorizontal: 6,
    width: "100%",
    maxWidth: 420,
    justifyContent: "space-around",
    alignItems: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 14,
  },
  containerNight: {
    backgroundColor: "rgba(10, 14, 28, 0.88)",
    borderColor: "rgba(59, 130, 246, 0.28)",
  },
  containerDay: {
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderColor: "rgba(0, 0, 0, 0.08)",
  },
  tabBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    borderRadius: 18,
    gap: 2,
  },
  iconContainer: {
    width: 44,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  activeIconContainer: {
    backgroundColor: "#FF6B00",
    shadowColor: "#FF6B00",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  activeLabel: {
    fontWeight: "900",
  },
  activeTabIndicator: {
    width: 22,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#FF6B00",
    marginTop: 1,
  },
}));
