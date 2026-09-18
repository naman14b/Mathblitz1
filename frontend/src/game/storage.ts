import { storage } from "@/src/utils/storage";
import { DEFAULT_PROFILE, LocalProfile } from "./types";

const PROFILE_KEY = "mathblitz.profile.v1";

export async function loadProfile(): Promise<LocalProfile> {
  return storage.getItem(PROFILE_KEY, DEFAULT_PROFILE) as Promise<LocalProfile>;
}

export async function saveProfile(profile: LocalProfile) {
  await storage.setItem(PROFILE_KEY, profile);
}

export async function resetProfile() {
  await storage.removeItem(PROFILE_KEY);
}