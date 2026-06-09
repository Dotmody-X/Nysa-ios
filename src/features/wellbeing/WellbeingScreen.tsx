import React, { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { isHealthAvailable, requestSleepPermission, readLastNightSleepMinutes } from '@/integrations/health';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { BentoGrid } from '@/components/BentoGrid';
import { BentoCard } from '@/components/BentoCard';
import { StackedCard } from '@/components/StackedCard';
import { STACK_STYLES } from '@/features/goals/GoalsScreen';
import { useProfile } from '@/features/profile/profile';
import { useTheme } from '@/theme/ThemeProvider';
import { useObservedQuery } from '@/db/hooks';
import { queryEntries, queryEntriesBetween } from '@/db/repositories/entries';
import { queryGoalByMetric } from '@/db/repositories/goals';
import type { Entry } from '@/db/models/Entry';
import type { Goal } from '@/db/models/Goal';
import {
  POLE,
  METRIC,
  type Rating,
  type MealPayload,
  type MeditationPayload,
  type MoodPayload,
  type SleepPayload,
  type WorkoutPayload,
  type MedicationPayload,
  type Nutriscore,
} from '@/poles/types';
import { startOfDay, endOfDay, formatDuration } from '@/lib/time';
import { logMeal, logMeditation, logMood, logSleep, logWorkout } from './wellbeing';

type LogKind = 'sleep' | 'meditation' | 'mood' | 'workout' | 'meal';
const MOOD_FACE = ['😞', '😕', '😐', '🙂', '😄'];

export function WellbeingScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const palette = theme.poleColors.wellbeing;

  const sleeps = useObservedQuery<Entry>(() => queryEntries(POLE.wellbeing, 'sleep_log'), [], ['payload']);
  const moods = useObservedQuery<Entry>(() => queryEntries(POLE.wellbeing, 'mood'), [], ['payload']);
  const meditations = useObservedQuery<Entry>(
    () => queryEntriesBetween(POLE.wellbeing, 'meditation', startOfDay(), endOfDay()),
    [],
    ['payload'],
  );
  const meals = useObservedQuery<Entry>(
    () => queryEntriesBetween(POLE.wellbeing, 'meal', startOfDay(), endOfDay()),
    [],
    ['payload'],
  );
  const mindfulGoals = useObservedQuery<Goal>(
    () => queryGoalByMetric(METRIC.mindfulMinutes),
    [],
    ['current_value', 'target_value'],
  );
  const meds = useObservedQuery<Entry>(() => queryEntries(POLE.wellbeing, 'medication'), [], ['payload']);
  const medIntakes = useObservedQuery<Entry>(
    () => queryEntriesBetween(POLE.wellbeing, 'med_intake', startOfDay(), endOfDay()),
    [],
  );

  const medsExpected = meds.reduce((s, m) => s + ((m.payload as MedicationPayload).timesPerDay || 0), 0);

  const [open, setOpen] = useState<LogKind | null>(null);

  const syncHealth = async () => {
    if (!(await isHealthAvailable())) {
      Alert.alert('Santé indisponible', "Reconstruis l'app (npx expo run:ios) puis réessaie.");
      return;
    }
    if (!(await requestSleepPermission())) {
      Alert.alert('Permission refusée', "Autorise l'accès au sommeil dans Réglages > Santé.");
      return;
    }
    const mins = await readLastNightSleepMinutes();
    if (!mins) {
      Alert.alert('Aucune donnée', 'Pas de sommeil trouvé pour cette nuit (teste sur un vrai appareil).');
      return;
    }
    await logSleep({ durationMin: mins, quality: 4 });
    Alert.alert('Importé', `${Math.round((mins / 60) * 10) / 10} h de sommeil ajoutées.`);
  };

  const lastSleep = sleeps[0]?.payload as SleepPayload | undefined;
  const lastMood = moods[0]?.payload as MoodPayload | undefined;
  const mindful = mindfulGoals[0];
  const mindfulPct =
    mindful && mindful.targetValue ? Math.min(1, mindful.currentValue / mindful.targetValue) : 0;

  const meditatedToday = useMemo(
    () => meditations.reduce((s, m) => s + ((m.payload as MeditationPayload).durationMin || 0), 0),
    [meditations],
  );

  const todayCalories = useMemo(
    () => meals.reduce((s, m) => s + ((m.payload as MealPayload).calories ?? 0), 0),
    [meals],
  );
  const worstScore = useMemo(() => {
    const scores = meals.map((m) => (m.payload as MealPayload).score).filter(Boolean) as string[];
    return scores.length ? scores.sort()[scores.length - 1] : null; // 'E' worst (last alphabetically)
  }, [meals]);

  const sex = useProfile((s) => s.sex);

  return (
    <Screen>
      <Text variant="display">Bien-être</Text>
      <Text variant="body" color={theme.colors.inkSoft}>
        Corps & esprit, au quotidien.
      </Text>

      <Pressable
        onPress={syncHealth}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          alignSelf: 'flex-start',
          marginTop: theme.spacing(3),
          paddingVertical: 10,
          paddingHorizontal: 16,
          borderRadius: theme.radius.pill,
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: theme.colors.border,
        }}
      >
        <Ionicons name="heart-circle" size={18} color={palette.solid} />
        <Text variant="label">Synchroniser avec Santé</Text>
      </Pressable>

      <BentoGrid>
        <BentoCard tall icon="moon" title="Sommeil" accent="secondary" subtitle="dernière nuit">
          <Text variant="stat">{lastSleep ? formatDuration(lastSleep.durationMin * 60) : '—'}</Text>
        </BentoCard>

        <BentoCard tall icon="happy" title="Humeur" accent="secondary" subtitle="aujourd'hui">
          <Text variant="stat">{lastMood ? MOOD_FACE[lastMood.level - 1] : '—'}</Text>
        </BentoCard>

        <BentoCard
          span={2}
          tone="secondary"
          icon="leaf"
          title="Minutes de calme"
          subtitle={`${mindful?.currentValue.toFixed(0) ?? 0} / ${mindful?.targetValue ?? 70} min · ${Math.round(
            mindfulPct * 100,
          )}%`}
        >
          <View
            style={{
              height: 10,
              borderRadius: 999,
              backgroundColor: 'rgba(26,7,8,0.12)',
              overflow: 'hidden',
              marginTop: 4,
            }}
          >
            <View style={{ width: `${mindfulPct * 100}%`, height: '100%', backgroundColor: theme.colors.ink }} />
          </View>
        </BentoCard>

        <BentoCard
          icon="restaurant"
          title="Calories"
          accent="secondary"
          subtitle={`${meals.length} repas${worstScore ? ` · ${worstScore}` : ''}`}
        >
          <Text variant="stat">{todayCalories || 0}</Text>
        </BentoCard>

        <BentoCard icon="barbell" title="Calme" accent="secondary" subtitle="médité aujourd'hui">
          <Text variant="stat">{meditatedToday} min</Text>
        </BentoCard>

      </BentoGrid>

      {/* Sub-poles — stacked classification cards */}
      <View style={{ marginTop: theme.spacing(6) }}>
        {(() => {
          type Nav = {
            key: string;
            title: string;
            subtitle: string;
            center?: string;
            progress?: number;
            chevron?: boolean;
            route: '/medications' | '/kitchen' | '/care' | '/mealplan' | '/cycle';
          };
          const navCards: Nav[] = [
            { key: 'care', title: 'Médecins & RDV', subtitle: 'Praticiens · rendez-vous · mesures', chevron: true, route: '/care' as const },
            {
              key: 'medications',
              title: 'Médicaments',
              subtitle: medsExpected ? `${medIntakes.length} / ${medsExpected} aujourd'hui` : 'À configurer',
              center: medsExpected ? `${medIntakes.length}/${medsExpected}` : undefined,
              progress: medsExpected ? medIntakes.length / medsExpected : 0,
              chevron: !medsExpected,
              route: '/medications' as const,
            },
            { key: 'kitchen', title: 'Cuisine', subtitle: 'Courses · placard · recettes', chevron: true, route: '/kitchen' as const },
            { key: 'mealplan', title: 'Planning repas', subtitle: 'Repas de la semaine', chevron: true, route: '/mealplan' as const },
            ...(sex === 'female'
              ? [{ key: 'cycle', title: 'Cycle', subtitle: 'Suivi privé du cycle menstruel', chevron: true, route: '/cycle' as const }]
              : []),
          ];
          return navCards.map((c, i) => {
            const s = STACK_STYLES[i % STACK_STYLES.length];
            return (
              <StackedCard
                key={c.key}
                withHandle={i > 0}
                title={c.title}
                subtitle={c.subtitle}
                center={c.center}
                progress={c.progress ?? 0}
                chevron={c.chevron}
                bg={theme.colors[s.bg]}
                fg={theme.colors[s.fg]}
                ring={theme.colors[s.ring]}
                onPress={() => router.push(c.route)}
              />
            );
          });
        })()}
      </View>

      {/* Quick log */}
      <View style={{ marginTop: theme.spacing(7) }}>
        <Text variant="title">Logguer</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: theme.spacing(3) }}>
          {(
            [
              ['sleep', 'moon', 'Sommeil'],
              ['meditation', 'leaf', 'Méditation'],
              ['mood', 'happy', 'Humeur'],
              ['workout', 'barbell', 'Sport'],
              ['meal', 'restaurant', 'Repas'],
            ] as [LogKind, keyof typeof Ionicons.glyphMap, string][]
          ).map(([kind, icon, label]) => (
            <Pressable
              key={kind}
              onPress={() => setOpen(kind)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: theme.radius.pill,
                backgroundColor: theme.colors.surface,
                borderWidth: 1,
                borderColor: theme.colors.border,
              }}
            >
              <Ionicons name={icon} size={18} color={palette.solid} />
              <Text variant="label">{label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <LogSheet kind={open} onClose={() => setOpen(null)} />
    </Screen>
  );
}

/** Tap-driven quick logger. One tap on a preset records the entry. */
function LogSheet({ kind, onClose }: { kind: LogKind | null; onClose: () => void }) {
  const { theme } = useTheme();
  const [mealKind, setMealKind] = useState<MealPayload['kind']>('lunch');
  const [mealCal, setMealCal] = useState('');
  const [mealScore, setMealScore] = useState<Nutriscore | undefined>(undefined);

  const done = async (fn: () => Promise<unknown>) => {
    await fn();
    onClose();
  };
  const submitMeal = async () => {
    await logMeal({ kind: mealKind, calories: mealCal ? Number(mealCal) : undefined, score: mealScore });
    setMealCal('');
    setMealScore(undefined);
    onClose();
  };

  const Chips = ({ children }: { children: React.ReactNode }) => (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: theme.spacing(2) }}>{children}</View>
  );

  const Chip = ({ label, onPress }: { label: string; onPress: () => void }) => (
    <Pressable
      onPress={onPress}
      style={{
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: theme.radius.md,
        backgroundColor: theme.colors.surfaceAlt,
      }}
    >
      <Text variant="label">{label}</Text>
    </Pressable>
  );

  const titles: Record<LogKind, string> = {
    sleep: 'Combien de temps as-tu dormi ?',
    meditation: 'Combien de minutes de méditation ?',
    mood: 'Quelle humeur ?',
    workout: 'Quelle activité ? (≈30 min)',
    meal: 'Quel repas ?',
  };

  return (
    <Modal visible={kind !== null} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(26,7,8,0.45)', justifyContent: 'flex-end' }}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: theme.colors.bg,
            borderTopLeftRadius: theme.radius.bento,
            borderTopRightRadius: theme.radius.bento,
            padding: theme.spacing(6),
          }}
        >
          {kind ? (
            <Text variant="title" style={{ marginBottom: theme.spacing(2) }}>
              {titles[kind]}
            </Text>
          ) : null}

          {kind === 'sleep' ? (
            <Chips>
              {[6, 7, 8, 9].map((h) => (
                <Chip
                  key={h}
                  label={`${h} h`}
                  onPress={() => done(() => logSleep({ durationMin: h * 60, quality: 4 as Rating }))}
                />
              ))}
            </Chips>
          ) : null}

          {kind === 'meditation' ? (
            <Chips>
              {[5, 10, 15, 20].map((m) => (
                <Chip key={m} label={`${m} min`} onPress={() => done(() => logMeditation({ durationMin: m }))} />
              ))}
            </Chips>
          ) : null}

          {kind === 'mood' ? (
            <Chips>
              {MOOD_FACE.map((face, i) => (
                <Chip key={i} label={face} onPress={() => done(() => logMood({ level: (i + 1) as Rating }))} />
              ))}
            </Chips>
          ) : null}

          {kind === 'workout' ? (
            <Chips>
              {['Course', 'Vélo', 'Muscu', 'Yoga', 'Marche'].map((a) => (
                <Chip
                  key={a}
                  label={a}
                  onPress={() => done(() => logWorkout({ activity: a, durationMin: 30 } as WorkoutPayload))}
                />
              ))}
            </Chips>
          ) : null}

          {kind === 'meal' ? (
            <View style={{ gap: theme.spacing(3) }}>
              <Chips>
                {(
                  [
                    ['breakfast', 'Petit-déj'],
                    ['lunch', 'Déjeuner'],
                    ['dinner', 'Dîner'],
                    ['snack', 'Encas'],
                  ] as [MealPayload['kind'], string][]
                ).map(([k, label]) => (
                  <Pressable
                    key={k}
                    onPress={() => setMealKind(k)}
                    style={{ paddingVertical: 12, paddingHorizontal: 18, borderRadius: theme.radius.md, backgroundColor: mealKind === k ? theme.colors.primary : theme.colors.surfaceAlt }}
                  >
                    <Text variant="label" color={mealKind === k ? theme.colors.onPrimary : theme.colors.ink}>
                      {label}
                    </Text>
                  </Pressable>
                ))}
              </Chips>
              <TextInput
                value={mealCal}
                onChangeText={setMealCal}
                placeholder="Calories (optionnel)"
                placeholderTextColor={theme.colors.muted}
                keyboardType="numeric"
                style={{ fontFamily: theme.fonts.body, fontSize: 15, color: theme.colors.ink, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md, paddingHorizontal: 16, paddingVertical: 12 }}
              />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {(['A', 'B', 'C', 'D', 'E'] as Nutriscore[]).map((sc) => {
                  const colors: Record<Nutriscore, string> = { A: '#3FA34D', B: '#9ACD32', C: '#E8C32E', D: '#E08A2E', E: '#D14B4B' };
                  const active = mealScore === sc;
                  return (
                    <Pressable
                      key={sc}
                      onPress={() => setMealScore(active ? undefined : sc)}
                      style={{ flex: 1, paddingVertical: 12, borderRadius: theme.radius.md, alignItems: 'center', backgroundColor: active ? colors[sc] : theme.colors.surfaceAlt }}
                    >
                      <Text variant="label" color={active ? '#fff' : theme.colors.ink}>
                        {sc}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <Pressable onPress={submitMeal} style={{ paddingVertical: 14, borderRadius: theme.radius.pill, alignItems: 'center', backgroundColor: theme.colors.primary }}>
                <Text variant="label" color={theme.colors.onPrimary}>
                  Logguer le repas
                </Text>
              </Pressable>
            </View>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
