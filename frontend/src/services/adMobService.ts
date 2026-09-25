import { Platform } from "react-native";
import {
  ADMOB_CONFIG,
  ADMOB_PRODUCTION_IDS,
  ADMOB_TEST_IDS,
  getActiveAdUnits,
  isTestMode,
} from "@/src/config/adMob";

type AdMobModule = typeof import("react-native-google-mobile-ads");

let isInitialized = false;
let initPromise: Promise<boolean> | null = null;
let lastInterstitialShownAt = 0;
let preloadedInterstitial: any = null;
let isPreloadingInterstitial = false;

/**
 * Safely load native react-native-google-mobile-ads module.
 * Returns null on Web or in environments where the native module is unavailable.
 */
function getNativeAdMob(): AdMobModule | null {
  if (Platform.OS === "web") {
    return null;
  }
  try {
    return require("react-native-google-mobile-ads");
  } catch (error) {
    console.log("[AdMob] Native module unavailable:", error);
    return null;
  }
}

/**
 * Update request configuration dynamically based on the player's selected age group.
 * Matches Google Play Families Policy for mixed-audience apps:
 * - Children (<13: "6-7", "8-10", "11-13" or unset): tagForChildDirectedTreatment=true, G-rating
 * - Teens ("14-16"): tagForChildDirectedTreatment=false, tagForUnderAgeOfConsent=true, PG-rating
 * - Adults (17+: "17-20", "21+"): tagForChildDirectedTreatment=false, tagForUnderAgeOfConsent=false, T-rating
 */
export async function updateAdMobAudienceForAge(ageGroup?: string | null): Promise<void> {
  const ads = getNativeAdMob();
  if (!ads || typeof ads.default !== "function") return;

  const { MaxAdContentRating } = ads;

  let isChild = true;
  let isUnderAge = true;
  let maxRating = MaxAdContentRating?.G || ("G" as any);

  if (ageGroup === "17-20" || ageGroup === "21+") {
    isChild = false;
    isUnderAge = false;
    maxRating = MaxAdContentRating?.T || MaxAdContentRating?.PG || ("T" as any);
  } else if (ageGroup === "14-16") {
    isChild = false;
    isUnderAge = true;
    maxRating = MaxAdContentRating?.PG || MaxAdContentRating?.G || ("PG" as any);
  } else {
    // Under 13 or unset: strict child-directed treatment
    isChild = true;
    isUnderAge = true;
    maxRating = MaxAdContentRating?.G || ("G" as any);
  }

  try {
    await ads.default().setRequestConfiguration({
      maxAdContentRating: maxRating,
      tagForChildDirectedTreatment: isChild,
      tagForUnderAgeOfConsent: isUnderAge,
      testDeviceIdentifiers: ["EMULATOR"],
    });
  } catch (e) {
    console.log("[AdMob] Audience configuration notice:", e);
  }
}

/**
 * Centralized, non-blocking AdMob initialization with Google UMP Consent.
 * Follows the official Google sequence:
 * App launch -> UMP update -> consent form if required -> determine whether ads can be requested -> initialize/request ads.
 */
