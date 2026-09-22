import React from "react";

type AdBannerProps = {
  style?: any;
};

export function AdBanner({ style }: AdBannerProps) {
  // Web does not support native AdMob banners.
  return null;
}
