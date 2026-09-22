import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from "react-native-reanimated";
import {
  ACHIEVEMENTS,
  Achievement,
  AchievementId,
  LocalProfile,
  PREMIUM_BADGES,
  PremiumBadge,
  PremiumBadgeId,
} from "@/src/game/types";
import { makeStyles, useTheme } from "@/src/theme";

const BADGE_SHEET = require("@/assets/badges/achievement_badges_sheet.jpg");
const PREMIUM_SHEET = require("@/assets/badges/premium_badges_sheet.jpg");
const PAYMENT_QR = require("@/assets/images/payment_qr.jpg");

function UnlockedBadgeIcon({ emoji }: { emoji: string }) {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withSequence(
        withTiming(4, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
        withTiming(-4, { duration: 1200, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Text style={{ fontSize: 36 }}>{emoji}</Text>
    </Animated.View>
  );
}

type AchievementsProps = {
  profile: LocalProfile;
  onBack: () => void;
  onEquipAchievementBadge: (id: AchievementId | null) => void;
  onEquipPremiumBadge: (id: PremiumBadgeId | null) => void;
  onToggleEquipBadge?: (id: string) => Promise<boolean> | void;
  onPurchasePremiumBadge: (id: PremiumBadgeId, utr?: string) => void;
};

type Tab = "achievements" | "premium";

export function Achievements({
  profile,
  onBack,
  onEquipAchievementBadge,
  onEquipPremiumBadge,
  onToggleEquipBadge,
  onPurchasePremiumBadge,
}: AchievementsProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useStyles();
  const [tab, setTab] = useState<Tab>("achievements");
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
  const [selectedPremium, setSelectedPremium] = useState<PremiumBadge | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [pendingBadge, setPendingBadge] = useState<PremiumBadgeId | null>(null);
  const [utr, setUtr] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [utrError, setUtrError] = useState("");

  const earned = profile.earnedAchievements ?? {};
  const earnedCount = Object.keys(earned).length;
  const equippedBadges = profile.equippedBadges ?? (profile.equippedAchievementBadge ? [profile.equippedAchievementBadge] : []);

  const handleEquipToggle = (id: string) => {
    const isEquipped = equippedBadges.includes(id);
    if (!isEquipped && equippedBadges.length >= 2) {
      Alert.alert(
        "Badge Limit Reached",
        "You can only equip up to 2 badges at a time. Please unequip one badge first."
      );
      return;
    }
    if (onToggleEquipBadge) {
      onToggleEquipBadge(id);
    }
  };

  const handleBuyPremium = (badge: PremiumBadge) => {
    setPendingBadge(badge.id);
    setSelectedPremium(null);
    setUtr("");
    setUtrError("");
    setShowQR(true);
  };

  const handleVerifyPayment = () => {
    const cleanUtr = utr.trim();
    if (!/^\d{12}$/.test(cleanUtr)) {
      setUtrError("Please enter a valid 12-digit UPI reference number (UTR).");
      return;
    }
    setUtrError("");
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      if (pendingBadge) {
        onPurchasePremiumBadge(pendingBadge, cleanUtr);
        Alert.alert("Payment Verified!", "Your premium frame has been verified and unlocked.");
      }
      setShowQR(false);
      setPendingBadge(null);
      setUtr("");
    }, 1500);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backBtn} accessibilityRole="button">
          <Ionicons name="arrow-back" size={22} color={colors.onSurface} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title}>Collectibles</Text>
          <Text style={styles.subtitle}>
            {earnedCount}/{ACHIEVEMENTS.length} unlocked · Equipped: {equippedBadges.length}/2 badges
          </Text>
        </View>
        <View style={styles.badgeBadge}>
          <Text style={styles.badgeBadgeText}>🏆</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <Pressable onPress={() => setTab("achievements")} style={[styles.tab, tab === "achievements" && styles.tabActive]}>
          <Text style={[styles.tabText, tab === "achievements" && styles.tabTextActive]}>🏅 Achievements</Text>
        </Pressable>
        <Pressable onPress={() => setTab("premium")} style={[styles.tab, tab === "premium" && styles.tabActive]}>
          <Text style={[styles.tabText, tab === "premium" && styles.tabTextActive]}>💎 Premium Frames</Text>
        </Pressable>
      </View>

      {tab === "achievements" ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.grid}>
          {/* Badge sheet preview */}
          <Image source={BADGE_SHEET} style={styles.badgeSheet} resizeMode="contain" />

          {ACHIEVEMENTS.map((achievement) => {
            const isEarned = Boolean(earned[achievement.id]);
            const isEquipped = equippedBadges.includes(achievement.id);
            return (
              <Pressable
                key={achievement.id}
                onPress={() => setSelectedAchievement(achievement)}
                style={[styles.achievementCard, isEquipped && styles.cardEquipped, !isEarned && styles.cardLocked]}
              >
                {isEarned ? (
                  <UnlockedBadgeIcon emoji={achievement.emoji} />
                ) : (
                  <Text style={styles.achievementEmoji}>🔒</Text>
                )}
                <Text style={[styles.achievementTitle, !isEarned && styles.lockedText]} numberOfLines={1}>
                  {isEarned ? achievement.title : "???"}
                </Text>
                {isEquipped && (
                  <View style={styles.equippedPill}>
                    <Text style={styles.equippedPillText}>ON</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.premiumGrid}>
          <Text style={styles.sectionNote}>Exclusive avatar frames · ₹49 each · Equip next to your name</Text>
          <Image source={PREMIUM_SHEET} style={styles.premiumSheet} resizeMode="contain" />

          {PREMIUM_BADGES.map((badge) => {
            const owned = profile.purchasedPremiumBadges?.includes(badge.id);
            const isEquipped = equippedBadges.includes(badge.id);
            return (
              <Pressable
                key={badge.id}
                onPress={() => setSelectedPremium(badge)}
                style={[styles.premiumCard, { borderColor: badge.borderColor + "66" }]}
              >
                <View style={[styles.premiumGradient, { backgroundColor: badge.gradient[0] }]}>
                  <View style={[styles.premiumDot, { backgroundColor: badge.borderColor }]} />
                </View>
                <View style={styles.premiumInfo}>
                  <Text style={styles.premiumName}>{badge.name}</Text>
                  <Text style={styles.premiumDesc} numberOfLines={1}>{badge.description}</Text>
                </View>
                <View>
                  {owned ? (
                    <View style={[styles.ownedBadge, isEquipped && styles.equippedBadge]}>
                      <Text style={styles.ownedBadgeText}>{isEquipped ? "✓ ON" : "Owned"}</Text>
                    </View>
                  ) : (
                    <View style={[styles.priceBadge, { backgroundColor: badge.gradient[1] }]}>
                      <Text style={styles.priceBadgeText}>₹{badge.price}</Text>
                    </View>
                  )}
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {/* Achievement Detail Modal */}
      <Modal visible={!!selectedAchievement} transparent animationType="fade" onRequestClose={() => setSelectedAchievement(null)}>
        <Pressable style={styles.overlay} onPress={() => setSelectedAchievement(null)}>
          <Pressable style={styles.modal} onPress={(e) => e.stopPropagation()}>
            {selectedAchievement && (() => {
              const isEarned = Boolean(earned[selectedAchievement.id]);
              const isEquipped = equippedBadges.includes(selectedAchievement.id);
              return (
                <>
                  <Text style={styles.modalEmoji}>{isEarned ? selectedAchievement.emoji : "🔒"}</Text>
                  <Text style={styles.modalTitle}>{isEarned ? selectedAchievement.title : "???"}</Text>
                  <Text style={styles.modalDesc}>{isEarned ? selectedAchievement.description : selectedAchievement.hint}</Text>
                  {isEarned && (
                    <Pressable
                      style={[styles.modalBtn, isEquipped && styles.modalBtnActive]}
                      onPress={() => {
                        handleEquipToggle(selectedAchievement.id);
                        setSelectedAchievement(null);
                      }}
                    >
                      <Text style={styles.modalBtnText}>{isEquipped ? "Unequip Badge" : "Equip Badge (Max 2)"}</Text>
                    </Pressable>
                  )}
                  <Pressable style={styles.modalClose} onPress={() => setSelectedAchievement(null)}>
                    <Text style={styles.modalCloseText}>Close</Text>
                  </Pressable>
                </>
              );
            })()}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Premium Badge Modal */}
      <Modal visible={!!selectedPremium} transparent animationType="fade" onRequestClose={() => setSelectedPremium(null)}>
        <Pressable style={styles.overlay} onPress={() => setSelectedPremium(null)}>
          <Pressable style={styles.modal} onPress={(e) => e.stopPropagation()}>
            {selectedPremium && (() => {
              const owned = profile.purchasedPremiumBadges?.includes(selectedPremium.id);
              const isEquipped = equippedBadges.includes(selectedPremium.id);
              return (
                <>
                  <View style={[styles.premiumPreview, { backgroundColor: selectedPremium.gradient[0], borderColor: selectedPremium.borderColor }]}>
                    <View style={[styles.premiumDotLg, { backgroundColor: selectedPremium.borderColor }]} />
                  </View>
                  <Text style={styles.modalTitle}>{selectedPremium.name}</Text>
                  <Text style={styles.modalDesc}>{selectedPremium.description}</Text>
                  {owned ? (
                    <Pressable
                      style={[styles.modalBtn, isEquipped && styles.modalBtnActive]}
                      onPress={() => {
                        handleEquipToggle(selectedPremium.id);
                        setSelectedPremium(null);
                      }}
                    >
                      <Text style={styles.modalBtnText}>{isEquipped ? "Unequip Frame" : "Equip Frame (Max 2)"}</Text>
                    </Pressable>
                  ) : (
                    <Pressable style={[styles.modalBtn, { backgroundColor: selectedPremium.gradient[1] }]} onPress={() => handleBuyPremium(selectedPremium)}>
                      <Text style={styles.modalBtnText}>Buy for ₹{selectedPremium.price}</Text>
                    </Pressable>
                  )}
                  <Pressable style={styles.modalClose} onPress={() => setSelectedPremium(null)}>
                    <Text style={styles.modalCloseText}>Close</Text>
                  </Pressable>
                </>
              );
            })()}
          </Pressable>
        </Pressable>
      </Modal>

      {/* QR Payment Modal */}
      <Modal visible={showQR} transparent animationType="slide" onRequestClose={() => setShowQR(false)}>
        <Pressable style={styles.overlay} onPress={() => setShowQR(false)}>
          <Pressable style={styles.qrModal} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.qrTitle}>Complete Payment</Text>
            <Text style={styles.qrSubtitle}>Scan the QR code below and pay ₹49 via UPI</Text>
            <View style={styles.qrFrame}>
              <Image source={PAYMENT_QR} style={styles.qrImage} resizeMode="contain" />
            </View>
            <Text style={styles.qrNote}>Enter your 12-digit UPI reference number (UTR) to verify:</Text>
            <TextInput
              style={styles.utrInput}
              placeholder="12-digit UPI UTR / Ref No."
              placeholderTextColor={colors.muted}
              value={utr}
              onChangeText={(text) => {
                setUtr(text);
                if (utrError) setUtrError("");
              }}
              keyboardType="numeric"
              maxLength={12}
            />
            {utrError ? <Text style={styles.errorText}>{utrError}</Text> : null}
            <Pressable
              style={[styles.paidBtn, isVerifying && { opacity: 0.7 }]}
              onPress={handleVerifyPayment}
              disabled={isVerifying}
            >
              {isVerifying ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.paidBtnText}>✓ Verify & Unlock Frame</Text>
              )}
            </Pressable>
            <Pressable style={styles.modalClose} onPress={() => setShowQR(false)}>
              <Text style={styles.modalCloseText}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: "transparent" },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingVertical: 14 },
  backBtn: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.surfaceSecondary, alignItems: "center", justifyContent: "center" },
  headerText: { flex: 1, gap: 2 },
  title: { color: colors.onSurface, fontSize: 24, fontWeight: "900" },
  subtitle: { color: colors.muted, fontSize: 12, fontWeight: "600" },
  badgeBadge: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" },
  badgeBadgeText: { fontSize: 20 },
  tabs: { flexDirection: "row", marginHorizontal: 20, backgroundColor: colors.surfaceSecondary, borderRadius: 16, padding: 4, gap: 4, marginBottom: 4 },
  tab: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 13 },
  tabActive: { backgroundColor: colors.brandPrimary },
  tabText: { color: colors.muted, fontSize: 12, fontWeight: "800" },
  tabTextActive: { color: colors.onBrandPrimary },
  grid: { paddingHorizontal: 16, paddingBottom: 95, flexDirection: "row", flexWrap: "wrap" },
  badgeSheet: { width: "100%", height: 200, borderRadius: 16, marginBottom: 16 },
  achievementCard: {
    width: "46%", margin: "2%", aspectRatio: 1,
    borderRadius: 18, backgroundColor: colors.surfaceSecondary,
    alignItems: "center", justifyContent: "center", gap: 6,
    borderWidth: 1.5, borderColor: "transparent",
  },
  cardEquipped: { borderColor: colors.brandPrimary, backgroundColor: colors.brandPrimary + "18" },
  cardLocked: { opacity: 0.55 },
  achievementEmoji: { fontSize: 36 },
  achievementTitle: { color: colors.onSurface, fontSize: 11, fontWeight: "800", textAlign: "center" },
  lockedText: { color: colors.muted },
  equippedPill: { backgroundColor: colors.brandPrimary, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 2 },
  equippedPillText: { color: colors.onBrandPrimary, fontSize: 9, fontWeight: "900" },
  // Premium
  premiumGrid: { paddingHorizontal: 16, paddingBottom: 95, gap: 10 },
  sectionNote: { color: colors.muted, fontSize: 12, fontWeight: "600", textAlign: "center", marginBottom: 4 },
  premiumSheet: { width: "100%", height: 220, borderRadius: 16, marginBottom: 8 },
  premiumCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    padding: 14, borderRadius: 18, backgroundColor: colors.surfaceSecondary,
    borderWidth: 1.5,
  },
  premiumGradient: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  premiumDot: { width: 20, height: 20, borderRadius: 10 },
  premiumInfo: { flex: 1 },
  premiumName: { color: colors.onSurface, fontSize: 15, fontWeight: "900" },
  premiumDesc: { color: colors.muted, fontSize: 11, fontWeight: "600", marginTop: 2 },
  ownedBadge: { backgroundColor: colors.surfaceTertiary, borderRadius: 99, paddingHorizontal: 10, paddingVertical: 5 },
  equippedBadge: { backgroundColor: colors.brandPrimary },
  ownedBadgeText: { color: colors.onSurface, fontSize: 11, fontWeight: "900" },
  priceBadge: { borderRadius: 99, paddingHorizontal: 10, paddingVertical: 5 },
  priceBadgeText: { color: "#FFFFFF", fontSize: 12, fontWeight: "900" },
  // Modals
  overlay: { flex: 1, backgroundColor: "#00000088", alignItems: "center", justifyContent: "center", padding: 24 },
  modal: {
    width: "100%", backgroundColor: colors.surface,
    borderRadius: 28, padding: 28, alignItems: "center", gap: 12,
  },
  modalEmoji: { fontSize: 60 },
  modalTitle: { color: colors.onSurface, fontSize: 22, fontWeight: "900", textAlign: "center" },
  modalDesc: { color: colors.muted, fontSize: 14, fontWeight: "600", textAlign: "center", lineHeight: 20 },
  modalBtn: {
    width: "100%", paddingVertical: 15, borderRadius: 16,
    backgroundColor: colors.brandPrimary, alignItems: "center", marginTop: 8,
  },
  modalBtnActive: { backgroundColor: colors.success },
  modalBtnText: { color: colors.onBrandPrimary, fontSize: 16, fontWeight: "900" },
  modalClose: { paddingVertical: 10 },
  modalCloseText: { color: colors.muted, fontSize: 14, fontWeight: "700" },
  premiumPreview: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", borderWidth: 3, marginBottom: 4 },
  premiumDotLg: { width: 32, height: 32, borderRadius: 16 },
  // QR modal
  qrModal: { width: "100%", backgroundColor: colors.surface, borderRadius: 28, padding: 24, alignItems: "center", gap: 14 },
  qrTitle: { color: colors.onSurface, fontSize: 22, fontWeight: "900" },
  qrSubtitle: { color: colors.muted, fontSize: 13, fontWeight: "600", textAlign: "center" },
  qrFrame: { width: 220, height: 290, borderRadius: 16, overflow: "hidden", backgroundColor: "#FFFFFF" },
  qrImage: { width: 220, height: 290 },
  qrNote: { color: colors.muted, fontSize: 12, fontWeight: "600", textAlign: "center" },
  paidBtn: {
    width: "100%", paddingVertical: 15, borderRadius: 16,
    backgroundColor: "#16A34A", alignItems: "center",
  },
  paidBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "900" },
  utrInput: {
    width: "100%",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.divider,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: "700",
    color: colors.onSurface,
    textAlign: "center",
    letterSpacing: 1.5,
  },
  errorText: {
    color: colors.error || "#EF4444",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
}));
