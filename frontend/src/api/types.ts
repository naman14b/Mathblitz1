export type AdminQuestion = {
  id: string;
  prompt: string;
  options: string[];
  correct_answer: string;
  age_group: string;
  topic: string;
  active: boolean;
};

export type AdminChallenge = {
  id: string;
  days: number;
  title: string;
  description: string;
  reward_xp: number;
  active: boolean;
};

export type MonetizationSettings = {
  rewarded_ads_enabled: boolean;
  interstitial_frequency: number;
  remove_ads_price: string;
};