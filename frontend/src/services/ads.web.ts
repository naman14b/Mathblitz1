export const TEST_AD_UNITS = {
  BANNER: "",
  INTERSTITIAL: "",
  REWARDED: "",
  REWARDED_INTERSTITIAL: "",
};

/**
 * Web stub: no-op for interstitial ads on web.
 */
export async function showInterstitialAd(): Promise<boolean> {
  return false;
}

/**
 * Web stub: grants reward directly on web.
 */
export async function showRewardedAd(onReward: () => void): Promise<boolean> {
  onReward();
  return true;
}

/**
 * Web stub: grants reward directly on web.
 */
export async function showRewardedInterstitialAd(
  onReward: () => void
): Promise<boolean> {
  onReward();
  return true;
}
