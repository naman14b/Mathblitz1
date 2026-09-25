# MathBlitz — Google Play Data Safety Report

**Application Name:** MathBlitz  
**Application / Package ID:** `com.naman.mathblitz`  
**Version:** 1.0.0 (Version Code: 1)  
**Target SDK:** 36 (Android 16 / 15)  
**Date:** September 2026  

---

## Executive Summary

This document provides the exact, factual data disclosures required to complete the **Data safety** section in the Google Play Console for MathBlitz. All disclosures are derived strictly from the actual codebase inspection of the frontend React Native / Expo application, native Android plugins, and the backend FastAPI / Neon PostgreSQL service.

**Direct UPI/QR purchases have been completely removed from the Google Play build.** No financial or payment data (such as bank details, credit card numbers, or transaction reference numbers) is collected or processed by the application.

MathBlitz does **not** sell user personal data. It uses non-personalized ads, strictly limits device permissions, and minimizes server-side telemetry.

---

## 1. Summary of Data Types Collected & Shared

| Data Category | Data Type | Collected? | Shared? | Purpose | Optional / Required? | Encrypted in Transit? | Ephemeral / Stored? |
|---|---|---|---|---|---|---|---|
| **Personal Info** | Name (Player Nickname) | Yes | Yes (Leaderboards) | App functionality, Personalization | Optional (Guest default supported) | Yes (HTTPS) | Stored |
| **Personal Info** | Email address | Yes (Admin only) | No | Account management, Admin OTP login | Required for Admin only | Yes (HTTPS) | Stored (Hashed OTP pepper) |
| **Financial Info** | Payment / Financial Information | **NO** | **NO** | None (Direct UPI removed; Google Play Billing prepared for future server verification) | N/A | N/A | Not Collected |
| **App Activity** | App interactions & gameplay progress | Yes | No (Except public leaderboard rank/score) | Game progression (XP, stars, level completion, streak) | Required for core gameplay | Yes (HTTPS) | Stored |
| **App Info & Performance** | Crash logs & Diagnostics | Yes (Standard OS / AdMob) | Yes (Google AdMob) | Analytics, fraud prevention, crash diagnostics | Required | Yes (HTTPS) | Managed by Google Play Services |
| **Device or other IDs** | Device or advertising identifiers (GAID) | Yes (Via Google Mobile Ads SDK) | Yes (Google AdMob) | Advertising, fraud prevention | Required for ad serving | Yes (HTTPS) | Managed by Google Play Services |

---

## 2. Detailed Breakdown by Category

### A. Personal Information

1. **User-Provided Player Name / Nickname:**
   - **Collection:** Yes. Players may choose a display name or play with an auto-generated guest name.
   - **Sharing:** Yes (Visible to other players on public high-score leaderboards).
   - **Purpose:** App functionality, social features (Leaderboards).
   - **User Choice:** Optional. Users can change or omit their display name.
   - **Deletion:** Can be reset locally via Profile Settings ("Reset Profile").

2. **Email Address (Admin Portal Only):**
   - **Collection:** Yes, strictly for admin authentication via OTP. Regular game players are NOT required to provide an email.
   - **Sharing:** No.
   - **Purpose:** Account security and challenge question management.

### B. Financial Information

- **Status:** **NOT COLLECTED.**
- Direct UPI QR payments and manual transaction reference (UTR) verification have been removed.
- Future Google Play Billing transactions will be processed directly through Google Play's certified billing system without the app handling raw payment credentials.

### C. App Activity & Game Progression

1. **Gameplay Progress & Achievements:**
   - **Data points:** 60-Second Blitz high scores, Sudoku solved boards & times, Maths Puzzles stars, Math Boss defeated levels, Kingdom Journey 100-level progress (stars, accuracy, score, time taken, daily/weekly streaks), Tokens, and XP.
   - **Collection:** Yes. Saved locally on device (`AsyncStorage` / `SecureStore`) and synchronized idempotently with the backend (`POST /api/journey/submit-level`).
   - **Sharing:** Public leaderboard rank and high score are visible to other players; individual level attempts are private.
   - **Purpose:** Core game functionality and state restoration.

### D. Device or Other Identifiers

1. **Google Advertising ID (GAID):**
   - **SDK:** `react-native-google-mobile-ads` (Google Mobile Ads SDK).
   - **Usage:** AdMob uses the Google Play advertising identifier for ad delivery, reporting, and frequency capping.
   - **Configuration:** The application explicitly configures `requestNonPersonalizedAdsOnly: true` on all ad requests (Banner, Interstitial, and Rewarded) to respect user privacy and minimize profiling.

---

## 3. Security Practices

- **Data Encryption in Transit:** All network communication between the MathBlitz Android client and backend services (`https://mathblitz1.onrender.com`) is strictly enforced over **HTTPS (TLS 1.2+)**. Cleartext HTTP traffic is blocked.
- **Data Encryption at Rest:** Sensitive tokens and keys use Android Keystore backed storage via `expo-secure-store`.
- **Data Deletion Mechanism:** Players can reset their local profile and cached progress at any time through the in-app Settings menu ("Reset Profile").

---

## 4. Google Play Console Form Walkthrough (Step-by-Step)

When filling out the **Data safety** form in the Play Console, select the following answers:

### Data Collection and Security
- **Does your app collect or share any of the required user data types?** -> **Yes**
- **Is all of the user data collected by your app encrypted in transit?** -> **Yes**
- **Do you provide a way for users to request that their data be deleted?** -> **Yes**

### Data Types Declaration

1. **Personal info -> Name:**
   - Collected? **Yes**
   - Shared? **Yes** (Leaderboard display name)
   - Is this data processed ephemerally? **No**
   - Is this data required or optional? **Optional**
   - Why is this data collected? **App functionality, Personalization**

2. **Financial info -> Any financial data:**
   - Collected? **No**

3. **App activity -> App interactions:**
   - Collected? **Yes**
   - Shared? **No**
   - Is this data processed ephemerally? **No**
   - Is this data required or optional? **Required**
   - Why is this data collected? **App functionality (saving game progress, stars, XP, levels)**

4. **Device or other IDs -> Device or other IDs:**
   - Collected? **Yes**
   - Shared? **Yes** (Shared with Google AdMob)
   - Is this data processed ephemerally? **No**
   - Is this data required or optional? **Required**
   - Why is this data collected? **Advertising or marketing, Fraud prevention, security, and compliance**
