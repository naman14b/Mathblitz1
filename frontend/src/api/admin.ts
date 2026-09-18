import Constants from "expo-constants";
import { Platform } from "react-native";
import { AdminQuestion, ChallengeQuestion, ChallengeTier, MonetizationSettings, UploadResult } from "./types";

const backendUrl = Constants.expoConfig?.extra?.backendUrl ?? process.env.EXPO_PUBLIC_BACKEND_URL;
const API_ROOT = backendUrl ? `${backendUrl.replace(/\/$/, "")}/api` : "";

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  if (!API_ROOT) throw new Error("Admin service is unavailable");
  const response = await fetch(`${API_ROOT}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(token ? { "X-Admin-Token": token } : {}), ...(options.headers ?? {}) },
  });
  if (!response.ok) throw new Error((await response.json().catch(() => null))?.detail ?? "Request failed");
  return response.json() as Promise<T>;
}

async function uploadImage(token: string, uri: string, name: string, type: string): Promise<UploadResult> {
  if (!API_ROOT) throw new Error("Admin service is unavailable");
  const form = new FormData();
  if (Platform.OS === "web") {
    const blob = await (await fetch(uri)).blob();
    form.append("file", blob, name);
  } else {
    form.append("file", { uri, name, type } as unknown as Blob);
  }
  const response = await fetch(`${API_ROOT}/admin/upload`, { method: "POST", body: form, headers: { "X-Admin-Token": token } });
  if (!response.ok) throw new Error((await response.json().catch(() => null))?.detail ?? "Upload failed");
  return response.json() as Promise<UploadResult>;
}

export function fileUrl(pathOrUrl: string | null | undefined): string | null {
  if (!pathOrUrl) return null;
  if (pathOrUrl.startsWith("http")) return pathOrUrl;
  if (pathOrUrl.startsWith("/api/")) return backendUrl ? `${backendUrl.replace(/\/$/, "")}${pathOrUrl}` : pathOrUrl;
  return `${API_ROOT}/files/${pathOrUrl}`;
}

export const adminApi = {
  requestOtp: (email: string) => request<{ message: string }>("/admin/request-otp", { method: "POST", body: JSON.stringify({ email }) }),
  verifyOtp: (email: string, otp: string) => request<{ setup_token: string; must_change_password: boolean }>("/admin/verify-otp", { method: "POST", body: JSON.stringify({ email, otp }) }),
  setPassword: (setupToken: string, newPassword: string) => request<{ token: string }>("/admin/set-password", { method: "POST", body: JSON.stringify({ new_password: newPassword }) }, setupToken),
  login: (email: string, password: string) => request<{ token: string }>("/admin/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  questions: (token: string) => request<AdminQuestion[]>("/admin/questions", {}, token),
  saveQuestion: (token: string, question: AdminQuestion) => request<AdminQuestion>("/admin/questions", { method: "POST", body: JSON.stringify(question) }, token),
  deleteQuestion: (token: string, id: string) => request<{ deleted: boolean }>(`/admin/questions/${id}`, { method: "DELETE" }, token),
  challengeQuestions: (token: string, tier?: ChallengeTier) => request<ChallengeQuestion[]>(`/admin/challenge-questions${tier ? `?tier=${encodeURIComponent(tier)}` : ""}`, {}, token),
  saveChallengeQuestion: (token: string, question: ChallengeQuestion) => request<ChallengeQuestion>("/admin/challenge-questions", { method: "POST", body: JSON.stringify(question) }, token),
  deleteChallengeQuestion: (token: string, id: string) => request<{ deleted: boolean }>(`/admin/challenge-questions/${id}`, { method: "DELETE" }, token),
  publicChallengeQuestions: (tier: ChallengeTier) => request<ChallengeQuestion[]>(`/challenge-questions/${encodeURIComponent(tier)}`),
  uploadImage,
  monetization: (token: string) => request<MonetizationSettings>("/admin/monetization", {}, token),
  saveMonetization: (token: string, settings: MonetizationSettings) => request<MonetizationSettings>("/admin/monetization", { method: "PUT", body: JSON.stringify(settings) }, token),
};
