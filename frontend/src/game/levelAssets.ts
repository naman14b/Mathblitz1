import { ImageSourcePropType } from "react-native";

export const LEVEL_IMAGES: Record<number, ImageSourcePropType> = {
  1: require("@/assets/levels/level_1.jpg"),
  2: require("@/assets/levels/level_2.jpg"),
  3: require("@/assets/levels/level_3.jpg"),
  4: require("@/assets/levels/level_4.jpg"),
  5: require("@/assets/levels/level_5.jpg"),
  6: require("@/assets/levels/level_6.jpg"),
  7: require("@/assets/levels/level_7.jpg"),
  8: require("@/assets/levels/level_8.jpg"),
  9: require("@/assets/levels/level_9.jpg"),
  10: require("@/assets/levels/level_10.jpg"),
  11: require("@/assets/levels/level_11.jpg"),
};

export const ASTRONAUT_HEADER: ImageSourcePropType = require("@/assets/levels/header_astronaut.jpg");

export function getLevelImage(level: number): ImageSourcePropType {
  const index = ((level - 1) % 11) + 1;
  return LEVEL_IMAGES[index] || LEVEL_IMAGES[1];
}

export function formatSecondsToTime(seconds?: number): string {
  if (typeof seconds !== "number" || seconds <= 0) return "--:--";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}
