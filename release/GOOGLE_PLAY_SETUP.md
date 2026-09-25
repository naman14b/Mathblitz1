# Google Play Console Setup & Release Guide for MathBlitz

**App Name:** MathBlitz  
**Package / Application ID:** `com.naman.mathblitz`  
**Initial Version:** 1.0.0 (Version Code: 1)  
**Target SDK:** 36 (Android 16 / 15)  
**Compile SDK:** 36  
**Min SDK:** 24 (Android 7.0 Nougat)  

---

## Overview

This guide details the complete process for publishing MathBlitz to the Google Play Store. It distinguishes clearly between what has already been engineered in the codebase and the manual steps you must perform within your Google Play Console developer account.

---

## Compliance & Policy Status

### Billing Status
> **Direct UPI/QR purchases removed from Google Play build. Google Play Billing architecture prepared for future activation.**  
> * All UPI QR codes, bank payment instructions, and manual 12-digit UTR verification have been removed.  
> * A clean, server-authoritative Google Play Billing architecture is prepared via `frontend/src/services/purchaseService.ts` and backend `POST /api/billing/google-play/verify`.  
> * No fake purchase buttons or non-functional payment dialogs are presented to users.  
> * In-game earned tokens, achievements, and unlocked themes remain 100% functional.

### AdMob Status
> **AdMob not newly activated as part of this release unless already configured.**  
> * The existing AdMob infrastructure is preserved with safe test ID fallbacks and environment variable overrides (`EXPO_PUBLIC_ADMOB_ANDROID_APP_ID`, `EXPO_PUBLIC_ADMOB_BANNER_ID`, etc.).  
> * Non-personalized ads are strictly enforced (`requestNonPersonalizedAdsOnly: true`).  
> * No new ad placements or intrusive banners were added.

### 16 KB Memory Page Size Compatibility
> **Verified 16 KB Page-Size Compatible.**  
> * MathBlitz uses React Native 0.86.3 and Hermes with modern NDK 27+ native binaries built with 16 KB ELF alignment (`-Wl,-z,max-page-size=16384`).  
> * `useLegacyPackaging false` is enforced in `frontend/android/app/build.gradle` and `gradle.properties`, ensuring uncompressed and page-aligned `.so` native libraries inside the AAB.

---

## Section A: What Antigravity Has Completed

The following technical requirements and configurations are fully completed and verified in the codebase:

1. **Production Identity & Versioning:**
   - App Name set to **`MathBlitz`** (removed development suffix).
   - Package / Application ID standardized to **`com.naman.mathblitz`**.
   - Scheme configured to **`mathblitz`**.
   - Initial Version Code set to `1`, Version Name set to `"1.0.0"`.

