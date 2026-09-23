/**
 * MathBlitz Kingdom - Scrollable World Map Canvas
 * Styled with Sudoku & Puzzles themes for each world realm.
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
const MAP_PADDING_TOP = 80;
const MAP_PADDING_BOTTOM = 140;

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

  const totalLevels = CURATED_LEVELS.length;
  const totalMapHeight = totalLevels * NODE_VERTICAL_SPACING + MAP_PADDING_TOP + MAP_PADDING_BOTTOM;

  // Compute (x, y) coordinates for all levels
  // Levels go bottom-to-top (Level 1 at bottom, Level 100 at top)
  const levelPositions = useMemo(() => {
    const map = new Map<number, { x: number; y: number }>();
    for (let i = 1; i <= totalLevels; i++) {
      const idxFromTop = totalLevels - i;
      const y = MAP_PADDING_TOP + idxFromTop * NODE_VERTICAL_SPACING;
      // Winding S-curve horizontal position (0.2 to 0.8)
      const x = 0.5 + 0.32 * Math.sin(i * 0.75);
      map.set(i, { x, y });
    }
    return map;
  }, [totalLevels]);

  const currentLevelPos = levelPositions.get(journeyState.currentLevel) || { x: 0.5, y: totalMapHeight - 200 };

  // Scroll to active level on mount or level change
  useEffect(() => {
    const pos = levelPositions.get(journeyState.currentLevel);
    if (pos && scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          y: Math.max(0, pos.y - 300),
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
        {/* World Background Themes from Sudoku & Puzzles */}
        {WORLDS.map((world) => {
          const startLevel = world.levelsRange[0];
          const endLevel = world.levelsRange[1];

          const topPos = levelPositions.get(endLevel)?.y || 0;
          const bottomPos = levelPositions.get(startLevel)?.y || 0;
          const height = bottomPos - topPos + NODE_VERTICAL_SPACING + 40;
          const worldThemeImage = getLevelImage(world.worldNumber);

          return (
            <View
              key={world.id}
              style={[
                styles.worldSectionContainer,
                {
                  top: topPos - 40,
                  height: Math.max(height, 500),
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
                  "rgba(15, 23, 42, 0.4)",
                  "rgba(15, 23, 42, 0.12)",
                  "rgba(15, 23, 42, 0.5)",
                ]}
                style={styles.worldGradientBg}
              >
                {/* World Header Landmark Banner */}
                <View style={styles.worldHeaderBanner}>
                  <View style={[styles.worldPill, { borderColor: world.palette.accent }]}>
                    <Text style={styles.worldNumberText}>WORLD {world.worldNumber}</Text>
                    <Text style={styles.worldNameText}>{world.name.toUpperCase()}</Text>
                    <Text style={styles.worldSubtitleText}>{world.subtitle}</Text>
                  </View>
                </View>

                {/* Ambient World Environmental Embellishments */}
                <View style={styles.environmentEmbellishments} pointerEvents="none">
                  {world.id === "number_forest" && (
                    <>
                      <Text style={[styles.decorIcon, { top: 60, left: 20 }]}>🌲</Text>
                      <Text style={[styles.decorIcon, { top: 180, right: 30 }]}>✨</Text>
                      <Text style={[styles.decorIcon, { top: 320, left: 40 }]}>🪵</Text>
                      <Text style={[styles.decorIcon, { top: 500, right: 25 }]}>🌲</Text>
                      <Text style={[styles.decorIcon, { top: 750, left: 30 }]}>🍄</Text>
                      <Text style={[styles.decorIcon, { top: 1100, right: 40 }]}>✨</Text>
                      <Text style={[styles.decorIcon, { top: 1500, left: 25 }]}>🌲</Text>
                      <Text style={[styles.decorIcon, { top: 1800, right: 20 }]}>🌿</Text>
                    </>
                  )}
                  {world.id === "fraction_valley" && (
                    <>
                      <Text style={[styles.decorIcon, { top: 70, right: 20 }]}>💎</Text>
                      <Text style={[styles.decorIcon, { top: 220, left: 30 }]}>🌊</Text>
                      <Text style={[styles.decorIcon, { top: 400, right: 40 }]}>🔮</Text>
                      <Text style={[styles.decorIcon, { top: 700, left: 20 }]}>💎</Text>
                      <Text style={[styles.decorIcon, { top: 1050, right: 30 }]}>🌊</Text>
                      <Text style={[styles.decorIcon, { top: 1400, left: 35 }]}>🔮</Text>
                      <Text style={[styles.decorIcon, { top: 1750, right: 25 }]}>💎</Text>
                    </>
                  )}
                  {world.id === "percentage_city" && (
                    <>
                      <Text style={[styles.decorIcon, { top: 80, left: 25 }]}>🏙️</Text>
                      <Text style={[styles.decorIcon, { top: 250, right: 30 }]}>🪙</Text>
                      <Text style={[styles.decorIcon, { top: 480, left: 35 }]}>⚡</Text>
                      <Text style={[styles.decorIcon, { top: 800, right: 20 }]}>🏬</Text>
                      <Text style={[styles.decorIcon, { top: 1150, left: 40 }]}>🪙</Text>
                      <Text style={[styles.decorIcon, { top: 1500, right: 30 }]}>🏙️</Text>
                      <Text style={[styles.decorIcon, { top: 1800, left: 20 }]}>🏪</Text>
                    </>
                  )}
                  {world.id === "algebra_mountain" && (
                    <>
                      <Text style={[styles.decorIcon, { top: 70, right: 30 }]}>⛰️</Text>
                      <Text style={[styles.decorIcon, { top: 240, left: 20 }]}>☁️</Text>
                      <Text style={[styles.decorIcon, { top: 500, right: 35 }]}>🏛️</Text>
                      <Text style={[styles.decorIcon, { top: 850, left: 30 }]}>⛰️</Text>
                      <Text style={[styles.decorIcon, { top: 1200, right: 20 }]}>☁️</Text>
                      <Text style={[styles.decorIcon, { top: 1550, left: 35 }]}>🏛️</Text>
                      <Text style={[styles.decorIcon, { top: 1850, right: 25 }]}>⚡</Text>
                    </>
                  )}
                  {world.id === "geometry_castle" && (
                    <>
                      <Text style={[styles.decorIcon, { top: 80, left: 30 }]}>🏰</Text>
                      <Text style={[styles.decorIcon, { top: 260, right: 25 }]}>📐</Text>
                      <Text style={[styles.decorIcon, { top: 520, left: 20 }]}>🛡️</Text>
                      <Text style={[styles.decorIcon, { top: 900, right: 35 }]}>🏰</Text>
                      <Text style={[styles.decorIcon, { top: 1250, left: 25 }]}>⚔️</Text>
                      <Text style={[styles.decorIcon, { top: 1600, right: 30 }]}>👑</Text>
                      <Text style={[styles.decorIcon, { top: 1900, left: 20 }]}>🏰</Text>
                    </>
                  )}
                </View>
              </LinearGradient>
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
                  top: startY + 30,
                  width: distance,
                  transform: [
                    { rotate: `${angle}deg` },
                    { translateX: 0 },
                    { translateY: -3 },
                  ],
                  backgroundColor: isUnlocked ? world.palette.pathColor : "#374151",
                  borderColor: isUnlocked ? world.palette.pathBorder : "rgba(255,255,255,0.1)",
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
    backgroundColor: "#022C22",
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
    justifyContent: "flex-start",
    alignItems: "center",
  },
  worldHeaderBanner: {
    marginTop: 20,
    alignItems: "center",
    zIndex: 2,
  },
  worldPill: {
    backgroundColor: "rgba(15, 23, 42, 0.88)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  worldNumberText: {
    color: "#F59E0B",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  worldNameText: {
    color: "#F8FAFC",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 1,
    marginTop: 1,
  },
  worldSubtitleText: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
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
