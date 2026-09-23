/**
 * MathBlitz Kingdom - Scrollable World Map Canvas
 */

import React, { useRef, useEffect, useMemo } from "react";
import {
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
        {/* World Background Gradients */}
        {WORLDS.map((world) => {
          const startLevel = world.levelsRange[0];
          const endLevel = world.levelsRange[1];

          const topPos = levelPositions.get(endLevel)?.y || 0;
          const bottomPos = levelPositions.get(startLevel)?.y || 0;
          const height = bottomPos - topPos + NODE_VERTICAL_SPACING + 40;

          return (
            <LinearGradient
              key={world.id}
              colors={[world.palette.backgroundTop, world.palette.backgroundBottom]}
              style={[
                styles.worldGradientBg,
                {
                  top: topPos - 40,
                  height: Math.max(height, 500),
                },
              ]}
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
                    <Text style={[styles.decorIcon, { top: 60, left: 30 }]}>🏰</Text>
                    <Text style={[styles.decorIcon, { top: 220, right: 25 }]}>🔷</Text>
                    <Text style={[styles.decorIcon, { top: 480, left: 35 }]}>👑</Text>
                    <Text style={[styles.decorIcon, { top: 800, right: 30 }]}>🏰</Text>
                    <Text style={[styles.decorIcon, { top: 1150, left: 25 }]}>🔶</Text>
                    <Text style={[styles.decorIcon, { top: 1500, right: 35 }]}>👑</Text>
                    <Text style={[styles.decorIcon, { top: 1800, left: 30 }]}>🏰</Text>
                  </>
                )}
              </View>
            </LinearGradient>
          );
        })}

        {/* Level Path & Nodes */}
        {CURATED_LEVELS.map((level) => {
          const pos = levelPositions.get(level.id);
          if (!pos) return null;

          const isUnlocked = level.id <= journeyState.highestUnlockedLevel;
          const isCompleted = !!journeyState.completedLevels[level.id];
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

        {/* Moving Player Character Avatar Token */}
        <PlayerCharacterToken
          avatarId={playerAvatar}
          playerName={playerName}
          targetXPercent={currentLevelPos.x}
          targetY={currentLevelPos.y}
          containerWidth={windowWidth}
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
  worldGradientBg: {
    position: "absolute",
    left: 0,
    right: 0,
    width: "100%",
  },
  worldHeaderBanner: {
    position: "absolute",
    top: 20,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 10,
  },
  worldPill: {
    backgroundColor: "rgba(15, 23, 42, 0.9)",
    borderWidth: 2,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 8,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  worldNumberText: {
    color: "#FBBF24",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  worldNameText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0.5,
    marginTop: 1,
  },
  worldSubtitleText: {
    color: "#9CA3AF",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  environmentEmbellishments: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  decorIcon: {
    position: "absolute",
    fontSize: 28,
    opacity: 0.45,
  },
});
