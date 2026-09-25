import React, { useEffect, useRef, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";
import { Asset } from "expo-asset";

export type AnimationState = "chase" | "win" | "jail";

const CHASE_VIDEO = require("@/assets/videos/snake_chase.mp4");
const WIN_VIDEO = require("@/assets/videos/snake_win.mp4");
const JAIL_VIDEO = require("@/assets/videos/snake_jail.mp4");

type Props = {
  state: AnimationState;
  onAnimationEnd?: () => void;
};

function NativeDailyChallengeVideo({ state, onAnimationEnd }: Props) {
  const [resolvedSources, setResolvedSources] = useState<{
    chase: any;
    win: any;
    jail: any;
  }>({
    chase: CHASE_VIDEO,
    win: WIN_VIDEO,
    jail: JAIL_VIDEO,
  });

  useEffect(() => {
    let mounted = true;
    async function preloadAssets() {
      try {
        const [chaseAsset, winAsset, jailAsset] = await Asset.loadAsync([
          CHASE_VIDEO,
          WIN_VIDEO,
          JAIL_VIDEO,
        ]);
        if (mounted) {
          setResolvedSources({
            chase: chaseAsset?.localUri || chaseAsset?.uri || CHASE_VIDEO,
            win: winAsset?.localUri || winAsset?.uri || WIN_VIDEO,
            jail: jailAsset?.localUri || jailAsset?.uri || JAIL_VIDEO,
          });
        }
      } catch (err) {
        // Fallback to numeric require IDs
      }
    }
    preloadAssets();
    return () => {
      mounted = false;
    };
  }, []);

  // Single video player prevents exceeding Android hardware video decoder limits
  const player = useVideoPlayer(resolvedSources.chase, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  useEffect(() => {
    if (!player) return;

    if (state === "chase") {
      player.loop = true;
      player.replace(resolvedSources.chase);
      player.play();
    } else if (state === "win") {
      player.loop = false;
      player.replace(resolvedSources.win);
      player.play();
    } else if (state === "jail") {
      player.loop = false;
      player.replace(resolvedSources.jail);
      player.play();
    }
  }, [state, resolvedSources, player]);

  useEffect(() => {
    if (!player || !onAnimationEnd) return;
    const sub = player.addListener("playToEnd", () => {
      if (state === "win" || state === "jail") {
        onAnimationEnd();
      }
    });
    return () => {
      sub.remove();
    };
  }, [player, state, onAnimationEnd]);

  return (
    <View style={styles.container} pointerEvents="none">
      <VideoView
        player={player}
        contentFit="cover"
        nativeControls={false}
        style={StyleSheet.absoluteFill}
      />

      {/* Darkening tint scrim during gameplay; fades to 0 during win / jail animation */}
      <View
        style={[
          styles.overlayScrim,
          (state === "win" || state === "jail") && { opacity: 0 },
        ]}
      />
    </View>
  );
}

function resolveWebVideoSrc(moduleSource: any, fallbackPath: string): string {
  try {
    const asset = Asset.fromModule(moduleSource);
    if (asset?.uri) return asset.uri;
  } catch {}
  if (typeof moduleSource === "string") return moduleSource;
  if (moduleSource?.uri) return moduleSource.uri;
  if (moduleSource?.default) return moduleSource.default;
  return fallbackPath;
}

export function DailyChallengeVideo({ state, onAnimationEnd }: Props) {
  const chaseRef = useRef<HTMLVideoElement | null>(null);
  const winRef = useRef<HTMLVideoElement | null>(null);
  const jailRef = useRef<HTMLVideoElement | null>(null);

  // Web Implementation using HTML5 Video elements for seamless instant playback
  if (Platform.OS === "web") {
    const chaseSrc = resolveWebVideoSrc(CHASE_VIDEO, "/assets/videos/snake_chase.mp4");
    const winSrc = resolveWebVideoSrc(WIN_VIDEO, "/assets/videos/snake_win.mp4");
    const jailSrc = resolveWebVideoSrc(JAIL_VIDEO, "/assets/videos/snake_jail.mp4");

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
        if (chaseRef.current) {
          setTimeout(() => {
            chaseRef.current?.pause();
          }, 300);
        }
        if (jailRef.current) jailRef.current.pause();
      } else if (state === "jail") {
        if (jailRef.current) {
          jailRef.current.currentTime = 0;
          jailRef.current.play().catch(() => {});
        }
        if (chaseRef.current) {
          setTimeout(() => {
            chaseRef.current?.pause();
          }, 300);
        }
        if (winRef.current) winRef.current.pause();
      }
    }, [state]);

    useEffect(() => {
      if (!onAnimationEnd) return;
      if (state === "win" || state === "jail") {
        const timer = setTimeout(() => {
          onAnimationEnd();
        }, 5200);
        return () => clearTimeout(timer);
      }
    }, [state, onAnimationEnd]);

    return (
      <View style={styles.container} pointerEvents="none">
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

        <View
          style={[
            styles.overlayScrim,
            (state === "win" || state === "jail") && { opacity: 0 },
          ]}
        />
      </View>
    );
  }

  // Native Android & iOS Implementation using expo-video
  return <NativeDailyChallengeVideo state={state} onAnimationEnd={onAnimationEnd} />;
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
