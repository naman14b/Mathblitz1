/**
 * CoachDebugModal Component
 * Internal developer/diagnostic modal for inspecting the adaptive learning engine state.
 */
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { aiCoachApi } from "../api/aiCoach";
import { makeStyles, useTheme } from "../theme";

type CoachDebugModalProps = {
  visible: boolean;
  playerId: string;
  onClose: () => void;
};

export function CoachDebugModal({ visible, playerId, onClose }: CoachDebugModalProps) {
  const { colors, isNight } = useTheme();
  const styles = useStyles();
  const [debugData, setDebugData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && playerId) {
      setLoading(true);
      aiCoachApi
        .getDebugState(playerId)
        .then((data) => setDebugData(data))
        .catch(() => setDebugData(null))
        .finally(() => setLoading(false));
    }
  }, [visible, playerId]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.container, isNight ? styles.containerNight : styles.containerDay]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="bug" size={20} color="#FF6B00" />
              <Text style={styles.title}>AI Coach Diagnostics</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={colors.onSurface} />
            </Pressable>
          </View>

          {loading ? (
            <Text style={styles.loadingText}>Loading learning engine telemetry...</Text>
          ) : debugData ? (
            <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
              {/* Summary */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Profile Summary</Text>
                <Text style={styles.itemText}>Player ID: {debugData.player_id}</Text>
                <Text style={styles.itemText}>Total Attempts: {debugData.total_attempts}</Text>
                <Text style={styles.itemText}>Overall Accuracy: {debugData.overall_accuracy}%</Text>
              </View>

              {/* Topic Metrics & Mastery States */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Concept Metrics & Mastery States</Text>
                {Object.entries(debugData.topic_metrics || {}).length === 0 ? (
                  <Text style={styles.emptyText}>No concept metrics recorded yet.</Text>
                ) : (
                  Object.entries(debugData.topic_metrics || {}).map(([cid, m]: [string, any]) => (
                    <View key={cid} style={styles.metricCard}>
                      <View style={styles.metricRow}>
                        <Text style={styles.conceptName}>{m.concept_name || cid}</Text>
                        <View style={[styles.statePill, m.mastery_state === "regressing" && styles.stateRegressing]}>
                          <Text style={styles.stateText}>{m.mastery_state || "learning"}</Text>
                        </View>
                      </View>
                      <Text style={styles.itemSub}>
                        Mastery: {Math.round(m.mastery_score || 0)}% · Conf: {Math.round((m.confidence || 0) * 100)}% ({m.confidence_level || "Low"})
                      </Text>
                      <Text style={styles.itemSub}>
                        Accuracy: {m.accuracy}% (Recent: {m.recent_accuracy}%) · Trend: {m.trend}
                      </Text>
                      {m.primary_error && (
                        <Text style={styles.errorSub}>Primary Error: {m.primary_error}</Text>
                      )}
                    </View>
                  ))
                )}
              </View>

              {/* Weaknesses & Root Causes */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Active Weaknesses & Root Causes</Text>
                {(debugData.weak_areas || []).length === 0 ? (
                  <Text style={styles.emptyText}>No active weaknesses detected.</Text>
                ) : (
                  (debugData.weak_areas || []).map((w: any, idx: number) => (
                    <View key={idx} style={styles.weaknessCard}>
                      <Text style={styles.conceptName}>{w.concept_name}</Text>
                      <Text style={styles.itemSub}>
                        Severity: {w.severity.toUpperCase()} {w.is_regression ? "· (REGRESSION)" : ""}
                      </Text>
                      <Text style={styles.itemSub}>
                        Target Objective: {w.target_learning_concept_name || w.concept_name}
                      </Text>
                      {w.is_prerequisite_gap && (
                        <Text style={styles.prereqText}>⚡ Prerequisite foundational gap identified</Text>
                      )}
                      {w.evidence_summary && (
                        <Text style={styles.evidenceText}>Evidence: {w.evidence_summary}</Text>
                      )}
                    </View>
                  ))
                )}
              </View>

              {/* Recent Interventions */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Recent Coaching Interventions</Text>
                {(debugData.recent_interventions || []).length === 0 ? (
                  <Text style={styles.emptyText}>No completed interventions recorded yet.</Text>
                ) : (
                  (debugData.recent_interventions || []).map((i: any, idx: number) => (
                    <View key={idx} style={styles.interventionCard}>
                      <Text style={styles.conceptName}>
                        {i.target_learning_concept_id} ({i.observed_improvement || "in_progress"})
                      </Text>
                      <Text style={styles.itemSub}>
                        Mastery: {Math.round(i.mastery_before)}% → {Math.round(i.mastery_after)}% (Δ {i.mastery_delta >= 0 ? `+${i.mastery_delta}` : i.mastery_delta}%)
                      </Text>
                    </View>
                  ))
                )}
              </View>
            </ScrollView>
          ) : (
            <Text style={styles.emptyText}>Could not retrieve diagnostic telemetry.</Text>
          )}
        </View>
      </View>
    </Modal>
  );
}

const useStyles = makeStyles((colors) => ({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "flex-end",
  },
  container: {
    maxHeight: "85%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    borderTopWidth: 1.5,
  },
  containerNight: {
    backgroundColor: "#111424",
    borderColor: "rgba(255, 107, 0, 0.4)",
  },
  containerDay: {
    backgroundColor: "#FFFFFF",
    borderColor: "rgba(255, 107, 0, 0.3)",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.onSurface,
  },
  closeBtn: {
    padding: 4,
  },
  loadingText: {
    fontSize: 14,
    color: colors.muted,
    textAlign: "center",
    paddingVertical: 30,
  },
  scrollBody: {
    marginBottom: 10,
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FF6B00",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  itemText: {
    fontSize: 13,
    color: colors.onSurface,
    marginBottom: 3,
  },
  itemSub: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  errorSub: {
    fontSize: 11.5,
    color: "#EF4444",
    marginTop: 2,
    fontWeight: "600",
  },
  metricCard: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    padding: 10,
    borderRadius: 12,
    marginBottom: 6,
  },
  metricRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  conceptName: {
    fontSize: 13.5,
    fontWeight: "700",
    color: colors.onSurface,
  },
  statePill: {
    backgroundColor: "rgba(59, 130, 246, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  stateRegressing: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
  },
  stateText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.onSurface,
    textTransform: "uppercase",
  },
  weaknessCard: {
    backgroundColor: "rgba(255, 107, 0, 0.08)",
    padding: 10,
    borderRadius: 12,
    marginBottom: 6,
  },
  prereqText: {
    fontSize: 11.5,
    color: "#F59E0B",
    fontWeight: "700",
    marginTop: 3,
  },
  evidenceText: {
    fontSize: 11.5,
    color: colors.muted,
    fontStyle: "italic",
    marginTop: 3,
  },
  interventionCard: {
    backgroundColor: "rgba(34, 197, 94, 0.08)",
    padding: 10,
    borderRadius: 12,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    color: colors.muted,
    fontStyle: "italic",
  },
}));
