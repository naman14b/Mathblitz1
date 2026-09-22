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

export type LeaderboardRow = {
  rank: number;
  username: string;
  score: number;
  age_group: string;
  game_mode: string;
  played_at: string;
};

export type LeaderboardTimeframe = "daily" | "weekly" | "all-time";

export type BossQuestion = {
  id: string;
  prompt: string;
  answer: number;
  options: string[];
};

export type BossChallenge = {
  level: number;
  boss_name: string;
  boss_avatar?: string;
  boss_emoji?: string;
  boss_title?: string;
  challenge_quote?: string;
  taunt?: string;
  questions: BossQuestion[];
  time_limit?: number;
  time_limit_seconds?: number;
};

export type BossResult = {
  won: boolean;
  boss_name: string;
  message: string;
  tokens_change: number;
  level: number;
};
