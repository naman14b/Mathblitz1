// Test level 4 complete execution flow
import { submitLocalLevelResult, loadJourneyState } from "../src/game/journey/storage";
import { getLevelDef, getWorldForLevel } from "../src/game/journey/worlds";

async function run() {
  console.log("Testing submitLocalLevelResult for Level 4...");
  try {
    const res = await submitLocalLevelResult("test_player", {
      levelId: 4,
      score: 800,
      correctAnswers: 5,
      totalQuestions: 5,
      timeTakenSeconds: 20,
    });
    console.log("submitLocalLevelResult succeeded!");
    console.log("resultData:", JSON.stringify(res.resultData, null, 2));
    console.log("new state highestUnlockedLevel:", res.state.highestUnlockedLevel);
    console.log("new state currentLevel:", res.state.currentLevel);

    const levelDef = getLevelDef(res.resultData.levelId);
    console.log("levelDef:", levelDef.title);
    const world = getWorldForLevel(res.resultData.levelId);
    console.log("world:", world.name);
  } catch (err) {
    console.error("ERROR in submitLocalLevelResult:", err);
  }
}

run();
