import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from "expo-audio";

export type SoundKey = "correct" | "wrong" | "levelup" | "tick" | "gameover";

const SOURCES: Record<SoundKey, number> = {
  correct: require("@/assets/sounds/correct.wav"),
  wrong: require("@/assets/sounds/wrong.wav"),
  levelup: require("@/assets/sounds/levelup.wav"),
  tick: require("@/assets/sounds/tick.wav"),
  gameover: require("@/assets/sounds/gameover.wav"),
};

let players: Partial<Record<SoundKey, AudioPlayer>> = {};
let ready = false;
let readyPromise: Promise<void> | null = null;
const seeking: Partial<Record<SoundKey, boolean>> = {};

async function ensureReady(): Promise<void> {
  if (ready) return;
  if (!readyPromise) {
    readyPromise = (async () => {
      try {
        await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false });
      } catch {}
      (Object.keys(SOURCES) as SoundKey[]).forEach((key) => {
        if (!players[key]) {
          try {
            players[key] = createAudioPlayer(SOURCES[key]);
          } catch {}
        }
      });
      ready = true;
    })();
  }
  return readyPromise;
}

export function playSound(key: SoundKey, enabled: boolean = true): void {
  if (!enabled) return;
  ensureReady()
    .then(() => {
      const player = players[key];
      if (!player) return;

      try {
        if (player.currentTime > 0) {
          if (seeking[key]) return; // Seek already in progress for this key
          seeking[key] = true;
          player
            .seekTo(0)
            .then(() => {
              seeking[key] = false;
              try {
                if (players[key] === player) {
                  player.play();
                }
              } catch {}
            })
            .catch(() => {
              seeking[key] = false;
              try {
                if (players[key] === player) {
                  player.play();
                }
              } catch {}
            });
          return;
        }
        player.play();
      } catch {
        // Non-fatal playback error
      }
    })
    .catch(() => {});
}

export function unloadSounds() {
  (Object.keys(players) as SoundKey[]).forEach((key) => {
    try {
      players[key]?.remove();
    } catch {}
  });
  players = {};
  (Object.keys(seeking) as SoundKey[]).forEach((k) => delete seeking[k]);
  ready = false;
  readyPromise = null;
}