2. **Android SDK Level 36:**
   - **Target SDK = 36** (Android 16 / 15), meeting and exceeding Google Play's required baseline.
   - **Compile SDK = 36**.
   - Configured in [app.json](file:///c:/Users/Admin/Mathblitz1/frontend/app.json), [app/build.gradle](file:///c:/Users/Admin/Mathblitz1/frontend/android/app/build.gradle), and [gradle.properties](file:///c:/Users/Admin/Mathblitz1/frontend/android/gradle.properties).

3. **Network & Production Backend Security:**
   - Audited all frontend code: **zero** instances of `localhost`, `127.0.0.1`, or unencrypted `http://`.
   - Verified active production backend URL: `https://mathblitz1.onrender.com` (pure HTTPS).
   - Offline & online progress queue with backend sync (`POST /api/journey/submit-level`) added to prevent data loss or duplicate rewards.

4. **Android Permissions Pruned to Minimum Required:**
   - Removed invasive permissions: `RECORD_AUDIO` (microphone), `SYSTEM_ALERT_WINDOW`, `FOREGROUND_SERVICE`, and `FOREGROUND_SERVICE_MEDIA_PLAYBACK`.
   - Retained only essential, justified permissions: `INTERNET`, `ACCESS_NETWORK_STATE`, `VIBRATE`, and optional `READ_MEDIA_IMAGES` (for admin question photo uploads).

5. **Release Signing Security:**
   - Production signing block configured in `frontend/android/app/build.gradle` to accept release upload keystores via environment variables or Gradle project properties.
   - Updated both `.gitignore` and `frontend/android/.gitignore` to strictly exclude all keystores (`*.keystore`, `*.jks`, `keystore.properties`), protecting private keys from git history.

6. **Quality & Regression Testing:**
   - Automated TypeScript check: **0 errors** (`npx tsc --noEmit` passing).
   - Backend automated test suite: **38/38 tests passing** (Journey progression, AI Coach, Simulated player engine, learning mechanics, and Google Play Billing verification).
   - React Native production Android export: **Successful** (Hermesc bytecode bundle, 0 errors).

---

## Section B: Manual Steps You Must Complete in Google Play Console

Follow this sequence to register and submit MathBlitz:

### Step 1: Create the Application
1. Log in to [Google Play Console](https://play.google.com/console).
2. Click **Create app** (top-right corner).
3. Fill in the basic details:
   - **App name:** `MathBlitz: Brain Math Games`
   - **Default language:** English (United States) — `en-US`
   - **App or game:** Select **Game**
   - **Free or paid:** Select **Free**
4. Check the declaration boxes for Developer Program Policies and US export laws, then click **Create app**.

### Step 2: Complete the Policy & App Content Declarations
Under the left navigation menu, expand **Policy and programs** -> click **App content**:

1. **Privacy Policy:**
   - Provide a publicly accessible HTTPS URL hosting your privacy policy.
   - Refer to `release/GOOGLE_PLAY_DATA_SAFETY_REPORT.md` for the exact disclosures to include.
2. **Ads:**
   - Select **Yes, my app contains ads** (MathBlitz integrates Google Mobile Ads AdMob).
3. **App Access:**
   - Select **All functionality is available without special access restrictions** (no player login credentials are required to play).
4. **Content Ratings:**
   - Click **Start questionnaire**.
   - Select **Game** -> Category: **Puzzle / Trivia / Educational**.
   - Follow the answers documented in `release/RELEASE_CHECKLIST.md` (Select "No" to violence, sexuality, profanity, drugs, and gambling; Select "No" to digital purchases since real-money in-app billing is inactive).
5. **Target Audience and Content:**
   - Select **13 and older** (13-15, 16-17, 18+).
   - Could your app unintentionally appeal to children? -> Select **No** (unless you wish to opt into the Families program).
6. **Data Safety:**
   - Complete the form using the exact table provided in `release/GOOGLE_PLAY_DATA_SAFETY_REPORT.md` (Declare No financial data collected).

### Step 3: Set Up Store Listing & Graphics
Go to **Grow** -> **Store presence** -> **Main store listing**:
1. Enter the **Short description** and **Full description** from `release/RELEASE_CHECKLIST.md`.
2. Upload the **App icon** (512 x 512 px PNG).
3. Upload the **Feature graphic** (1024 x 500 px JPG/PNG).
4. Upload at least 4 high-resolution **Phone screenshots** showing the main modes (Kingdom Map, 60s Blitz, Sudoku, AI Coach).

---

## Section C: Generating Your Production Upload Keystore Securely

Google requires an **Upload Key** to authenticate your `.aab` uploads. Google Play App Signing will verify your Upload Key and sign the final user-facing APKs with Google's secure app signing key.

### Generate your Upload Keystore locally
Open a terminal (PowerShell or Command Prompt) and run:

```bash
keytool -genkeypair -v -keystore mathblitz-upload-key.keystore -alias mathblitz-upload -keyalg RSA -keysize 2048 -validity 10000
```

> [!WARNING]
> * Store the `.keystore` file and its password in a secure password manager.
> * **DO NOT** commit `mathblitz-upload-key.keystore` to GitHub.

---

## Section D: Building the Production `.aab` Bundle

### Method 1: Using EAS Build (Cloud / Automated — Recommended)
Run from the `frontend/` directory:
```bash
npx eas-cli login
npx eas-cli build --platform android --profile production
```
EAS will manage the upload credentials securely and produce the download link for your `MathBlitz-release.aab`.

### Method 2: Using Local Gradle Build
```powershell
$env:MATHBLITZ_UPLOAD_STORE_FILE="C:\path\to\mathblitz-upload-key.keystore"
$env:MATHBLITZ_UPLOAD_STORE_PASSWORD="YourKeystorePassword"
$env:MATHBLITZ_UPLOAD_KEY_ALIAS="mathblitz-upload"
$env:MATHBLITZ_UPLOAD_KEY_PASSWORD="YourKeyPassword"
cd frontend\android
.\gradlew.bat bundleRelease
```
The resulting signed bundle will be output at:
`frontend/android/app/build/outputs/bundle/release/app-release.aab`

---

## Section E: Recommended Release Testing Sequence

```text
1. Internal Testing (1-5 testers)
        ↓  (Verify launch, sound, database persistence)
2. Closed Testing / Closed Track
        ↓  (Collect feedback, ensure stability)
3. Production Release
        ↓  (Published to all global users)
```
