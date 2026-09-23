/**
 * MathBlitz Kingdom - Scrollable World Map Canvas
 * Features dedicated, non-overlapping World Landmark Gateway Headings
 * and styled thematic terrain backdrops.
 */

import React, { useRef, useEffect, useMemo } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { JourneyLevelDef, PlayerJourneyState, WorldDef } from "../types";
import { WORLDS, CURATED_LEVELS, getWorldForLevel } from "../worlds";
import { MapLevelNode } from "./MapLevelNode";
import { PlayerCharacterToken } from "./PlayerCharacterToken";
import { AvatarId } from "@/src/game/types";
import { getLevelImage } from "@/src/game/levelAssets";

interface WorldMapProps {
  journeyState: PlayerJourneyState;
  playerAvatar?: AvatarId;
  playerName?: string;
  onSelectLevel: (level: JourneyLevelDef) => void;
  animatingLevelTransition?: boolean;
  onCharacterMoveComplete?: () => void;
}

const NODE_VERTICAL_SPACING = 110;
const WORLD_GATEWAY_GAP = 140; // Dedicated clearance for World Gateway Heading
const MAP_PADDING_TOP = 40;
const MAP_PADDING_BOTTOM = 220; // Clearance for floating continue dock and bottom nav bar

const WORLD_EMOJIS: Record<string, string> = {
  number_forest: "🌲",
  fraction_valley: "🏞️",
  percentage_city: "🏙️",
  algebra_mountain: "⛰️",
  geometry_castle: "🏰",
  infinite_cosmos: "🌌",
};

