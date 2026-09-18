export type AdminQuestion = {
  id: string;
  prompt: string;
  options: string[];
  correct_answer: string;
  age_group: string;
  topic: string;
  active: boolean;
};

export type ChallengeTier = "3-day" | "7-day";

export type ChallengeQuestion = {
  id: string;
  tier: ChallengeTier;
  prompt: string;
  image_path?: string | null;
  options: string[];
  correct_answer: string;
  time_limit_seconds: number;
  active: boolean;
};

export type MonetizationSettings = {
  rewarded_ads_enabled: boolean;
  interstitial_frequency: number;
  remove_ads_price: string;
};

export type UploadResult = { path: string; url: string };
