import React, { useState } from "react";
import { View, StyleSheet, Platform, StyleProp, ViewStyle } from "react-native";
import { getActiveAdUnits, isTestMode } from "@/src/config/adMob";

export type AdMobBannerProps = {
  style?: StyleProp<ViewStyle>;
};

export const AdMobBanner = React.memo(function AdMobBanner({ style }: AdMobBannerProps) {
  const [hasError, setHasError] = useState(false);

  // Web and error states render nothing
  if (Platform.OS === "web" || hasError) {
    return null;
  }

  try {
    const {
      BannerAd,
      BannerAdSize,
      TestIds,
    } = require("react-native-google-mobile-ads");

    const adUnits = getActiveAdUnits();
    const unitId = isTestMode()
      ? TestIds?.BANNER || "ca-app-pub-3940256099942544/6300978111"
      : adUnits.BANNER;

    return (
      <View style={[styles.container, style]}>
        <BannerAd
          unitId={unitId}
          size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
          requestOptions={{
            requestNonPersonalizedAdsOnly: true,
          }}
          onAdFailedToLoad={(error: unknown) => {
            console.log("[AdMob Banner] Failed to load, hiding banner:", error);
            setHasError(true);
          }}
        />
      </View>
    );
  } catch (error) {
    // Native module unavailable (e.g. standard Expo Go)
    return null;
  }
});

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 8,
    width: "100%",
  },
});
