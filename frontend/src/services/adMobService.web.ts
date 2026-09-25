// Web mock implementation of adMobService for web exports
export async function updateAdMobAudienceForAge(_ageGroup?: string | null): Promise<void> {
  return;
}

export async function initAdMob(_initialAgeGroup?: string | null): Promise<boolean> {
  return false;
}

export function preloadMidtermInterstitial(): void {
  return;
}

export async function showMidtermInterstitial(): Promise<boolean> {
  return false;
}

export async function showDailyChallengeRewardedAd(onReward: () => void): Promise<boolean> {
  onReward();
  return true;
}

export const showKingdomRewardedAd = showDailyChallengeRewardedAd;
export const showRewardedAd = showDailyChallengeRewardedAd;

export async function showPrivacyOptionsForm(): Promise<boolean> {
  return false;
}
