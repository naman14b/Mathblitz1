import React, { Component, ErrorInfo, useState } from "react";
import { View, StyleSheet, Platform, StyleProp, ViewStyle, UIManager, NativeModules } from "react-native";
import { getActiveAdUnits, isTestMode } from "@/src/config/adMob";

export type AdMobBannerProps = {
  style?: StyleProp<ViewStyle>;
};

/**
 * Isolated error boundary specifically for ad rendering.
 * Guarantees that any ad loading or native component crash will NEVER bubble
 * up to the root error boundary or crash the application.
 */
class AdErrorBoundary extends Component<
  { children: React.ReactNode; onError: () => void },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.log("[AdMob Banner] Render error safely caught by AdErrorBoundary:", error.message);
    this.props.onError();
  }

  render() {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}

/**
 * Safely verify if native Google Mobile Ads banner view manager is registered.
 * In environments like standard Expo Go, web, or when native code is unlinked,
 * this prevents React Native from throwing an Invariant Violation.
 */
function isBannerNativeComponentAvailable(): boolean {
  if (Platform.OS === "web") {
    return false;
  }
  try {
    const hasViewManager = Boolean(
      UIManager.getViewManagerConfig?.("RNGoogleMobileAdsBannerView") ||
      (UIManager as any)?.RNGoogleMobileAdsBannerView
    );
    const hasModule = Boolean(
      NativeModules.RNGoogleMobileAdsModule ||
      (NativeModules as any)?.RNGoogleMobileAdsBannerViewManager
    );
    return hasViewManager || hasModule;
  } catch {
    return false;
  }
}

export const AdMobBanner = React.memo(function AdMobBanner({ style }: AdMobBannerProps) {
  const [hasError, setHasError] = useState(false);

  // Return nothing on Web, on error, or if native banner module is not available
  if (Platform.OS === "web" || hasError || !isBannerNativeComponentAvailable()) {
    return null;
  }

  try {
    const mobileAds = require("react-native-google-mobile-ads");
    const BannerAd = mobileAds?.BannerAd;
    const BannerAdSize = mobileAds?.BannerAdSize;
    const TestIds = mobileAds?.TestIds;

    if (!BannerAd || !BannerAdSize) {
      return null;
    }

    const adUnits = getActiveAdUnits();
    const unitId = isTestMode()
      ? TestIds?.BANNER || "ca-app-pub-3940256099942544/6300978111"
      : adUnits.BANNER;

    return (
      <AdErrorBoundary onError={() => setHasError(true)}>
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
      </AdErrorBoundary>
    );
  } catch (error) {
    // Native module unavailable or failed to require
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
