# FunGanit Release Notes

## Version 1.0.7 (Version Code: 7)
* **Application ID / Package Name:** `com.funganit.app`
* **Bundle:** `FunGanit-v1.0.7-release.aab`
* **Target Track:** Google Play Closed Testing / Production
* **Bulletproof Level Complete Hardening:**
  - Added dedicated `JourneyLevelCompleteModalBoundary` component wrapping `JourneyLevelCompleteModal` in `JourneyPlayScreen` to safeguard against any unexpected runtime render crashes.
  - Implemented comprehensive null-safety, default fallbacks, and type guards across all `result`, `questions`, and `answerRecords` properties in `JourneyLevelCompleteModal`.
  - Added safe `try...catch` wrapper in `handleFinishLevel` to ensure level completion never hangs or fails even if storage write operations experience anomalies.
  - Hardened `onUpdateProfile` state sanitization in `frontend/app/index.tsx` ensuring `totalXp` and `tokens` can never be assigned `NaN`.
* **Verified Zero Hook Violations:** Verified 100% compliance with React Rules of Hooks across all components and screens (`npm run check-hooks`).
* **Permissions:** Strictly zero media or photo permissions. Zero broad storage permissions. Camera blocked.
* **Preserved:** All core maths gameplay, offline storage, AdMob integration, sound effects, and backend API connectivity.

## Version 1.0.6 (Version Code: 6)
* **Application ID / Package Name:** `com.funganit.app`
* **Bundle:** `FunGanit-v1.0.6-release.aab`
* **Target Track:** Google Play Closed Testing / Production
* **Critical Bug Fix:** Resolved React "Rendered more hooks than during the previous render" crash when completing Kingdom Journey levels. Moved Reanimated hooks (`useAnimatedStyle`) to the top level of `JourneyLevelCompleteModal` before early returns and guarded conditional mounting in `JourneyPlayScreen`.
* **CI/CD Quality Guard:** Integrated automated AST hook checker (`npm run check-hooks`) to permanently prevent hook order violations across all components and screens.
* **Permissions:** Strictly zero media or photo permissions. Zero broad storage permissions. Camera blocked.
* **Preserved:** All core maths gameplay, offline storage, AdMob integration, sound effects, and backend API connectivity.

## Version 1.0.5 (Version Code: 5)
* **Application ID / Package Name:** `com.funganit.app`
* **Bundle:** `FunGanit-v1.0.5-release.aab`
* **Target Track:** Google Play Closed Testing / Production
* **Permissions:** Strictly zero media or photo permissions. Zero broad storage permissions. Camera blocked.
* **Updates:** Mathematical puzzle engine enhancements, updated Kingdom questions and answer logic, UI polish, and production build optimizations.
* **Preserved:** All core maths gameplay, offline storage, AdMob integration, sound effects, and backend API connectivity.

## Version 1.0.4 (Version Code: 4)
* **Application ID / Package Name:** `com.funganit.app`
* **Bundle:** `FunGanit-v1.0.4-release.aab`
* **Target Track:** Google Play Closed Testing / Production
* **Permissions:** Strictly zero media or photo permissions. Zero broad storage permissions. Camera blocked.
* **Preserved:** All core maths gameplay, offline storage, AdMob integration, sound effects, and backend API connectivity.

## Version 1.0.3 (Version Code: 3)
* **Application ID / Package Name:** `com.funganit.app`
* **Bundle:** `FunGanit-v1.0.3-release.aab` / `release/app-release.aab`
* **Google Play Policy Compliance:** Resolved photo and media permissions (`READ_MEDIA_IMAGES`, `READ_MEDIA_VIDEO`, `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE`, `CAMERA`).
* **System Photo Picker:** Zero runtime permissions declared. Any image selection uses Android's privacy-preserving system Photo Picker (`ActivityResultContracts.PickVisualMedia`).
* **Preserved:** All existing maths gameplay, offline storage, AdMob integration, sound effects, and API connectivity.

## Version 1.0.2 (Version Code: 2)
* **Application ID / Package Name:** `com.funganit.app`
* **Bundle:** `FunGanit-v1.0.2-release.aab`

### What's New in FunGanit 1.0.2
* **Kingdom Stargate Loading Experience:** Added a cinematic portal and castle loading sequence before opening FunGanit Kingdom, featuring rotating motivational quotes and math warrior tips tailored to each realm.
* **Kingdom Level Answer Review:** Players can now tap "Review Answers" upon completing any Kingdom level to examine all questions, see their chosen answers, view the correct options, and read detailed mathematical explanations.
* **Strict Single Correct Answer Enforcement:** Refined riddle generation (`number_logic`) and distractor algorithms across all 28 math concepts and 100 levels to guarantee strictly one correct answer among choices.
* **Optimized Transition Lifecycle:** Streamlined map loading and memory warming for fluid navigation between the game modes.

---

## Version 1.0.1 (Initial FunGanit App Release - Version Code: 1)
* **Application ID / Package Name:** `com.funganit.app`

### What's New in FunGanit 1.0.1
* **Enhanced Visual Experience:** Updated surreal background art, high-resolution day imagery, and polished color system for a more immersive game environment.
* **Improved Performance & Backend Connectivity:** Optimized cloud synchronization and live API connectivity with the upgraded production service.
* **Refined Game Flow & Guides:** Streamlined "How To Play" tutorials and enhanced offline storage persistence across all game modes.
* **Bug Fixes & Stability:** Improved transitions between Blitz, Kingdom Journey, Sudoku Hub, and Logic Puzzles.

---

## Version 1.0.0 (Version Code: 1)

### What's New in FunGanit 1.0.0

Welcome to the official launch of **FunGanit** on Google Play! Train your brain, sharpen your mental calculation speed, and explore mathematical challenges in a beautifully crafted adventure.

#### Key Features & Game Modes:
* **FunGanit Kingdom (Journey Mode):** Embark on an epic 100-level quest across 5 distinct math worlds — Number Forest, Fraction Valley, Percentage City, Algebra Mountain, and Geometry Castle. Face off against challenging World Bosses, earn stars, and collect tokens!
* **60 Seconds Blitz:** Fast-paced arithmetic sprint against the clock. How many problems can you solve before time runs out?
* **Sudoku Hub:** Classic and modern Sudoku puzzles across multiple difficulties with smart hints and best-time tracking.
* **Maths Puzzles:** Engaging logic and brain-teaser numerical puzzles designed to test critical thinking.
* **Math Boss:** Head-to-head tactical math battles testing accuracy, composure, and calculation speed.
* **Daily & Weekly Quests:** Fresh challenges every day and week with streak tracking, XP, and milestone bonuses.
* **AI Coach & Analytics:** Personalized performance insights analyzing strengths, speed, and accuracy patterns.
* **Global Leaderboards & Badges:** Showcase your high scores, unlock achievement badges, and customize your player profile.
* **Offline-Friendly:** Play on the go with automatic local progress saving and background synchronization.

#### System Requirements & Architecture:
* Android 7.0 (API level 24) and higher.
* Optimized for 64-bit ARM (`arm64-v8a`), 32-bit ARM (`armeabi-v7a`), and x86/x86_64 devices.
* Modern edge-to-edge layout and haptic feedback support.
