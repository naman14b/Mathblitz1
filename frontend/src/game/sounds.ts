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

async function ensureReady() {
  if (ready) return;
  ready = true;
  try {
    await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false });
  } catch {}
  (Object.keys(SOURCES) as SoundKey[]).forEach((key) => {
    if (!players[key]) players[key] = createAudioPlayer(SOURCES[key]);
  });
}

export async function playSound(key: SoundKey, enabled: boolean) {
  if (!enabled) return;
  try {
    await ensureReady();
    const player = players[key];
    if (!player) return;
    player.seekTo(0);
    player.play();
  } catch {}
}

export function unloadSounds() {
  (Object.keys(players) as SoundKey[]).forEach((key) => {
    try { players[key]?.remove(); } catch {}
  });
  players = {};
  ready = false;
}
