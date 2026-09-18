import Constants from "expo-constants";
import { AdminChallenge, AdminQuestion, MonetizationSettings } from "./types";

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

export const adminApi = {
  login: (email: string, password: string) => request<{ token: string }>("/admin/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  questions: (token: string) => request<AdminQuestion[]>("/admin/questions", {}, token),
  saveQuestion: (token: string, question: AdminQuestion) => request<AdminQuestion>("/admin/questions", { method: "POST", body: JSON.stringify(question) }, token),
  deleteQuestion: (token: string, id: string) => request<{ deleted: boolean }>(`/admin/questions/${id}`, { method: "DELETE" }, token),
  challenges: (token: string) => request<AdminChallenge[]>("/admin/challenges", {}, token),
  saveChallenge: (token: string, challenge: AdminChallenge) => request<AdminChallenge>("/admin/challenges", { method: "POST", body: JSON.stringify(challenge) }, token),
  monetization: (token: string) => request<MonetizationSettings>("/admin/monetization", {}, token),
  saveMonetization: (token: string, settings: MonetizationSettings) => request<MonetizationSettings>("/admin/monetization", { method: "PUT", body: JSON.stringify(settings) }, token),
};