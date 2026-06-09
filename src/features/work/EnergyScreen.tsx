import React, { useMemo } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { BackButton } from '@/components/ListUI';
import { useTheme } from '@/theme/ThemeProvider';
import { useObservedQuery } from '@/db/hooks';
import type { Entry } from '@/db/models/Entry';
import { type EnergyPayload } from '@/poles/types';
import { queryEnergy } from './work';

export function EnergyScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const energy = useObservedQuery<Entry>(() => queryEnergy(), [], ['payload']);

  const sorted = useMemo(() => [...energy].sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime()), [energy]);
  const recent = sorted.slice(-14); // chronological, last 14 sessions
  const avg = useMemo(() => {
    if (energy.length === 0) return { level: 0, focus: 0 };
    const l = energy.reduce((s, e) => s + (e.payload as EnergyPayload).level, 0) / energy.length;
    const f = energy.reduce((s, e) => s + (e.payload as EnergyPayload).focus, 0) / energy.length;
    return { level: l, focus: f };
  }, [energy]);

  const levelColor = theme.colors.secondary; // lilac
  const focusColor = theme.colors.accent; // teal
  const CHART_H = 120;

  return (
    <Screen account={false}>
      <BackButton onPress={() => router.back()} />
      <Text variant="display">Énergie & focus</Text>
      <Text variant="body" color={theme.colors.inkSoft}>
        Saisi après chaque session de focus.
      </Text>

      {energy.length === 0 ? (
        <Text variant="caption" color={theme.colors.muted} style={{ marginTop: theme.spacing(5) }}>
          Aucune donnée pour l'instant. Termine une session dans le Time-tracker et note ton énergie.
        </Text>
      ) : (
        <>
          {/* Averages */}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: theme.spacing(5) }}>
            <Avg label="Énergie moy." value={avg.level} color={levelColor} />
            <Avg label="Focus moy." value={avg.focus} color={focusColor} />
          </View>

          {/* Chart */}
          <View style={{ marginTop: theme.spacing(6), backgroundColor: theme.colors.surface, borderRadius: theme.radius.bento, borderWidth: 1, borderColor: theme.colors.border, padding: theme.spacing(5) }}>
            <View style={{ flexDirection: 'row', gap: 14, marginBottom: theme.spacing(3) }}>
              <Legend color={levelColor} label="Énergie" />
              <Legend color={focusColor} label="Focus" />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: CHART_H, gap: 6 }}>
              {recent.map((e) => {
                const p = e.payload as EnergyPayload;
                return (
                  <View key={e.id} style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 2, height: CHART_H }}>
                    <View style={{ flex: 1, height: (p.level / 5) * CHART_H, backgroundColor: levelColor, borderRadius: 3 }} />
                    <View style={{ flex: 1, height: (p.focus / 5) * CHART_H, backgroundColor: focusColor, borderRadius: 3 }} />
                  </View>
                );
              })}
            </View>
          </View>

          {/* Recent list */}
          <Text variant="title" style={{ marginTop: theme.spacing(7), marginBottom: theme.spacing(3) }}>
            Sessions récentes
          </Text>
          <View style={{ gap: 10 }}>
            {[...sorted].reverse().slice(0, 20).map((e) => {
              const p = e.payload as EnergyPayload;
              return (
                <View key={e.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, padding: theme.spacing(4) }}>
                  <View style={{ flex: 1 }}>
                    <Text variant="body">
                      {e.occurredAt.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })} ·{' '}
                      {e.occurredAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                    {p.note ? (
                      <Text variant="label" color={theme.colors.muted} numberOfLines={1}>
                        {p.note}
                      </Text>
                    ) : null}
                  </View>
                  <Dots value={p.level} color={levelColor} />
                  <Dots value={p.focus} color={focusColor} />
                </View>
              );
            })}
          </View>
        </>
      )}
    </Screen>
  );
}

function Avg({ label, value, color }: { label: string; value: number; color: string }) {
  const { theme } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, padding: theme.spacing(4) }}>
      <Text variant="label" color={theme.colors.muted}>
        {label}
      </Text>
      <Text variant="stat" color={color} style={{ fontFamily: theme.fonts.accent, fontSize: 26, marginTop: 2 }}>
        {value.toFixed(1)}
        <Text variant="label" color={theme.colors.muted}>
          {' '}/ 5
        </Text>
      </Text>
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  const { theme } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: color }} />
      <Text variant="label" color={theme.colors.inkSoft}>
        {label}
      </Text>
    </View>
  );
}

function Dots({ value, color }: { value: number; color: string }) {
  const { theme } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 3 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <View key={i} style={{ width: 7, height: 7, borderRadius: 999, backgroundColor: i <= value ? color : theme.colors.surfaceAlt }} />
      ))}
    </View>
  );
}
