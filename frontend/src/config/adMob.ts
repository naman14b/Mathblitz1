/**
 * FunGanit Centralized Google AdMob Configuration
 *
 * Centralizes:
 * - AdMob Android App ID
 * - Banner Ad Unit ID
 * - Rewarded Ad Unit ID (Daily Challenge)
 * - Interstitial Ad Unit ID (Midterm)
 *
 * Supports seamless switching between Google Test Ads (for development/testing)
 * and FunGanit Production IDs.
 */

// FunGanit Official Production AdMob IDs
export const ADMOB_PRODUCTION_IDS = {
  APP_ID: "ca-app-pub-1850810324754301~7809613303",
  BANNER: "ca-app-pub-1850810324754301/6609110069",
  REWARDED: "ca-app-pub-1850810324754301/4282329626", // Daily Challenge Rewarded
  INTERSTITIAL: "ca-app-pub-1850810324754301/2731332390", // Midterm Interstitial
  REWARDED_INTERSTITIAL: "ca-app-pub-1850810324754301/4282329626",
} as const;

// Official Google Mobile Ads Test IDs (Guaranteed safe for testing)
export const ADMOB_TEST_IDS = {
  APP_ID: "ca-app-pub-3940256099942544~3347511713",
  BANNER: "ca-app-pub-3940256099942544/6300978111",
  REWARDED: "ca-app-pub-3940256099942544/5224354917",
  INTERSTITIAL: "ca-app-pub-3940256099942544/1033173712",
  REWARDED_INTERSTITIAL: "ca-app-pub-3940256099942544/5354046379",
} as const;

/**
 * AdMob Operating Mode
 *
 * Set EXPO_PUBLIC_ADMOB_MODE="production" in environment or eas.json when ready for live ads.
 * Defaults to "test" so that internal-testing builds and local development never accidentally
 * request or click live production ads (preventing AdMob policy strikes).
 */
export type AdMobMode = "test" | "production";

export const ADMOB_CONFIG = {
  mode: (process.env.EXPO_PUBLIC_ADMOB_MODE === "production" ? "production" : "test") as AdMobMode,

  // Minimum interval (in ms) between interstitial ad displays to prevent spam
  interstitialCooldownMs: 180_000, // 3 minutes

  // Maximum content rating for all ad requests (G = General Audiences / Family-safe)
  maxAdContentRating: "G",

  // Family policy compliance flags
  tagForChildDirectedTreatment: true,
  tagForUnderAgeOfConsent: true,
};

/**
 * Returns the currently active Ad Unit IDs according to ADMOB_CONFIG.mode.
 */
export function getActiveAdUnits() {
  if (ADMOB_CONFIG.mode === "production") {
    return ADMOB_PRODUCTION_IDS;
  }
  return ADMOB_TEST_IDS;
}

/**
 * Check if the app is currently running in test ad mode.
 */
export function isTestMode(): boolean {
  return ADMOB_CONFIG.mode === "test";
}
