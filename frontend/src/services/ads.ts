/**
 * Unified AdMob Services Interface
 *
 * Bridges all app ad calls to the centralized adMobService and adMob config.
 */
import {
  initAdMob,
  preloadMidtermInterstitial,
  showDailyChallengeRewardedAd,
  showKingdomRewardedAd,
  showMidtermInterstitial,
  showPrivacyOptionsForm,
} from "./adMobService";
import {
  ADMOB_CONFIG,
  ADMOB_PRODUCTION_IDS,
  ADMOB_TEST_IDS,
  getActiveAdUnits,
  isTestMode,
} from "@/src/config/adMob";

export {
  initAdMob,
  preloadMidtermInterstitial,
  showDailyChallengeRewardedAd,
  showKingdomRewardedAd,
  showMidtermInterstitial,
  showPrivacyOptionsForm,
  ADMOB_CONFIG,
  ADMOB_PRODUCTION_IDS,
  ADMOB_TEST_IDS,
  getActiveAdUnits,
  isTestMode,
};

// Legacy constant for backwards compatibility
export const TEST_AD_UNITS = ADMOB_TEST_IDS;

/**
 * Show an Interstitial Ad at natural transition breaks.
 * Routes to showMidtermInterstitial (frequency capped & preloaded).
 */
export async function showInterstitialAd(): Promise<boolean> {
  return showMidtermInterstitial();
}

/**
 * Show a Rewarded Ad.
 * Routes to showDailyChallengeRewardedAd.
 */
export async function showRewardedAd(onReward: () => void): Promise<boolean> {
  return showDailyChallengeRewardedAd(onReward);
}

/**
 * Show a Rewarded Interstitial Ad (Used in Sudoku if needed).
 */
export async function showRewardedInterstitialAd(onReward: () => void): Promise<boolean> {
  return showDailyChallengeRewardedAd(onReward);
}