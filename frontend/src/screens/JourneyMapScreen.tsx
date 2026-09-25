/**
 * MathBlitz Kingdom - Journey Map Screen (Main Kingdom Hub)
 * Enhanced with Sudoku & Puzzles themes and headers.
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  Image,
  StyleSheet,
  Text,
  View,
  Pressable,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { JourneyLevelDef, PlayerJourneyState } from "../game/journey/types";
import { getWorldForLevel, getLevelDef } from "../game/journey/worlds";
import { loadJourneyState, getCachedJourneyState } from "../game/journey/storage";
import { WorldMap } from "../game/journey/components/WorldMap";
import { DailyJourneyWidget } from "../game/journey/components/DailyJourneyWidget";
import { LocalProfile } from "@/src/game/types";
import { ASTRONAUT_HEADER, getLevelImage } from "@/src/game/levelAssets";

interface JourneyMapScreenProps {
  profile: LocalProfile;
  isActive?: boolean;
  onPlayLevel: (levelId: number) => void;
  onSpeedGate: (speedGateId?: string) => void;
  onDailyChallenge: () => void;
  onBackHome: () => void;
}

export function JourneyMapScreen({
  profile,
  isActive = true,
  onPlayLevel,
  onSpeedGate,
  onDailyChallenge,
  onBackHome,
}: JourneyMapScreenProps) {
  const insets = useSafeAreaInsets();
  const [journeyState, setJourneyState] = useState<PlayerJourneyState | null>(() => getCachedJourneyState());
  const [showQuestDrawer, setShowQuestDrawer] = useState(false);

  // Load state on focus/mount
  const refreshState = useCallback(async () => {
    const s = await loadJourneyState();
    setJourneyState(s);
  }, []);

  useEffect(() => {
    if (isActive) {
      refreshState();
    }
  }, [isActive, refreshState]);

  if (!journeyState) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <Text style={styles.loadingText}>Entering MathBlitz Kingdom...</Text>
      </View>
    );
  }

  const currentLevelDef = getLevelDef(journeyState.currentLevel);
  const currentWorld = getWorldForLevel(journeyState.currentLevel);
  const currentWorldImage = getLevelImage(currentWorld.worldNumber);

  const handleSelectLevel = (level: JourneyLevelDef) => {
    if (level.levelType === "speed_gate") {
      onSpeedGate(level.speedGateId);
    } else if (level.levelType === "daily_node") {
      onDailyChallenge();
    } else {
      onPlayLevel(level.id);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top Realm & Player Stats HUD */}
      <View style={styles.topHud}>
        <Pressable onPress={onBackHome} style={styles.iconBtn}>
          <Ionicons name="home" size={20} color="#F8FAFC" />
        </Pressable>

        <View style={styles.statsGroup}>
          {/* Total Stars Pill */}
          <View style={styles.statPill}>
            <Ionicons name="star" size={14} color="#F59E0B" />
            <Text style={styles.statPillText}>{journeyState.totalStars}</Text>
          </View>

          {/* Tokens Pill */}
          <View style={styles.statPill}>
            <Text style={styles.coinEmoji}>🪙</Text>
            <Text style={styles.statPillText}>{profile.tokens}</Text>
          </View>

          {/* Daily Streak Flame */}
          <View style={[styles.statPill, styles.streakPill]}>
            <Text style={styles.flameEmoji}>🔥</Text>
            <Text style={[styles.statPillText, styles.streakText]}>
              {journeyState.dailyJourney.currentStreak}
            </Text>
          </View>
        </View>

        {/* Quest Drawer Toggle */}
        <Pressable
          onPress={() => setShowQuestDrawer((prev) => !prev)}
          style={[styles.iconBtn, showQuestDrawer && styles.questBtnActive]}
        >
          <Ionicons name="flag" size={18} color={showQuestDrawer ? "#FBBF24" : "#F8FAFC"} />
        </Pressable>
      </View>

      {/* Collapsible Daily / Weekly Quest Widget */}
      {showQuestDrawer && (
        <DailyJourneyWidget
          daily={journeyState.dailyJourney}
          weekly={journeyState.weeklyJourney}
          onClose={() => setShowQuestDrawer(false)}
        />
      )}

      {/* Main World Map Canvas */}
      <WorldMap
        journeyState={journeyState}
        playerAvatar={profile.avatar}
        playerName={profile.playerName}
        onSelectLevel={handleSelectLevel}
      />

      {/* Bottom Floating Quick Continue Dock with Theme Preview */}
      <View style={[styles.bottomDock, { bottom: Math.max(insets.bottom, 10) + 70 }]}>
        <View style={styles.dockImageContainer}>
          <Image
            source={getLevelImage(currentLevelDef.id)}
            style={styles.dockThumbnail}
            resizeMode="cover"
          />
        </View>
        <View style={styles.dockInfo}>
          <Text style={styles.dockRealmText}>{currentWorld.name.toUpperCase()}</Text>
          <Text style={styles.dockLevelText} numberOfLines={1}>
            Level {currentLevelDef.id}: {currentLevelDef.title}
          </Text>
        </View>

        <Pressable
          onPress={() => handleSelectLevel(currentLevelDef)}
          style={styles.continueBtn}
        >
          <Text style={styles.continueBtnText}>PLAY LEVEL {currentLevelDef.id}</Text>
          <Ionicons name="play" size={16} color="#FFFFFF" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#0F172A",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: "#94A3B8",
    fontSize: 16,
    fontWeight: "700",
  },
  topHud: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "rgba(15, 23, 42, 0.95)",
    borderBottomColor: "#1E293B",
    borderBottomWidth: 1.5,
    zIndex: 20,
  },
  iconBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: "#1E293B",
  },
  questBtnActive: {
    backgroundColor: "#78350F",
    borderColor: "#F59E0B",
    borderWidth: 1,
  },
  statsGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#1E293B",
    borderColor: "#334155",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  streakPill: {
    borderColor: "#EA580C",
    backgroundColor: "rgba(234, 88, 12, 0.15)",
  },
  statPillText: {
    color: "#F8FAFC",
    fontSize: 12,
    fontWeight: "800",
  },
  streakText: {
    color: "#FB923C",
  },
  coinEmoji: {
    fontSize: 12,
  },
  flameEmoji: {
    fontSize: 12,
  },
  bottomDock: {
    position: "absolute",
    bottom: 74,
    left: 14,
    right: 14,
    backgroundColor: "rgba(15, 23, 42, 0.96)",
    borderColor: "rgba(245, 158, 11, 0.35)",
    borderWidth: 1.5,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    zIndex: 25,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 10,
  },
  dockImageContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    overflow: "hidden",
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#F59E0B",
  },
  dockThumbnail: {
    width: "100%",
    height: "100%",
  },
  dockInfo: {
    flex: 1,
    marginRight: 10,
  },
  dockRealmText: {
    color: "#F59E0B",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },
  dockLevelText: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "800",
  },
  continueBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#10B981",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  continueBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
});