export async function initAdMob(initialAgeGroup?: string | null): Promise<boolean> {
  if (isInitialized) {
    return true;
  }
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    const ads = getNativeAdMob();
    if (!ads) {
      isInitialized = true;
      return false;
    }

    try {
      // 1. Google UMP Consent update in background (non-blocking)
      let canRequestAds = true;
      try {
        const { AdsConsent } = ads;
        if (AdsConsent) {
          const consentInfo = await AdsConsent.requestInfoUpdate();
          if (
            consentInfo.status === ads.AdsConsentStatus?.REQUIRED ||
            consentInfo.status === ads.AdsConsentStatus?.UNKNOWN
          ) {
            await AdsConsent.loadAndShowConsentFormIfRequired();
          }
          if (typeof consentInfo.canRequestAds === "boolean") {
            canRequestAds = consentInfo.canRequestAds;
          }
        }
      } catch (consentErr) {
        console.log("[AdMob] UMP Consent background notice:", consentErr);
      }

      // 2. Set Audience & COPPA Request Configuration
      await updateAdMobAudienceForAge(initialAgeGroup);

      // 3. Initialize Mobile Ads SDK
      if (typeof ads.default === "function") {
        await ads.default().initialize();
        console.log(`[AdMob] SDK initialized successfully in ${ADMOB_CONFIG.mode.toUpperCase()} mode.`);
      }

      isInitialized = true;

      // 4. Preload initial midterm interstitial ad only if ads can be requested
      if (canRequestAds) {
        preloadMidtermInterstitial();
      }

      return true;
    } catch (err) {
      console.log("[AdMob] Initialization failed gracefully:", err);
      isInitialized = true;
      return false;
    }
  })();

  return initPromise;
}

/**
 * Preload the Midterm Interstitial Ad so it is ready when a game session ends.
 */
export function preloadMidtermInterstitial() {
  if (isPreloadingInterstitial || preloadedInterstitial) {
    return;
  }
  const ads = getNativeAdMob();
  if (!ads) return;

  try {
    const adUnits = getActiveAdUnits();
    const adUnitId = isTestMode()
      ? ads.TestIds?.INTERSTITIAL || ADMOB_TEST_IDS.INTERSTITIAL
      : adUnits.INTERSTITIAL;

    isPreloadingInterstitial = true;
    const interstitial = ads.InterstitialAd.createForAdRequest(adUnitId, {
      requestNonPersonalizedAdsOnly: true,
    });

    const unsubLoaded = interstitial.addAdEventListener(ads.AdEventType.LOADED, () => {
      preloadedInterstitial = interstitial;
      isPreloadingInterstitial = false;
      unsubLoaded();
      unsubError();
    });

    const unsubError = interstitial.addAdEventListener(ads.AdEventType.ERROR, (error: unknown) => {
      console.log("[AdMob] Interstitial preload error:", error);
      preloadedInterstitial = null;
      isPreloadingInterstitial = false;
      unsubLoaded();
      unsubError();
    });

    interstitial.load();
  } catch (e) {
    console.log("[AdMob] Preload exception:", e);
    isPreloadingInterstitial = false;
  }
}

/**
 * Show Midterm Interstitial Ad at a natural game break.
 *
 * Frequency protected: Will only show if at least `interstitialCooldownMs` (3 minutes)
 * have elapsed since the last interstitial.
 * Never blocks the game; fails immediately if ad is not ready.
 */
export function showMidtermInterstitial(): Promise<boolean> {
  return new Promise((resolve) => {
    const now = Date.now();
    // Frequency capping protection
    if (now - lastInterstitialShownAt < ADMOB_CONFIG.interstitialCooldownMs) {
      resolve(false);
      return;
    }

    const ads = getNativeAdMob();
    if (!ads) {
      resolve(false);
      return;
    }

    // If preloaded ad is ready, display it
    if (preloadedInterstitial) {
      const ad = preloadedInterstitial;
      preloadedInterstitial = null;

      const unsubClosed = ad.addAdEventListener(ads.AdEventType.CLOSED, () => {
        unsubClosed();
        lastInterstitialShownAt = Date.now();
        preloadMidtermInterstitial(); // Preload next one
        resolve(true);
      });

      try {
        ad.show().catch(() => {
          preloadedInterstitial = null;
          preloadMidtermInterstitial();
          resolve(false);
        });
      } catch {
        preloadedInterstitial = null;
        preloadMidtermInterstitial();
        resolve(false);
      }
      return;
    }

    // If not ready, load and show on the fly without blocking user indefinitely (5s timeout)
    try {
      const adUnits = getActiveAdUnits();
      const adUnitId = isTestMode()
        ? ads.TestIds?.INTERSTITIAL || ADMOB_TEST_IDS.INTERSTITIAL
        : adUnits.INTERSTITIAL;

      const interstitial = ads.InterstitialAd.createForAdRequest(adUnitId, {
        requestNonPersonalizedAdsOnly: true,
      });

      let finished = false;
      const timeout = setTimeout(() => {
        if (!finished) {
          finished = true;
          resolve(false);
        }
      }, 3500);

      const unsubLoaded = interstitial.addAdEventListener(ads.AdEventType.LOADED, () => {
        if (finished) return;
        try {
          interstitial.show();
        } catch {
          if (!finished) {
            finished = true;
            clearTimeout(timeout);
            resolve(false);
          }
        }
      });

      const unsubClosed = interstitial.addAdEventListener(ads.AdEventType.CLOSED, () => {
        if (!finished) {
          finished = true;
          clearTimeout(timeout);
          lastInterstitialShownAt = Date.now();
          preloadMidtermInterstitial();
          resolve(true);
        }
      });

      const unsubError = interstitial.addAdEventListener(ads.AdEventType.ERROR, () => {
        if (!finished) {
          finished = true;
          clearTimeout(timeout);
          resolve(false);
        }
      });

      interstitial.load();
    } catch {
      resolve(false);
    }
  });
}

