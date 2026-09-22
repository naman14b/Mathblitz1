type AdMobModule = typeof import("react-native-google-mobile-ads");

export const TEST_AD_UNITS = {
  BANNER: "ca-app-pub-3940256099942544/9214589741",
  INTERSTITIAL: "ca-app-pub-3940256099942544/1033173712",
  REWARDED: "ca-app-pub-3940256099942544/5224354917",
  REWARDED_INTERSTITIAL: "ca-app-pub-3940256099942544/5354046379",
};

function getAdMob(): AdMobModule | null {
  try {
    return require("react-native-google-mobile-ads");
  } catch (error) {
    console.log("[AdMob] Native module unavailable. Skipping ad.");
    return null;
  }
}

/**
 * Show an Interstitial Ad at natural transition breaks.
 */
export function showInterstitialAd(): Promise<boolean> {
  return new Promise((resolve) => {
    const ads = getAdMob();

    if (!ads) {
      resolve(false);
      return;
    }

    try {
      const interstitial = ads.InterstitialAd.createForAdRequest(
        TEST_AD_UNITS.INTERSTITIAL,
        { requestNonPersonalizedAdsOnly: true }
      );

      const unsubscribeLoaded = interstitial.addAdEventListener(
        ads.AdEventType.LOADED,
        () => {
          try {
            interstitial.show();
          } catch {
            resolve(false);
          }
        }
      );

      const unsubscribeClosed = interstitial.addAdEventListener(
        ads.AdEventType.CLOSED,
        () => {
          unsubscribeLoaded();
          unsubscribeClosed();
          resolve(true);
        }
      );

      const unsubscribeError = interstitial.addAdEventListener(
        ads.AdEventType.ERROR,
        (error: unknown) => {
          console.log("[AdMob] Interstitial error:", error);
          unsubscribeLoaded();
          unsubscribeClosed();
          unsubscribeError();
          resolve(false);
        }
      );

      interstitial.load();
    } catch (error) {
      console.log("[AdMob] Interstitial exception:", error);
      resolve(false);
    }
  });
}

/**
 * Show a Rewarded Ad.
 */
export function showRewardedAd(onReward: () => void): Promise<boolean> {
  return new Promise((resolve) => {
    const ads = getAdMob();

    if (!ads) {
      resolve(false);
      return;
    }

    try {
      const rewarded = ads.RewardedAd.createForAdRequest(
        TEST_AD_UNITS.REWARDED,
        { requestNonPersonalizedAdsOnly: true }
      );

      let rewardEarned = false;

      const unsubscribeLoaded = rewarded.addAdEventListener(
        ads.AdEventType.LOADED,
        () => {
          try {
            rewarded.show();
          } catch {
            resolve(false);
          }
        }
      );

      const unsubscribeEarned = rewarded.addAdEventListener(
        ads.RewardedAdEventType.EARNED_REWARD,
        () => {
          rewardEarned = true;
          onReward();
        }
      );

      const unsubscribeClosed = rewarded.addAdEventListener(
        ads.AdEventType.CLOSED,
        () => {
          unsubscribeLoaded();
          unsubscribeEarned();
          unsubscribeClosed();
          resolve(rewardEarned);
        }
      );

      const unsubscribeError = rewarded.addAdEventListener(
        ads.AdEventType.ERROR,
        (error: unknown) => {
          console.log("[AdMob] Rewarded error:", error);
          unsubscribeLoaded();
          unsubscribeEarned();
          unsubscribeClosed();
          unsubscribeError();
          resolve(false);
        }
      );

      rewarded.load();
    } catch (error) {
      console.log("[AdMob] Rewarded exception:", error);
      resolve(false);
    }
  });
}

/**
 * Show a Rewarded Interstitial Ad.
 */
export function showRewardedInterstitialAd(
  onReward: () => void
): Promise<boolean> {
  return new Promise((resolve) => {
    const ads = getAdMob();

    if (!ads) {
      resolve(false);
      return;
    }

    try {
      const rewardedInterstitial =
        ads.RewardedInterstitialAd.createForAdRequest(
          TEST_AD_UNITS.REWARDED_INTERSTITIAL,
          { requestNonPersonalizedAdsOnly: true }
        );

      let rewardEarned = false;

      const unsubscribeLoaded = rewardedInterstitial.addAdEventListener(
        ads.AdEventType.LOADED,
        () => {
          try {
            rewardedInterstitial.show();
          } catch {
            resolve(false);
          }
        }
      );

      const unsubscribeEarned = rewardedInterstitial.addAdEventListener(
        ads.RewardedAdEventType.EARNED_REWARD,
        () => {
          rewardEarned = true;
          onReward();
        }
      );

      const unsubscribeClosed = rewardedInterstitial.addAdEventListener(
        ads.AdEventType.CLOSED,
        () => {
          unsubscribeLoaded();
          unsubscribeEarned();
          unsubscribeClosed();
          resolve(rewardEarned);
        }
      );

      const unsubscribeError = rewardedInterstitial.addAdEventListener(
        ads.AdEventType.ERROR,
        (error: unknown) => {
          console.log("[AdMob] Rewarded Interstitial error:", error);
          unsubscribeLoaded();
          unsubscribeEarned();
          unsubscribeClosed();
          unsubscribeError();
          resolve(false);
        }
      );

      rewardedInterstitial.load();
    } catch (error) {
      console.log("[AdMob] Rewarded Interstitial exception:", error);
      resolve(false);
    }
  });
}