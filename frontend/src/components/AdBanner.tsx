import React from "react";
import { AdMobBanner, AdMobBannerProps } from "./ads/AdMobBanner";

export { AdMobBanner };

export function AdBanner(props: AdMobBannerProps) {
  return <AdMobBanner {...props} />;
}