/**
 * Show Rewarded Ad for Daily Challenge.
 *
 * User-initiated and completely optional.
 * Reward callback is protected against duplicate calls.
 */
export function showDailyChallengeRewardedAd(onReward: () => void): Promise<boolean> {
  return new Promise((resolve) => {
    const ads = getNativeAdMob();
    if (!ads) {
      resolve(false);
      return;
    }

    try {
      const adUnits = getActiveAdUnits();
      const adUnitId = isTestMode()
        ? ads.TestIds?.REWARDED || ADMOB_TEST_IDS.REWARDED
        : adUnits.REWARDED;

      const rewarded = ads.RewardedAd.createForAdRequest(adUnitId, {
        requestNonPersonalizedAdsOnly: true,
      });

      let rewardEarned = false;
      let hasCalledReward = false;

      const unsubLoaded = rewarded.addAdEventListener(ads.AdEventType.LOADED, () => {
        try {
          rewarded.show();
        } catch {
          resolve(false);
        }
      });

      const unsubEarned = rewarded.addAdEventListener(
        ads.RewardedAdEventType.EARNED_REWARD,
        () => {
          rewardEarned = true;
          if (!hasCalledReward) {
            hasCalledReward = true;
            onReward();
          }
        }
      );

      const unsubClosed = rewarded.addAdEventListener(ads.AdEventType.CLOSED, () => {
        cleanup();
        resolve(rewardEarned);
      });

      const unsubError = rewarded.addAdEventListener(ads.AdEventType.ERROR, (error: unknown) => {
        console.log("[AdMob] Daily Challenge Rewarded ad error:", error);
        cleanup();
        resolve(false);
      });

      const cleanup = () => {
        unsubLoaded();
        unsubEarned();
        unsubClosed();
        unsubError();
      };

      rewarded.load();
    } catch (err) {
      console.log("[AdMob] Rewarded ad exception:", err);
      resolve(false);
    }
  });
}

/**
 * Rewarded Ad for Kingdom Journey Continue (+30 Seconds).
 * Uses existing rewarded unit: ca-app-pub-1850810324754301/4282329626
 */
export const showKingdomRewardedAd = showDailyChallengeRewardedAd;
export const showRewardedAd = showDailyChallengeRewardedAd;

/**
 * Show Google UMP Privacy Options Form (Called from Settings -> Data & Privacy).
 */
export async function showPrivacyOptionsForm(): Promise<boolean> {
  const ads = getNativeAdMob();
  if (!ads || !ads.AdsConsent) {
    return false;
  }
  try {
    await ads.AdsConsent.showPrivacyOptionsForm();
    return true;
  } catch (err) {
    console.log("[AdMob] Privacy options form error:", err);
    return false;
  }
}
