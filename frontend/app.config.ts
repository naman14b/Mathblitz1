import type { ExpoConfig } from "expo/config";

export default ({ config }: { config: ExpoConfig }): ExpoConfig => ({
  ...config,
  plugins: [
    ...(config.plugins ?? []),
    "expo-audio",
    [
      "react-native-google-mobile-ads",
      {
        androidAppId: "ca-app-pub-3940256099942544~3347511713",
      },
    ],
  ],
  extra: {
    ...config.extra,
    backendUrl: process.env.EXPO_PUBLIC_BACKEND_URL,
  },
});