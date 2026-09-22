import React, { useEffect, useRef } from "react";
import { Platform, StyleSheet, View } from "react-native";

export type AnimationState = "chase" | "win" | "jail";

const CHASE_VIDEO = require("@/assets/videos/snake_chase.mp4");
const WIN_VIDEO = require("@/assets/videos/snake_win.mp4");
const JAIL_VIDEO = require("@/assets/videos/snake_jail.mp4");

type Props = {
  state: AnimationState;
  onAnimationEnd?: () => void;
};

export function DailyChallengeVideo({ state, onAnimationEnd }: Props) {
  const chaseRef = useRef<HTMLVideoElement | null>(null);
  const winRef = useRef<HTMLVideoElement | null>(null);
  const jailRef = useRef<HTMLVideoElement | null>(null);

  // Web Implementation using HTML5 Video elements for seamless instant playback
  if (Platform.OS === "web") {
    const chaseSrc = typeof CHASE_VIDEO === "string" ? CHASE_VIDEO : CHASE_VIDEO?.default || CHASE_VIDEO;
    const winSrc = typeof WIN_VIDEO === "string" ? WIN_VIDEO : WIN_VIDEO?.default || WIN_VIDEO;
    const jailSrc = typeof JAIL_VIDEO === "string" ? JAIL_VIDEO : JAIL_VIDEO?.default || JAIL_VIDEO;

    useEffect(() => {
      if (state === "chase") {
        if (chaseRef.current) {
          chaseRef.current.currentTime = 0;
          chaseRef.current.play().catch(() => {});
        }
        if (winRef.current) winRef.current.pause();
        if (jailRef.current) jailRef.current.pause();
      } else if (state === "win") {
        if (winRef.current) {
          winRef.current.currentTime = 0;
          winRef.current.play().catch(() => {});
        }
        if (chaseRef.current) chaseRef.current.pause();
        if (jailRef.current) jailRef.current.pause();
      } else if (state === "jail") {
        if (jailRef.current) {
          jailRef.current.currentTime = 0;
          jailRef.current.play().catch(() => {});
        }
        if (chaseRef.current) chaseRef.current.pause();
        if (winRef.current) winRef.current.pause();
      }
    }, [state]);

    return (
      <View style={styles.container} pointerEvents="none">
        {/* Chase Video (Looping background during gameplay) */}
        <video
          ref={chaseRef}
          src={chaseSrc}
          autoPlay
          loop
          muted
          playsInline
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: state === "chase" ? 1 : 0,
            transition: "opacity 0.4s ease",
            zIndex: 1,
          }}
        />

        {/* Win Video (Boy tricks snake to cross bridge) */}
        <video
          ref={winRef}
          src={winSrc}
          muted
          playsInline
          onEnded={onAnimationEnd}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: state === "win" ? 1 : 0,
            transition: "opacity 0.4s ease",
            zIndex: 2,
          }}
        />

        {/* Jail Video (Snake chases boy into jail cell) */}
        <video
          ref={jailRef}
          src={jailSrc}
          muted
          playsInline
          onEnded={onAnimationEnd}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: state === "jail" ? 1 : 0,
            transition: "opacity 0.4s ease",
            zIndex: 3,
          }}
        />

        {/* Darkening tint scrim to make question cards & options pop clearly */}
        <View style={styles.overlayScrim} />
      </View>
    );
  }

  // Native fallback (using expo-video when available or native video container)
  return (
    <View style={styles.container} pointerEvents="none">
      <View style={styles.overlayScrim} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: "hidden",
    backgroundColor: "#0C101C",
  },
  overlayScrim: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(8, 12, 24, 0.28)",
    zIndex: 4,
  },
});
