// src/screens/SplashDiagnosticsScreen.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, Share, ActivityIndicator, StatusBar,
} from 'react-native';
import { NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import SplashDiag, { SplashDiagnosticsReport, SplashStep } from '../services/SplashDiagnosticsService';
import { Colors } from '../theme/colors';
import Icon from 'react-native-vector-icons/Ionicons';

type Props = { navigation: NavigationProp<RootStackParamList> };

const STATUS_COLOR: Record<SplashStep['status'], string> = {
  start: '#888',
  ok: '#4CAF50',
  timeout: '#FF9800',
  error: '#F44336',
  info: '#2196F3',
};

const STATUS_ICON: Record<SplashStep['status'], string> = {
  start: '▶',
  ok: '✓',
  timeout: '⏱',
  error: '✗',
  info: 'ℹ',
};

export default function SplashDiagnosticsScreen({ navigation }: Props) {
  const [reports, setReports] = useState<SplashDiagnosticsReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await SplashDiag.getAllReports();
    // Newest first
    setReports([...data].reverse());
    setLoading(false);
    // Auto-expand latest
    if (data.length > 0) setExpandedIdx(0);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleShare = async () => {
    const text = await SplashDiag.getAllSummaryText();
    await Share.share({ message: text, title: 'Splash Diagnostics' });
  };

  const handleClear = () => {
    Alert.alert('Clear Logs', 'Saare splash logs delete ho jayenge. Sure ho?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await SplashDiag.clearAllReports();
          setReports([]);
        }
      },
    ]);
  };

  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'medium' });
    } catch { return iso; }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primaryDark} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Splash Diagnostics</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleShare} style={styles.iconBtn}>
            <Icon name="share-outline" size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleClear} style={styles.iconBtn}>
            <Icon name="trash-outline" size={22} color="#FF6B6B" />
          </TouchableOpacity>
        </View>
      </View>

      {reports.length === 0 ? (
        <View style={styles.center}>
          <Icon name="checkmark-circle-outline" size={60} color="#4CAF50" />
          <Text style={styles.emptyText}>Koi log nahi mila.</Text>
          <Text style={styles.emptySubText}>App open karo — pehla log yahan dikhega.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.countText}>{reports.length} launch record(s) — newest first</Text>

          {reports.map((r, idx) => {
            const isExpanded = expandedIdx === idx;
            const hangColor = r.hangDetected ? '#FF9800' : '#4CAF50';

            return (
              <View key={r.sessionId} style={styles.card}>
                {/* Card Header */}
                <TouchableOpacity
                  style={styles.cardHeader}
                  onPress={() => setExpandedIdx(isExpanded ? null : idx)}
                  activeOpacity={0.8}
                >
                  <View style={styles.cardHeaderLeft}>
                    <View style={[styles.hangBadge, { backgroundColor: hangColor }]}>
                      <Text style={styles.hangBadgeText}>
                        {r.hangDetected ? '⚠ HANG' : '✓ OK'}
                      </Text>
                    </View>
                    <View style={{ marginLeft: 10 }}>
                      <Text style={styles.cardTime}>{formatTime(r.launchTime)}</Text>
                      <Text style={styles.cardScreen}>→ {r.resolvedScreen ?? 'unknown'}</Text>
                    </View>
                  </View>
                  <View style={styles.cardHeaderRight}>
                    <Text style={styles.cardDuration}>{r.totalDurationMs}ms</Text>
                    <Icon
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={18} color="#aaa"
                    />
                  </View>
                </TouchableOpacity>

                {/* Hang detail */}
                {r.hangDetected && r.hangStep && (
                  <View style={styles.hangDetail}>
                    <Text style={styles.hangDetailText}>
                      ⚠ Hang step: <Text style={{ fontWeight: 'bold' }}>{r.hangStep}</Text>
                    </Text>
                  </View>
                )}

                {/* Steps */}
                {isExpanded && (
                  <View style={styles.stepsContainer}>
                    {r.steps.map((s, si) => (
                      <View key={si} style={styles.stepRow}>
                        <Text style={[styles.stepIcon, { color: STATUS_COLOR[s.status] }]}>
                          {STATUS_ICON[s.status]}
                        </Text>
                        <View style={styles.stepContent}>
                          <Text style={styles.stepName}>
                            {s.step}
                            {s.durationMs != null && (
                              <Text style={styles.stepDuration}> ({s.durationMs}ms)</Text>
                            )}
                          </Text>
                          {s.detail ? (
                            <Text style={[styles.stepDetail, { color: STATUS_COLOR[s.status] }]}>
                              {s.detail}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.primaryDark,
    paddingTop: 48, paddingBottom: 14, paddingHorizontal: 16,
  },
  backBtn: { padding: 4, marginRight: 8 },
  headerTitle: { flex: 1, color: '#fff', fontSize: 18, fontWeight: '700' },
  headerActions: { flexDirection: 'row', gap: 8 },
  iconBtn: { padding: 6 },
  scroll: { padding: 14, paddingBottom: 40 },
  countText: { color: '#666', fontSize: 12, marginBottom: 10 },
  emptyText: { color: '#fff', fontSize: 18, fontWeight: '600', marginTop: 16 },
  emptySubText: { color: '#888', fontSize: 13, marginTop: 6, textAlign: 'center' },

  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center' },
  cardHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hangBadge: {
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
  },
  hangBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  cardTime: { color: '#ddd', fontSize: 13, fontWeight: '600' },
  cardScreen: { color: '#888', fontSize: 12, marginTop: 2 },
  cardDuration: { color: '#aaa', fontSize: 12 },

  hangDetail: {
    backgroundColor: '#2a1a00',
    paddingHorizontal: 14, paddingVertical: 8,
    borderTopWidth: 1, borderTopColor: '#3a2a00',
  },
  hangDetailText: { color: '#FF9800', fontSize: 13 },

  stepsContainer: {
    borderTopWidth: 1, borderTopColor: '#2a2a2a',
    paddingHorizontal: 14, paddingVertical: 10,
  },
  stepRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    marginBottom: 8,
  },
  stepIcon: { fontSize: 14, width: 20, marginTop: 1 },
  stepContent: { flex: 1 },
  stepName: { color: '#ddd', fontSize: 13 },
  stepDuration: { color: '#888', fontSize: 12 },
  stepDetail: { fontSize: 12, marginTop: 2 },
});
