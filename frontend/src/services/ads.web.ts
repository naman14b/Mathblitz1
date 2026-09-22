export const TEST_AD_UNITS = {
  BANNER: "ca-app-pub-3940256099942544/9214589741",
  INTERSTITIAL: "ca-app-pub-3940256099942544/1033173712",
  REWARDED: "ca-app-pub-3940256099942544/5224354917",
  REWARDED_INTERSTITIAL: "ca-app-pub-3940256099942544/5354046379",
};

function renderWebTestAdModal({
  type,
  onReward,
  duration = 5,
}: {
  type: "Rewarded" | "Interstitial" | "Rewarded Interstitial";
  onReward?: () => void;
  duration?: number;
}): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof document === "undefined") {
      if (onReward) onReward();
      resolve(true);
      return;
    }

    const overlay = document.createElement("div");
    overlay.style.position = "fixed";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.width = "100vw";
    overlay.style.height = "100vh";
    overlay.style.backgroundColor = "rgba(0, 0, 0, 0.88)";
    overlay.style.zIndex = "999999";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.fontFamily = "system-ui, -apple-system, sans-serif";
    overlay.style.padding = "20px";
    overlay.style.boxSizing = "border-box";

    let remainingSeconds = duration;
    let timerId: any = null;
    let rewardGiven = false;

    const modal = document.createElement("div");
    modal.style.width = "100%";
    modal.style.maxWidth = "420px";
    modal.style.backgroundColor = "#0F172A";
    modal.style.borderRadius = "20px";
    modal.style.border = "2px solid #38BDF8";
    modal.style.boxShadow = "0 10px 40px rgba(56, 189, 248, 0.35)";
    modal.style.padding = "24px";
    modal.style.color = "#FFFFFF";
    modal.style.textAlign = "center";
    modal.style.position = "relative";
    modal.style.display = "flex";
    modal.style.flexDirection = "column";
    modal.style.alignItems = "center";
    modal.style.gap = "14px";

    modal.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
        <span style="background-color: #F59E0B; color: #000; font-size: 11px; font-weight: 900; padding: 3px 8px; border-radius: 6px; letter-spacing: 0.5px;">TEST AD</span>
        <span id="ad-timer" style="color: #94A3B8; font-size: 13px; font-weight: 700;">Reward in ${remainingSeconds}s</span>
      </div>
      <div style="width: 72px; height: 72px; border-radius: 36px; background: linear-gradient(135deg, #0284C7, #38BDF8); display: flex; align-items: center; justify-content: center; font-size: 32px; margin-top: 6px; box-shadow: 0 4px 20px rgba(56, 189, 248, 0.4);">
        🎬
      </div>
      <h3 style="margin: 0; font-size: 20px; font-weight: 900; color: #F8FAFC;">Google AdMob Test Ad</h3>
      <p style="margin: 0; font-size: 13px; color: #94A3B8; line-height: 1.5;">
        Simulated <strong>${type}</strong> ad playback for web and preview environments.
      </p>
      <div style="width: 100%; height: 8px; background-color: #334155; border-radius: 4px; overflow: hidden; margin: 6px 0;">
        <div id="ad-progress" style="width: 0%; height: 100%; background: linear-gradient(90deg, #38BDF8, #10B981); transition: width 1s linear;"></div>
      </div>
      <div style="display: flex; gap: 10px; width: 100%; margin-top: 8px;">
        <button id="ad-close-btn" style="flex: 1; padding: 12px; border-radius: 12px; background: #334155; color: #94A3B8; border: none; font-size: 14px; font-weight: 800; cursor: not-allowed;">
          Wait ${remainingSeconds}s
        </button>
        <button id="ad-claim-btn" style="flex: 1; padding: 12px; border-radius: 12px; background: #0284C7; color: #FFFFFF; border: none; font-size: 14px; font-weight: 800; cursor: pointer;">
          Skip & Claim
        </button>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const timerSpan = modal.querySelector("#ad-timer") as HTMLElement;
    const progressBar = modal.querySelector("#ad-progress") as HTMLElement;
    const closeBtn = modal.querySelector("#ad-close-btn") as HTMLButtonElement;
    const claimBtn = modal.querySelector("#ad-claim-btn") as HTMLButtonElement;

    const cleanup = () => {
      if (timerId) clearInterval(timerId);
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    };

    const completeAd = (granted: boolean) => {
      cleanup();
      if (granted && onReward && !rewardGiven) {
        rewardGiven = true;
        onReward();
      }
      resolve(granted);
    };

    claimBtn.onclick = () => {
      completeAd(true);
    };

    closeBtn.onclick = () => {
      if (remainingSeconds <= 0) {
        completeAd(true);
      }
    };

    timerId = setInterval(() => {
      remainingSeconds--;
      const progressPercent = Math.min(100, Math.round(((duration - remainingSeconds) / duration) * 100));
      if (progressBar) progressBar.style.width = `${progressPercent}%`;

      if (remainingSeconds > 0) {
        if (timerSpan) timerSpan.innerText = `Reward in ${remainingSeconds}s`;
        if (closeBtn) closeBtn.innerText = `Wait ${remainingSeconds}s`;
      } else {
        if (timerId) clearInterval(timerId);
        if (timerSpan) timerSpan.innerText = `Reward Ready! ✨`;
        if (closeBtn) {
          closeBtn.innerText = `Close & Claim`;
          closeBtn.style.background = "#10B981";
          closeBtn.style.color = "#FFFFFF";
          closeBtn.style.cursor = "pointer";
        }
      }
    }, 1000);
  });
}

/**
 * Show an Interstitial Ad on Web (simulated modal).
 */
export async function showInterstitialAd(): Promise<boolean> {
  return renderWebTestAdModal({
    type: "Interstitial",
    duration: 3,
  });
}

/**
 * Show a Rewarded Ad on Web (simulated modal).
 */
export async function showRewardedAd(onReward: () => void): Promise<boolean> {
  return renderWebTestAdModal({
    type: "Rewarded",
    onReward,
    duration: 5,
  });
}

/**
 * Show a Rewarded Interstitial Ad on Web (simulated modal).
 */
export async function showRewardedInterstitialAd(
  onReward: () => void
): Promise<boolean> {
  return renderWebTestAdModal({
    type: "Rewarded Interstitial",
    onReward,
    duration: 4,
  });
}
