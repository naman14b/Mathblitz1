# MathBlitz — Google Play Release Checklist & Store Assets

**Application Name:** MathBlitz  
**Package / Application ID:** `com.naman.mathblitz`  
**Target Release:** Production Track (v1.0.0, Version Code: 1)  
**Target SDK:** 36 (Android 16 / 15)  
**Compile SDK:** 36  
**Min SDK:** 24 (Android 7.0 Nougat)  

---

## 1. Store Listing Copy

### App Title (Max 30 characters)
```text
MathBlitz: Brain Math Games
```

### Short Description (Max 80 characters)
```text
Fast-paced mental math, 100-level kingdom journey, Sudoku, and logic puzzles!
```
*(Exact character count: 75 characters)*

### Full Description (Formatted for Google Play)
```text
Sharpen your mind and boost your mental math calculation speed with MathBlitz! Whether you want a quick 60-second math sprint or an epic adventure through mathematical worlds, MathBlitz offers dynamic challenges designed for players of all ages.

⚡ FAST-PACED GAME MODES

• 60 Seconds Blitz: Test your calculation speed against the clock. Solve arithmetic questions rapidly, build score multipliers, and set personal records.
• Math Boss: Step into head-to-head tactical math duels. Solve tricky problems under pressure to defeat powerful calculation bosses.
• Sudoku Hub: Enjoy handcrafted Sudoku puzzles across multiple difficulty tiers with smooth touch controls, error detection, and smart hints.
• Maths Puzzles: Challenge your deductive reasoning and pattern recognition with brain-teaser logic puzzles.
• Daily Challenge: A fresh competitive math challenge every single day. Maintain your streak and climb the global leaderboards!

🏰 MATHBLITZ KINGDOM — 100-LEVEL JOURNEY

Embark on a structured 100-level mathematical quest across 5 vibrant worlds:
1. Number Forest: Master fundamental operations, number patterns, and speed drills.
2. Fraction Valley: Conquer fractions, equivalence, and mixed arithmetic.
3. Percentage City: Solve real-world percentages, ratios, and estimation.
4. Algebra Mountain: Unlock unknowns, basic algebra puzzles, and equations.
5. Geometry Castle: Explore spatial challenges, perimeter, area, and geometric logic.

Earn up to 3 stars per level based on accuracy and speed. Defeat World Bosses to unlock new regions, collect tokens, and expand your math prowess.

📊 PERSONALIZED PROGRESS & AI COACH

• AI Coach Analytics: Understand your calculation speed, identify operations that need practice, and review your accuracy trends.
• Badges & Achievements: Unlock achievements as you master speed gates, complete streaks, and clear worlds.
• Offline Support: Play your favorite puzzle modes on the go. Your progress synchronizes automatically when you reconnect.

MathBlitz is free to play with optional non-intrusive rewarded ads. Download MathBlitz today and turn daily math practice into an exciting adventure!
```

---

## 2. Store Assets & Graphics Checklist

| Asset | Specifications | Status / Requirement |
|---|---|---|
| **App Icon** | 512 x 512 px, 32-bit PNG, max 1MB | Ready in repo (`assets/images/mathblitz-icon.jpg` — export to 512x512 PNG) |
| **Feature Graphic** | 1024 x 500 px, JPG or 24-bit PNG, no alpha, max 15MB | **Action Required:** Provide a landscape banner featuring MathBlitz branding and characters |
| **Phone Screenshots** | Min 2, Max 8 screenshots; 16:9 or 9:16 aspect ratio; min 1080px on shortest side | **Action Required:** Capture high-resolution screenshots of Home, 60s Blitz, Kingdom Map, Sudoku, and AI Coach |
| **Tablet Screenshots (Optional)**| 7-inch & 10-inch screenshots (min 1080px) | Recommended to improve tablet store reach |

---

## 3. Google Play Content Rating Questionnaire

Based on the actual application code, submit the following factual answers in the **Content rating** section:

1. **Category:** Game -> Puzzle / Trivia / Educational
2. **Violence:**
   - Does the app contain any violent content? -> **No**
3. **Sexuality:**
   - Does the app contain sexual material or nudity? -> **No**
4. **Language:**
   - Does the app contain offensive language or profanity? -> **No**
5. **Controlled Substances:**
   - Does the app reference or encourage alcohol, tobacco, or drugs? -> **No**
6. **Gambling:**
   - Does the app contain simulated gambling or cash prizes? -> **No**
7. **User-Generated Content & Communication:**
   - Does the app allow users to interact or exchange messages through text or voice? -> **No** (There is no player-to-player direct messaging or chat)
   - Does the app share the user's physical location? -> **No**
   - Can users purchase digital goods? -> **No** (Direct UPI purchases removed; Google Play Billing is currently inactive for v1.0.0)

**Expected Rating:** PEGI 3 / ESRB Everyone / USK 0 (Suitable for all general audiences).

---

## 4. Google Play Families & Children's Policy Audit

- **Intended Target Age Group:** Select **Age 13 and older** (13-15, 16-17, 18+) unless you explicitly intend to participate in the "Designed for Families" program.
- **Why this is recommended for v1.0.0:**
  1. Participating in the Google Play Families program requires zero behavioral advertising, strict COPPA-compliant ad SDK certification, and additional verification.
  2. MathBlitz targets teenagers and adults looking for mental math training and brain teasers.
  3. Setting the target audience to 13+ prevents accidental rejections under strict COPPA / Families ad network requirements while allowing users of all ages to download the game.

---

## 5. In-App Monetization & Google Play Billing Compliance Status

> [!NOTE]
> **Status for Version 1.0.0 Release:**
> * **Direct UPI/QR Purchases Removed:** Direct UPI QR payment modals, bank transfer references, and manual 12-digit UTR verification have been completely removed from ThemeStore and Achievements.
> * **Google Play Billing Prepared:** Clean modular architecture implemented in `purchaseService.ts` and backend endpoint `POST /api/billing/google-play/verify`.
> * **Current Activation State:** INACTIVE. Real-money digital purchases are disabled until products are registered in Google Play Console. No non-functional or fake purchase buttons are displayed.
> * **Free Token Economy Active:** Players continue to earn tokens and stars through gameplay, complete levels, and unlock content legitimately.

---

## 6. Privacy Policy Requirement

Google Play requires a valid, publicly accessible HTTPS Privacy Policy URL.

- **Developer Action Required:**
  1. Host the privacy disclosures detailed in `GOOGLE_PLAY_DATA_SAFETY_REPORT.md` on a public webpage (e.g., GitHub Pages, your personal domain, or a static page on Render).
  2. Example URL: `https://naman14b.github.io/mathblitz/privacy-policy.html`
  3. Enter this URL in Google Play Console -> **Policy and programs** -> **App content** -> **Privacy Policy**.

---

## 7. App Access Instructions (For Reviewers)

Since MathBlitz does not require account credentials to play:
- In Google Play Console -> **App access**, select:
  **"All functionality is available without special access restrictions"**
- The game is fully playable without logging in.
