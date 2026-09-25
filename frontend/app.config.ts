import type { ExpoConfig } from "expo/config";

export default ({ config }: { config: ExpoConfig }): ExpoConfig => ({
  ...config,
  plugins: [
    ...(config.plugins ?? []),
    "expo-audio",
    [
      "react-native-google-mobile-ads",
      {
        androidAppId:
          process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID ||
          "ca-app-pub-1850810324754301~7809613303",
        iosAppId:
          process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID ||
          "ca-app-pub-3940256099942544~1458002511",
      },
    ],
  ],
  extra: {
    ...config.extra,
    backendUrl: process.env.EXPO_PUBLIC_BACKEND_URL || "https://mathblitz1.onrender.com",
  },
});