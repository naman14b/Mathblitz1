/**
 * FunGanit Kingdom - Scrollable World Map Canvas
 * Features an ancient 3D golden cobblestone viaduct bridge path
 * and ornate compass medallion level nodes matching the fantasy adventure design.
 */

import React, { useRef, useEffect, useMemo } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import Svg, {
  Path as SvgPath,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  G,
} from "react-native-svg";
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

const NODE_VERTICAL_SPACING = 120;
const WORLD_GATEWAY_GAP = 230; // Dedicated clearance for World Gateway Heading
const MAP_PADDING_TOP = 60;
const MAP_PADDING_BOTTOM = 280; // Clearance for floating continue dock and bottom nav bar

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

      // World Gateway Heading is placed here centered inside dedicated gap
      const bannerY = currentY + (WORLD_GATEWAY_GAP - 90) / 2;
      const worldTopY = currentY;
      currentY += WORLD_GATEWAY_GAP;

      // Place levels of this world from highest (endLevel) down to lowest (startLevel)
      for (let lvl = endLevel; lvl >= startLevel; lvl--) {
        // Winding S-curve horizontal position (0.22 to 0.78)
        const x = 0.5 + 0.28 * Math.sin(lvl * 0.72);
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

  // Pre-calculate initial scroll offset so ScrollView opens immediately at player's level
  const initialOffset = useMemo(() => {
    const pos = levelPositions.get(journeyState.currentLevel);
    return {
      x: 0,
      y: pos ? Math.max(0, pos.y - 320) : totalMapHeight - 800,
    };
  }, []);

  const prevLevelRef = useRef(journeyState.currentLevel);

  // Smooth scroll ONLY on level advancement (not on initial mount)
  useEffect(() => {
    if (prevLevelRef.current !== journeyState.currentLevel) {
      prevLevelRef.current = journeyState.currentLevel;
      const pos = levelPositions.get(journeyState.currentLevel);
      if (pos && scrollViewRef.current) {
        scrollViewRef.current.scrollTo({
          y: Math.max(0, pos.y - 320),
          animated: true,
        });
      }
    }
  }, [journeyState.currentLevel, levelPositions]);

  // Generate GPU-optimized per-world SVG Bezier paths instead of one single 13,490px canvas
  const worldViaductSegments = useMemo(() => {
    const segments: Array<{ worldId: string; topY: number; height: number; d: string }> = [];

    for (const world of WORLDS) {
      const startLevel = world.levelsRange[0];
      const endLevel = world.levelsRange[1];
      const maxLevel = endLevel < 100 ? endLevel + 1 : endLevel;

      let minY = Infinity;
      let maxY = -Infinity;

      for (let lvl = startLevel; lvl <= maxLevel; lvl++) {
        const p = levelPositions.get(lvl);
        if (p) {
          if (p.y < minY) minY = p.y;
          if (p.y > maxY) maxY = p.y;
        }
      }

      if (minY === Infinity || maxY === -Infinity) continue;

      const segmentTopY = Math.max(0, minY);
      const segmentHeight = (maxY - minY) + 90;

      let d = "";
      for (let lvl = startLevel; lvl < maxLevel; lvl++) {
        const p1 = levelPositions.get(lvl);
        const p2 = levelPositions.get(lvl + 1);
        if (!p1 || !p2) continue;

        const x1 = p1.x * windowWidth;
        const y1 = p1.y + 35 - segmentTopY;
        const x2 = p2.x * windowWidth;
        const y2 = p2.y + 35 - segmentTopY;

        const cy1 = y1 - (y1 - y2) * 0.5;
        const cx1 = x1;
        const cy2 = y2 + (y1 - y2) * 0.5;
        const cx2 = x2;

        if (lvl === startLevel) {
          d += `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2} `;
        } else {
          d += `C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2} `;
        }
      }

      segments.push({
        worldId: world.id,
        topY: segmentTopY,
        height: segmentHeight,
        d,
      });
    }

    return segments;
  }, [levelPositions, windowWidth]);

  return (
    <View style={styles.wrapper}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentOffset={initialOffset}
        contentContainerStyle={[styles.mapContainer, { height: totalMapHeight }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Layer 1: World Realms Theme Background Artworks & Ambient Glows */}
        {WORLDS.map((world) => {
          const layout = worldLayouts.get(world.id);
          if (!layout) return null;

          const worldThemeImage = getLevelImage(world.worldNumber);

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
              {/* Theme Artwork Background - Clearly Visible with hardware caching */}
              <ExpoImage
                source={worldThemeImage}
                style={styles.worldThemeImage}
                contentFit="cover"
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
            </View>
          );
        })}

        {/* Layer 2: 3D Ancient Golden Stone Viaduct Bridge Path (Segmented per world for GPU performance) */}
        {worldViaductSegments.map((segment) => {
          if (!segment.d) return null;
          return (
            <Svg
              key={`viaduct_${segment.worldId}`}
              style={[
                styles.svgPathOverlay,
                {
                  top: segment.topY,
                  height: segment.height,
                },
              ]}
              width={windowWidth}
              height={segment.height}
              viewBox={`0 0 ${windowWidth} ${segment.height}`}
            >
              <Defs>
                <SvgLinearGradient id={`viaductGoldGlow_${segment.worldId}`} x1="0%" y1="0%" x2="0%" y2="100%">
                  <Stop offset="0%" stopColor="#FEF08A" />
                  <Stop offset="30%" stopColor="#F59E0B" />
                  <Stop offset="70%" stopColor="#B45309" />
                  <Stop offset="100%" stopColor="#D97706" />
                </SvgLinearGradient>

                <SvgLinearGradient id={`stoneWallGrad_${segment.worldId}`} x1="0%" y1="0%" x2="100%" y2="0%">
                  <Stop offset="0%" stopColor="#0F172A" />
                  <Stop offset="50%" stopColor="#334155" />
                  <Stop offset="100%" stopColor="#1E293B" />
                </SvgLinearGradient>
              </Defs>

              {/* Layer 2a: Bridge Deep Ambient Drop Shadow */}
              <SvgPath
                d={segment.d}
                stroke="rgba(0, 0, 0, 0.7)"
                strokeWidth={38}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                transform="translate(0, 6)"
              />

              {/* Layer 2b: 3D Ancient Stone Viaduct Foundation & Masonry Wall */}
              <SvgPath
                d={segment.d}
                stroke={`url(#stoneWallGrad_${segment.worldId})`}
                strokeWidth={32}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />

              {/* Layer 2c: Stone Parapet Outer Railing Curb */}
              <SvgPath
                d={segment.d}
                stroke="#64748B"
                strokeWidth={26}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />

              {/* Layer 2d: Glowing Golden Cobblestone Road Surface */}
              <SvgPath
                d={segment.d}
                stroke={`url(#viaductGoldGlow_${segment.worldId})`}
                strokeWidth={18}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />

              {/* Layer 2e: Cobblestone Block Seam Texture */}
              <SvgPath
                d={segment.d}
                stroke="#78350F"
                strokeWidth={17}
                strokeDasharray="4,8"
                strokeLinecap="butt"
                fill="none"
                opacity={0.6}
              />

              {/* Layer 2f: Radiant Central Golden Energy Spine */}
              <SvgPath
                d={segment.d}
                stroke="#FEF08A"
                strokeWidth={3}
                strokeDasharray="10,6"
                strokeLinecap="round"
                fill="none"
                opacity={0.9}
              />
            </Svg>
          );
        })}

        {/* Layer 3: Majestic Non-Overlapping World Gateway Archways (Rendered above road for clean pass-under) */}
        {WORLDS.map((world) => {
          const layout = worldLayouts.get(world.id);
          if (!layout) return null;
          const worldEmoji = WORLD_EMOJIS[world.id] || "✨";

          return (
            <View
              key={`gateway_${world.id}`}
              style={[styles.worldGatewayArch, { top: layout.bannerY }]}
              pointerEvents="none"
            >
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
          );
        })}

        {/* Layer 4: Level Nodes (Compass Medallions) */}
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

        {/* Layer 5: Animated Character Avatar Token */}
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
  svgPathOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    zIndex: 2,
    pointerEvents: "none",
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
});