export function WorldMap({
  journeyState,
  playerAvatar,
  playerName,
  onSelectLevel,
  animatingLevelTransition = false,
  onCharacterMoveComplete,
}: WorldMapProps) {
  const { width: windowWidth } = useWindowDimensions();
  const scrollViewRef = useRef<ScrollView>(null);

  // Compute non-overlapping (x, y) coordinates for all levels and world banners
  // Levels are arranged bottom-to-top (Level 1 at bottom, Level 100 at top)
  const { levelPositions, worldLayouts, totalMapHeight } = useMemo(() => {
    const levelPosMap = new Map<number, { x: number; y: number }>();
    const worldLayoutMap = new Map<
      string,
      { bannerY: number; topY: number; bottomY: number; height: number }
    >();

    // Calculate Y positions from World 5 (top) down to World 1 (bottom)
    const sortedWorlds = [...WORLDS].sort((a, b) => b.worldNumber - a.worldNumber);
    let currentY = MAP_PADDING_TOP;

    for (const world of sortedWorlds) {
      const startLevel = world.levelsRange[0]; // e.g. 81
      const endLevel = world.levelsRange[1];   // e.g. 100

      // World Gateway Heading is placed here with dedicated space
      const bannerY = currentY + 30;
      const worldTopY = currentY;
      currentY += WORLD_GATEWAY_GAP;

      // Place levels of this world from highest (endLevel) down to lowest (startLevel)
      for (let lvl = endLevel; lvl >= startLevel; lvl--) {
        // Winding S-curve horizontal position (0.22 to 0.78)
        const x = 0.5 + 0.30 * Math.sin(lvl * 0.72);
        levelPosMap.set(lvl, { x, y: currentY });
        currentY += NODE_VERTICAL_SPACING;
      }

      const worldBottomY = currentY;
      worldLayoutMap.set(world.id, {
        bannerY,
        topY: worldTopY,
        bottomY: worldBottomY,
        height: worldBottomY - worldTopY + 20,
      });
    }

    const calculatedTotalHeight = currentY + MAP_PADDING_BOTTOM;
    return {
      levelPositions: levelPosMap,
      worldLayouts: worldLayoutMap,
      totalMapHeight: calculatedTotalHeight,
    };
  }, []);

  const currentLevelPos = levelPositions.get(journeyState.currentLevel) || {
    x: 0.5,
    y: totalMapHeight - 200,
  };

  // Scroll to active level on mount or level change
  useEffect(() => {
    const pos = levelPositions.get(journeyState.currentLevel);
    if (pos && scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          y: Math.max(0, pos.y - 320),
          animated: true,
        });
      }, 300);
    }
  }, [journeyState.currentLevel, levelPositions]);

  return (
    <View style={styles.wrapper}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={[styles.mapContainer, { height: totalMapHeight }]}
        showsVerticalScrollIndicator={false}
      >
        {/* World Realms Backgrounds & Gateway Headings */}
        {WORLDS.map((world) => {
          const layout = worldLayouts.get(world.id);
          if (!layout) return null;

          const worldThemeImage = getLevelImage(world.worldNumber);
          const worldEmoji = WORLD_EMOJIS[world.id] || "✨";

          return (
            <View
              key={world.id}
              style={[
                styles.worldSectionContainer,
                {
                  top: layout.topY,
                  height: layout.height,
                },
              ]}
            >
              {/* Theme Artwork Background - Clearly Visible */}
              <Image
                source={worldThemeImage}
                style={styles.worldThemeImage}
                resizeMode="cover"
              />

              {/* Translucent Atmospheric Gradient Overlay */}
              <LinearGradient
                colors={[
                  "rgba(15, 23, 42, 0.40)",
                  "rgba(15, 23, 42, 0.15)",
                  "rgba(15, 23, 42, 0.50)",
                ]}
                style={styles.worldGradientBg}
              >
                {/* Ambient World Environmental Embellishments */}
                <View style={styles.environmentEmbellishments} pointerEvents="none">
                  {world.id === "number_forest" && (
                    <>
                      <Text style={[styles.decorIcon, { top: 120, left: 20 }]}>🌲</Text>
                      <Text style={[styles.decorIcon, { top: 300, right: 30 }]}>✨</Text>
                      <Text style={[styles.decorIcon, { top: 600, left: 35 }]}>🪵</Text>
                      <Text style={[styles.decorIcon, { top: 900, right: 25 }]}>🌲</Text>
                      <Text style={[styles.decorIcon, { top: 1300, left: 25 }]}>🍄</Text>
                      <Text style={[styles.decorIcon, { top: 1700, right: 30 }]}>✨</Text>
                      <Text style={[styles.decorIcon, { top: 2100, left: 20 }]}>🌲</Text>
                    </>
                  )}
                  {world.id === "fraction_valley" && (
                    <>
                      <Text style={[styles.decorIcon, { top: 120, right: 25 }]}>💎</Text>
                      <Text style={[styles.decorIcon, { top: 350, left: 30 }]}>🌊</Text>
                      <Text style={[styles.decorIcon, { top: 700, right: 35 }]}>🔮</Text>
                      <Text style={[styles.decorIcon, { top: 1100, left: 20 }]}>💎</Text>
                      <Text style={[styles.decorIcon, { top: 1500, right: 30 }]}>🌊</Text>
                      <Text style={[styles.decorIcon, { top: 1900, left: 25 }]}>🔮</Text>
                    </>
                  )}
                  {world.id === "percentage_city" && (
                    <>
                      <Text style={[styles.decorIcon, { top: 120, left: 25 }]}>🏙️</Text>
                      <Text style={[styles.decorIcon, { top: 380, right: 30 }]}>🪙</Text>
                      <Text style={[styles.decorIcon, { top: 750, left: 35 }]}>⚡</Text>
                      <Text style={[styles.decorIcon, { top: 1200, right: 20 }]}>🏬</Text>
                      <Text style={[styles.decorIcon, { top: 1650, left: 30 }]}>🪙</Text>
                      <Text style={[styles.decorIcon, { top: 2050, right: 25 }]}>🏙️</Text>
                    </>
                  )}
                  {world.id === "algebra_mountain" && (
                    <>
                      <Text style={[styles.decorIcon, { top: 120, right: 30 }]}>⛰️</Text>
                      <Text style={[styles.decorIcon, { top: 360, left: 20 }]}>☁️</Text>
                      <Text style={[styles.decorIcon, { top: 720, right: 35 }]}>🏛️</Text>
                      <Text style={[styles.decorIcon, { top: 1150, left: 30 }]}>⛰️</Text>
                      <Text style={[styles.decorIcon, { top: 1600, right: 25 }]}>☁️</Text>
                      <Text style={[styles.decorIcon, { top: 2000, left: 35 }]}>🏛️</Text>
                    </>
                  )}
                  {world.id === "geometry_castle" && (
                    <>
                      <Text style={[styles.decorIcon, { top: 120, left: 30 }]}>🏰</Text>
                      <Text style={[styles.decorIcon, { top: 400, right: 25 }]}>📐</Text>
                      <Text style={[styles.decorIcon, { top: 800, left: 20 }]}>🛡️</Text>
                      <Text style={[styles.decorIcon, { top: 1250, right: 35 }]}>🏰</Text>
                      <Text style={[styles.decorIcon, { top: 1700, left: 25 }]}>⚔️</Text>
                      <Text style={[styles.decorIcon, { top: 2100, right: 30 }]}>👑</Text>
                    </>
                  )}
                </View>
              </LinearGradient>

              {/* Majestic Non-Overlapping World Gateway Archway Heading */}
              <View style={[styles.worldGatewayArch, { top: layout.bannerY - layout.topY }]}>
                <View style={[styles.gatewayFrame, { borderColor: world.palette.accent }]}>
                  {/* Realm Emblem */}
                  <View style={[styles.emblemBadge, { backgroundColor: world.palette.primary }]}>
                    <Text style={styles.emblemText}>{worldEmoji}</Text>
                  </View>

                  {/* Header Title Information */}
                  <View style={styles.gatewayInfo}>
                    <View style={styles.worldTagRow}>
                      <Text style={styles.worldTagLine}>❖</Text>
                      <Text style={styles.worldTagText}>
                        REALM {world.worldNumber} • WORLD {world.worldNumber}
                      </Text>
                      <Text style={styles.worldTagLine}>❖</Text>
                    </View>
                    <Text style={styles.worldTitleText}>{world.name.toUpperCase()}</Text>
                    <Text style={styles.worldSubtitleText}>{world.subtitle}</Text>
                  </View>
                </View>
              </View>
            </View>
          );
        })}

        {/* Connecting S-Curve Path Lines */}
        {CURATED_LEVELS.map((level, idx) => {
          if (idx === CURATED_LEVELS.length - 1) return null;
          const nextLevel = CURATED_LEVELS[idx + 1];
          const posA = levelPositions.get(level.id);
          const posB = levelPositions.get(nextLevel.id);
          if (!posA || !posB) return null;

          const isUnlocked = level.id <= journeyState.highestUnlockedLevel;
          const world = getWorldForLevel(level.id);

          const startX = posA.x * windowWidth;
          const startY = posA.y;
          const endX = posB.x * windowWidth;
          const endY = posB.y;

          const deltaX = endX - startX;
          const deltaY = endY - startY;
          const distance = Math.hypot(deltaX, deltaY);
          const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

          return (
            <View
              key={`path_${level.id}_${nextLevel.id}`}
              style={[
                styles.pathSegment,
                {
                  left: startX,
                  top: startY + 32,
                  width: distance,
                  transform: [
                    { rotate: `${angle}deg` },
                    { translateX: 0 },
                    { translateY: -3 },
                  ],
                  backgroundColor: isUnlocked ? world.palette.pathColor : "#334155",
                  borderColor: isUnlocked ? world.palette.pathBorder : "rgba(255,255,255,0.08)",
                },
              ]}
            />
          );
        })}

        {/* Level Nodes */}
        {CURATED_LEVELS.map((level) => {
          const pos = levelPositions.get(level.id);
          if (!pos) return null;

          const isUnlocked = level.id <= journeyState.highestUnlockedLevel;
          const isCompleted = Boolean(journeyState.completedLevels[level.id]);
          const isCurrent = level.id === journeyState.currentLevel;
          const stars = journeyState.starsByLevel[level.id] || 0;
          const bestTime = journeyState.bestTimesByLevel[level.id];

          return (
            <MapLevelNode
              key={level.id}
              level={level}
              isUnlocked={isUnlocked}
              isCompleted={isCompleted}
              isCurrent={isCurrent}
              stars={stars}
              bestTime={bestTime}
              onPress={onSelectLevel}
              x={pos.x}
              y={pos.y}
            />
          );
        })}

        {/* Animated Character Avatar Token */}
        <PlayerCharacterToken
          targetXPercent={currentLevelPos.x}
          targetY={currentLevelPos.y}
          containerWidth={windowWidth}
          avatarId={playerAvatar}
          playerName={playerName}
          isMoving={animatingLevelTransition}
          onMovementComplete={onCharacterMoveComplete}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  scrollView: {
    flex: 1,
  },
  mapContainer: {
    position: "relative",
    width: "100%",
  },
  worldSectionContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    overflow: "hidden",
  },
  worldThemeImage: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
    opacity: 0.90,
  },
  worldGradientBg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  worldGatewayArch: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 10,
    paddingHorizontal: 20,
  },
  gatewayFrame: {
    backgroundColor: "rgba(15, 23, 42, 0.94)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    borderWidth: 1.5,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 12,
    maxWidth: 360,
    width: "92%",
  },
  emblemBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  emblemText: {
    fontSize: 22,
  },
  gatewayInfo: {
    flex: 1,
  },
  worldTagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  worldTagLine: {
    color: "#F59E0B",
    fontSize: 8,
  },
  worldTagText: {
    color: "#F59E0B",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  worldTitleText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0.8,
    marginTop: 1,
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  worldSubtitleText: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 1,
  },
  environmentEmbellishments: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  decorIcon: {
    position: "absolute",
    fontSize: 26,
    opacity: 0.45,
  },
  pathSegment: {
    position: "absolute",
    height: 7,
    borderRadius: 3.5,
    borderWidth: 1,
    zIndex: 1,
    transformOrigin: "left center",
  },
});
