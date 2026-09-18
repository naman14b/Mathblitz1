import type { ExpoConfig } from "expo/config";

export default ({ config }: { config: ExpoConfig }): ExpoConfig => ({
  ...config,
  plugins: [...(config.plugins ?? []), "expo-audio"],
  extra: {
    ...config.extra,
    backendUrl: process.env.EXPO_PUBLIC_BACKEND_URL,
  },
});