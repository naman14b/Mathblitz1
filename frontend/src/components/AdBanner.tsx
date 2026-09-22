import React, { useState } from "react";
import { View, StyleSheet, Platform } from "react-native";
import { TEST_AD_UNITS } from "@/src/services/ads";

type AdBannerProps = {
  style?: any;
};

export function AdBanner({ style }: AdBannerProps) {
  const [hasError, setHasError] = useState(false);

  // Expo Go / web do not have the native AdMob module.
  if (Platform.OS === "web" || hasError) {
    return null;
  }

  try {
    // Load AdMob only when the native module actually exists.
    const {
      BannerAd,
      BannerAdSize,
      TestIds,
    } = require("react-native-google-mobile-ads");

    return (
      <View style={[styles.container, style]}>
        <BannerAd
          unitId={TestIds?.BANNER || TEST_AD_UNITS.BANNER}
          size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
          requestOptions={{
            requestNonPersonalizedAdsOnly: true,
          }}
          onAdFailedToLoad={(error: unknown) => {
            console.log("[AdMob Banner] Failed to load:", error);
            setHasError(true);
          }}
        />
      </View>
    );
  } catch (error) {
    // Expected in Expo Go because the native AdMob module isn't installed there.
    console.log("[AdMob Banner] Native module unavailable. Skipping banner.");
    return null;
  }
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 8,
    width: "100%",
  },
});