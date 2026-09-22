import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { leaderboardApi } from "@/src/api/admin";
import { LeaderboardRow, LeaderboardTimeframe } from "@/src/api/types";
import { AGE_GROUPS, LocalProfile } from "@/src/game/types";
import { makeStyles, useTheme } from "@/src/theme";

const TIMEFRAMES: { id: LeaderboardTimeframe; label: string; icon: string }[] = [
  { id: "daily", label: "Today", icon: "today-outline" },
  { id: "weekly", label: "This Week", icon: "calendar-outline" },
  { id: "all-time", label: "All-Time", icon: "trophy-outline" },
];

const AGE_FILTER_OPTIONS = [
  { id: "all", label: "Everyone" },
  ...AGE_GROUPS.map((g) => ({ id: g.id, label: g.label })),
];

const MEDALS = ["🥇", "🥈", "🥉"];

type LeaderboardsProps = {
  profile: LocalProfile;
  onBack: () => void;
};

export function Leaderboards({ profile, onBack }: LeaderboardsProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useStyles();

  const [timeframe, setTimeframe] = useState<LeaderboardTimeframe>("daily");
  const [ageGroup, setAgeGroup] = useState<string>("all");
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    leaderboardApi
      .fetch(timeframe, ageGroup)
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load scores. Check your connection.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [timeframe, ageGroup]);

  const myEntry = rows.find(
    (r) => r.username.toLowerCase() === (profile.playerName ?? "").toLowerCase()
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Back">
          <Ionicons name="arrow-back" size={22} color={colors.onSurface} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title}>Leaderboards</Text>
          <Text style={styles.subtitle}>
            {profile.playerName ? `Playing as ${profile.playerName}` : "Set a name to compete"}
          </Text>
        </View>
        <View style={styles.trophyBadge}>
          <Ionicons name="trophy" size={20} color={colors.onBrandPrimary} />
        </View>
      </View>

      {/* ── Timeframe tabs ── */}
      <View style={styles.tabs}>
        {TIMEFRAMES.map((tf) => {
          const active = tf.id === timeframe;
          return (
            <Pressable key={tf.id} onPress={() => setTimeframe(tf.id)} style={[styles.tab, active && styles.tabActive]}>
              <Ionicons name={tf.icon as any} size={14} color={active ? colors.onBrandPrimary : colors.muted} />
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{tf.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* ── Age-group filter ── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.ageScroll} contentContainerStyle={styles.ageScrollContent}>
        {AGE_FILTER_OPTIONS.map((opt) => {
          const active = opt.id === ageGroup;
          return (
            <Pressable key={opt.id} onPress={() => setAgeGroup(opt.id)} style={[styles.agePill, active && styles.agePillActive]}>
              <Text style={[styles.agePillText, active && styles.agePillTextActive]}>{opt.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* ── My rank banner ── */}
      {myEntry && (
        <View style={styles.myRankBanner}>
          <Ionicons name="person-circle-outline" size={20} color={colors.brandPrimary} />
          <Text style={styles.myRankText}>
            You are ranked <Text style={styles.myRankHighlight}>#{myEntry.rank}</Text> with{" "}
            <Text style={styles.myRankHighlight}>{myEntry.score} pts</Text>
          </Text>
        </View>
      )}

      {/* ── List ── */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.brandPrimary} />
          <Text style={styles.loadingText}>Fetching scores…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={40} color={colors.muted} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : rows.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="stats-chart-outline" size={44} color={colors.muted} />
          <Text style={styles.emptyTitle}>No scores yet</Text>
          <Text style={styles.emptySubtitle}>Play a game to be the first on the board!</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
          {rows.map((row) => {
            const isMe = row.username.toLowerCase() === (profile.playerName ?? "").toLowerCase();
            const medal = MEDALS[row.rank - 1];
            return (
              <View key={`${row.username}-${row.rank}-${row.played_at}`} style={[styles.row, isMe && styles.rowHighlighted]}>
                <View style={styles.rankCell}>
                  {medal ? (
                    <Text style={styles.medal}>{medal}</Text>
                  ) : (
                    <Text style={[styles.rankNum, row.rank <= 10 && styles.rankNumTop]}>{row.rank}</Text>
                  )}
                </View>
                <View style={styles.playerInfo}>
                  <Text style={[styles.username, isMe && styles.usernameMe]} numberOfLines={1}>
                    {row.username}{isMe ? " (You)" : ""}
                  </Text>
                  <Text style={styles.ageGroupTag}>{row.age_group} years</Text>
                </View>
                <Text style={[styles.score, row.rank <= 3 && styles.scoreTop]}>{row.score}</Text>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: "transparent" },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingVertical: 14 },
  backButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.surfaceSecondary, alignItems: "center", justifyContent: "center" },
  headerText: { flex: 1, gap: 2 },
  title: { color: colors.onSurface, fontSize: 24, fontWeight: "900" },
  subtitle: { color: colors.muted, fontSize: 12, fontWeight: "600" },
  trophyBadge: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" },
  tabs: { flexDirection: "row", marginHorizontal: 20, backgroundColor: colors.surfaceSecondary, borderRadius: 16, padding: 4, gap: 4 },
  tab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 10, borderRadius: 13 },
  tabActive: { backgroundColor: colors.brandPrimary },
  tabText: { color: colors.muted, fontSize: 12, fontWeight: "800" },
  tabTextActive: { color: colors.onBrandPrimary },
  ageScroll: { marginTop: 12, flexGrow: 0 },
  ageScrollContent: { paddingHorizontal: 20, gap: 8 },
  agePill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99, backgroundColor: colors.surfaceSecondary },
  agePillActive: { backgroundColor: colors.brandPrimary },
  agePillText: { color: colors.muted, fontSize: 12, fontWeight: "800" },
  agePillTextActive: { color: colors.onBrandPrimary },
  myRankBanner: {
    flexDirection: "row", alignItems: "center", gap: 9,
    marginHorizontal: 20, marginTop: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    borderRadius: 16, backgroundColor: colors.surfaceSecondary,
    borderWidth: 1.5, borderColor: colors.brandPrimary,
  },
  myRankText: { color: colors.onSurface, fontSize: 13, fontWeight: "700" },
  myRankHighlight: { color: colors.brandPrimary, fontWeight: "900" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 40 },
  loadingText: { color: colors.muted, fontSize: 14, fontWeight: "700" },
  errorText: { color: colors.muted, fontSize: 14, fontWeight: "700", textAlign: "center" },
  emptyTitle: { color: colors.onSurface, fontSize: 18, fontWeight: "900", textAlign: "center" },
  emptySubtitle: { color: colors.muted, fontSize: 13, fontWeight: "600", textAlign: "center", lineHeight: 20 },
  listContent: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 95, gap: 8 },
  row: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    borderRadius: 18, backgroundColor: colors.surfaceSecondary,
  },
  rowHighlighted: { backgroundColor: colors.brandPrimary + "18", borderWidth: 1.5, borderColor: colors.brandPrimary },
  rankCell: { width: 38, alignItems: "center" },
  medal: { fontSize: 24 },
  rankNum: { color: colors.muted, fontSize: 16, fontWeight: "900" },
  rankNumTop: { color: colors.onSurface },
  playerInfo: { flex: 1, gap: 3 },
  username: { color: colors.onSurface, fontSize: 15, fontWeight: "800" },
  usernameMe: { color: colors.brandPrimary },
  ageGroupTag: { color: colors.muted, fontSize: 11, fontWeight: "700" },
  score: { color: colors.onSurface, fontSize: 18, fontWeight: "900" },
  scoreTop: { color: colors.brandPrimary, fontSize: 20 },
}));
