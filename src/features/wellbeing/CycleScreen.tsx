import React, { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { BentoCard } from '@/components/BentoCard';
import { useTheme } from '@/theme/ThemeProvider';
import { useObservedQuery } from '@/db/hooks';
import { queryEntries } from '@/db/repositories/entries';
import type { Entry } from '@/db/models/Entry';
import { POLE } from '@/poles/types';
import { computeCycle, endPeriod, startPeriod } from './cycle';

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const iso = (d: Date) => d.toISOString().slice(0, 10);

export function CycleScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const palette = theme.poleColors.wellbeing;

  const periods = useObservedQuery<Entry>(() => queryEntries(POLE.wellbeing, 'period'), [], ['payload']);
  const info = useMemo(() => computeCycle(periods), [periods]);

  // Current-month grid
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7; // Monday-first offset
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array(lead).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];

  const nextLabel =
    !info.hasData
      ? '—'
      : info.daysUntilNext > 1
        ? `dans ${info.daysUntilNext} j`
        : info.daysUntilNext === 1
          ? 'demain'
          : info.daysUntilNext === 0
            ? "aujourd'hui"
            : `en retard de ${-info.daysUntilNext} j`;

  return (
    <Screen account={false}>
      <Pressable
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/wellbeing'))}
        hitSlop={10}
        style={squareBtn(theme)}
      >
        <Ionicons name="chevron-back" size={22} color={theme.colors.ink} />
      </Pressable>

      <Text variant="display">Cycle</Text>
      <Text variant="caption" color={theme.colors.muted}>
        🔒 Privé — jamais partagé avec l'assistant.
      </Text>

      {/* Summary */}
      <View style={{ marginTop: theme.spacing(4) }}>
        <BentoCard
          span={2}
          tone="secondary"
          icon={info.onPeriod ? 'water' : 'ellipse'}
          title={info.onPeriod ? 'Règles en cours' : info.hasData ? `Jour ${info.cycleDay} du cycle` : 'Pas encore de données'}
          subtitle={info.hasData ? `Prochaines règles ${nextLabel} · cycle ~${info.avgCycle} j` : 'Démarre un suivi ci-dessous'}
        />
      </View>

      <Pressable
        onPress={() => (info.onPeriod ? endPeriod(periods[0]) : startPeriod())}
        style={{
          marginTop: theme.spacing(4),
          alignSelf: 'flex-start',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingVertical: 12,
          paddingHorizontal: 18,
          borderRadius: theme.radius.pill,
          backgroundColor: info.onPeriod ? theme.colors.surface : palette.solid,
          borderWidth: 1,
          borderColor: theme.colors.border,
        }}
      >
        <Ionicons name={info.onPeriod ? 'checkmark' : 'add'} size={18} color={info.onPeriod ? theme.colors.ink : palette.on} />
        <Text variant="label" color={info.onPeriod ? theme.colors.ink : palette.on}>
          {info.onPeriod ? 'Marquer la fin' : 'Démarrer les règles'}
        </Text>
      </Pressable>

      {/* Month calendar */}
      <View style={{ marginTop: theme.spacing(7) }}>
        <Text variant="title">
          {first.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
        </Text>
        <View style={{ flexDirection: 'row', marginTop: theme.spacing(3) }}>
          {WEEKDAYS.map((d, i) => (
            <Text key={i} variant="label" color={theme.colors.muted} style={{ flex: 1, textAlign: 'center' }}>
              {d}
            </Text>
          ))}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 }}>
          {cells.map((d, i) => {
            const isPeriod = d ? info.periodDays.has(iso(d)) : false;
            const isToday = d ? iso(d) === iso(today) : false;
            return (
              <View key={i} style={{ width: `${100 / 7}%`, aspectRatio: 1, padding: 3 }}>
                {d ? (
                  <View
                    style={{
                      flex: 1,
                      borderRadius: 999,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: isPeriod ? palette.solid : 'transparent',
                      borderWidth: isToday ? 2 : 0,
                      borderColor: theme.colors.ink,
                    }}
                  >
                    <Text variant="label" color={isPeriod ? palette.on : theme.colors.ink}>
                      {d.getDate()}
                    </Text>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
        <Text variant="caption" color={theme.colors.muted} style={{ marginTop: theme.spacing(2) }}>
          Les jours colorés incluent une estimation des prochaines règles.
        </Text>
      </View>
    </Screen>
  );
}

const squareBtn = (t: ReturnType<typeof useTheme>['theme']) => ({
  width: 44,
  height: 44,
  borderRadius: t.radius.pill,
  backgroundColor: t.colors.surface,
  borderWidth: 1,
  borderColor: t.colors.border,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  marginBottom: t.spacing(4),
});
