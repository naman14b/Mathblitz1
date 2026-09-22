import React from "react";
import { View, Text, StyleSheet } from "react-native";

type AdBannerProps = {
  style?: any;
};

export function AdBanner({ style }: AdBannerProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.banner}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Test Ad</Text>
        </View>
        <Text style={styles.bannerTitle}>Google AdMob Test Banner</Text>
        <Text style={styles.bannerSubtitle}>320 × 50 Adaptive Banner</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 8,
    width: "100%",
  },
  banner: {
    width: "100%",
    maxWidth: 360,
    height: 52,
    backgroundColor: "#1E293B",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#334155",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  badge: {
    position: "absolute",
    top: 4,
    left: 6,
    backgroundColor: "#F59E0B",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  badgeText: {
    color: "#000000",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.3,
  },
  bannerTitle: {
    color: "#F8FAFC",
    fontSize: 12,
    fontWeight: "800",
  },
  bannerSubtitle: {
    color: "#94A3B8",
    fontSize: 10,
    fontWeight: "600",
    marginTop: 1,
  },
});

