import React, { useMemo, useState } from 'react';
import { Modal, Pressable, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { BentoCard } from '@/components/BentoCard';
import { useTheme } from '@/theme/ThemeProvider';
import { useObservedQuery } from '@/db/hooks';
import { queryEntries, queryEntriesBetween } from '@/db/repositories/entries';
import type { Entry } from '@/db/models/Entry';
import { POLE, type MedIntakePayload, type MedicationPayload } from '@/poles/types';
import { startOfDay, endOfDay } from '@/lib/time';
import { addMedication, logMedIntake, removeLastMedIntake } from './wellbeing';

export function MedicationsScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const palette = theme.poleColors.wellbeing;

  const meds = useObservedQuery<Entry>(() => queryEntries(POLE.wellbeing, 'medication'), [], ['title', 'payload']);
  const intakes = useObservedQuery<Entry>(
    () => queryEntriesBetween(POLE.wellbeing, 'med_intake', startOfDay(), endOfDay()),
    [],
    ['payload'],
  );

  const takenByMed = useMemo(() => {
    const map: Record<string, number> = {};
    for (const i of intakes) {
      const id = (i.payload as MedIntakePayload).medId;
      map[id] = (map[id] ?? 0) + 1;
    }
    return map;
  }, [intakes]);

  const expectedTotal = meds.reduce((s, m) => s + ((m.payload as MedicationPayload).timesPerDay || 0), 0);
  const takenTotal = intakes.length;

  const [adding, setAdding] = useState(false);

  return (
    <Screen account={false}>
      <Pressable
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/wellbeing'))}
        hitSlop={10}
        style={backBtn(theme)}
      >
        <Ionicons name="chevron-back" size={22} color={theme.colors.ink} />
      </Pressable>

      <Text variant="display">Médicaments</Text>
      <Text variant="body" color={theme.colors.inkSoft}>
        {takenTotal} / {expectedTotal} pris aujourd'hui
      </Text>

      <View style={{ marginTop: theme.spacing(5), gap: 12 }}>
        {meds.length === 0 ? (
          <BentoCard span={2} title="Aucun médicament" subtitle="Ajoute-en un pour suivre tes prises." />
        ) : (
          meds.map((med) => {
            const p = med.payload as MedicationPayload;
            const taken = takenByMed[med.id] ?? 0;
            const complete = taken >= p.timesPerDay;
            return (
              <View
                key={med.id}
                style={{
                  backgroundColor: theme.colors.surface,
                  borderRadius: theme.radius.md,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  padding: theme.spacing(4),
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: theme.radius.pill,
                    backgroundColor: complete ? theme.colors.success : palette.solid,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="medkit" size={20} color={palette.on} />
                </View>

                <View style={{ flex: 1 }}>
                  <Text variant="body">{med.title}</Text>
                  <Text variant="label" color={theme.colors.muted}>
                    {p.dosage ? `${p.dosage} · ` : ''}
                    {taken} / {p.timesPerDay} aujourd'hui
                  </Text>
                </View>

                <Pressable onPress={() => removeLastMedIntake(med.id)} hitSlop={8} style={roundBtn(theme, theme.colors.surfaceAlt)}>
                  <Ionicons name="remove" size={20} color={theme.colors.ink} />
                </Pressable>
                <Pressable
                  onPress={() => logMedIntake(med.id)}
                  hitSlop={8}
                  style={roundBtn(theme, complete ? theme.colors.surfaceAlt : theme.colors.primary)}
                >
                  <Ionicons name="add" size={20} color={theme.colors.ink} />
                </Pressable>
              </View>
            );
          })
        )}
      </View>

      <Pressable onPress={() => setAdding(true)} style={{ ...addBtn(theme), marginTop: theme.spacing(5) }}>
        <Ionicons name="add-circle" size={18} color={palette.solid} />
        <Text variant="label">Ajouter un médicament</Text>
      </Pressable>

      <AddMedicationSheet visible={adding} onClose={() => setAdding(false)} />
    </Screen>
  );
}

function AddMedicationSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { theme } = useTheme();
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [times, setTimes] = useState(1);

  const reset = () => {
    setName('');
    setDosage('');
    setTimes(1);
  };

  const submit = async () => {
    if (!name.trim()) return;
    await addMedication({ name: name.trim(), dosage: dosage.trim() || undefined, timesPerDay: times });
    reset();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(26,7,8,0.45)', justifyContent: 'flex-end' }}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: theme.colors.bg,
            borderTopLeftRadius: theme.radius.bento,
            borderTopRightRadius: theme.radius.bento,
            padding: theme.spacing(6),
            gap: theme.spacing(3),
          } as never}
        >
          <Text variant="title">Nouveau médicament</Text>

          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Nom (ex : Doliprane)"
            placeholderTextColor={theme.colors.muted}
            style={input(theme)}
          />
          <TextInput
            value={dosage}
            onChangeText={setDosage}
            placeholder="Dose (ex : 500 mg) — optionnel"
            placeholderTextColor={theme.colors.muted}
            style={input(theme)}
          />

          <Text variant="label" color={theme.colors.inkSoft}>
            Prises par jour
          </Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {[1, 2, 3, 4].map((n) => (
              <Pressable
                key={n}
                onPress={() => setTimes(n)}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: theme.radius.md,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: times === n ? theme.colors.primary : theme.colors.surfaceAlt,
                }}
              >
                <Text variant="label" color={times === n ? theme.colors.onPrimary : theme.colors.ink}>
                  {n}
                </Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            onPress={submit}
            style={{
              marginTop: theme.spacing(2),
              paddingVertical: 14,
              borderRadius: theme.radius.pill,
              alignItems: 'center',
              backgroundColor: theme.colors.primary,
            }}
          >
            <Text variant="label" color={theme.colors.onPrimary}>
              Ajouter
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// small style helpers
const backBtn = (t: ReturnType<typeof useTheme>['theme']) => ({
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
const roundBtn = (t: ReturnType<typeof useTheme>['theme'], bg: string) => ({
  width: 40,
  height: 40,
  borderRadius: t.radius.pill,
  backgroundColor: bg,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
});
const addBtn = (t: ReturnType<typeof useTheme>['theme']) => ({
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 8,
  alignSelf: 'flex-start' as const,
  paddingVertical: 12,
  paddingHorizontal: 18,
  borderRadius: t.radius.pill,
  backgroundColor: t.colors.surface,
  borderWidth: 1,
  borderColor: t.colors.border,
});
const input = (t: ReturnType<typeof useTheme>['theme']) => ({
  fontFamily: t.fonts.body,
  fontSize: 15,
  color: t.colors.ink,
  backgroundColor: t.colors.surface,
  borderWidth: 1,
  borderColor: t.colors.border,
  borderRadius: t.radius.md,
  paddingHorizontal: 16,
  paddingVertical: 12,
});
