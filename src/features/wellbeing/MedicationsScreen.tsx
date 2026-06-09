import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { BentoCard } from '@/components/BentoCard';
import { DateTimeFields } from '@/components/DateTimePicker';
import { useTheme } from '@/theme/ThemeProvider';
import { useObservedQuery } from '@/db/hooks';
import { queryEntries, queryEntriesBetween } from '@/db/repositories/entries';
import type { Entry } from '@/db/models/Entry';
import { POLE, type MedIntakePayload, type MedicationPayload } from '@/poles/types';
import { startOfDay, endOfDay } from '@/lib/time';
import {
  MED_UNITS,
  addMedication,
  updateMedication,
  removeMedication,
  logMedIntake,
  removeLastMedIntake,
} from './wellbeing';
import { pickImage, type PhotoSource } from '@/lib/photo';

export function MedicationsScreen() {
  const { theme } = useTheme();
  const router = useRouter();

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

  const [editing, setEditing] = useState<{ entry?: Entry } | null>(null);

  return (
    <Screen account={false}>
      <Pressable
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/wellbeing'))}
        hitSlop={10}
        style={backBtn(theme)}
      >
        <Ionicons name="chevron-back" size={22} color={theme.colors.ink} />
      </Pressable>

      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Text variant="display">Médicaments</Text>
          <Text variant="body" color={theme.colors.inkSoft}>
            {takenTotal} / {expectedTotal} pris aujourd'hui
          </Text>
        </View>
        <Pressable onPress={() => setEditing({})} hitSlop={8} style={iconBtn(theme)}>
          <Ionicons name="add" size={20} color={theme.colors.ink} />
        </Pressable>
      </View>
      <Text variant="caption" color={theme.colors.muted} style={{ marginTop: 4 }}>
        Tape une carte pour marquer une prise · appui long pour modifier.
      </Text>

      <View style={{ marginTop: theme.spacing(5) }}>
        {meds.length === 0 ? (
          <BentoCard span={2} title="Aucun médicament" subtitle="Ajoute-en un avec le +." />
        ) : (
          meds.map((med, i) => (
            <MedCard
              key={med.id}
              med={med}
              taken={takenByMed[med.id] ?? 0}
              index={i}
              onTap={() => {
                const p = med.payload as MedicationPayload;
                const taken = takenByMed[med.id] ?? 0;
                if (taken >= p.timesPerDay) removeLastMedIntake(med.id);
                else logMedIntake(med.id);
              }}
              onEdit={() => setEditing({ entry: med })}
            />
          ))
        )}
      </View>

      <MedModal editing={editing} onClose={() => setEditing(null)} />
    </Screen>
  );
}

function MedCard({
  med,
  taken,
  index,
  onTap,
  onEdit,
}: {
  med: Entry;
  taken: number;
  index: number;
  onTap: () => void;
  onEdit: () => void;
}) {
  const { theme } = useTheme();
  const palette = theme.poleColors.wellbeing;
  const p = med.payload as MedicationPayload;
  const expected = p.timesPerDay || 1;
  const complete = taken >= expected;
  const pct = Math.min(1, taken / expected);
  const dose = [p.dosage, p.unit].filter(Boolean).join(' ');
  const times = p.reminders?.map((r) => r.time).join(' · ');

  const R = 22;
  const C = 2 * Math.PI * R;

  return (
    <Pressable
      onPress={onTap}
      onLongPress={onEdit}
      style={{ marginTop: index > 0 ? -20 : 0 }}
    >
      {index > 0 ? (
        <View style={{ alignSelf: 'center', width: 44, height: 6, borderRadius: 999, backgroundColor: theme.colors.ink, opacity: 0.18, marginBottom: 6 }} />
      ) : null}

      {complete ? (
        // Compact "pris" state
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            backgroundColor: theme.colors.surfaceAlt,
            borderRadius: 22,
            paddingVertical: theme.spacing(3),
            paddingHorizontal: theme.spacing(4),
          }}
        >
          <Ionicons name="checkmark-circle" size={22} color={theme.colors.success} />
          <Text variant="label" color={theme.colors.inkSoft} style={{ flex: 1 }}>
            {med.title} · pris
          </Text>
          <Text variant="label" color={theme.colors.muted}>
            {taken}/{expected}
          </Text>
        </View>
      ) : (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
            backgroundColor: theme.colors.surface,
            borderRadius: 30,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing(5),
          }}
        >
          {/* Photo or icon */}
          {p.photoUri ? (
            <Image source={{ uri: p.photoUri }} style={{ width: 52, height: 52, borderRadius: theme.radius.md }} />
          ) : (
            <View style={{ width: 52, height: 52, borderRadius: theme.radius.md, backgroundColor: palette.solid, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="medkit" size={24} color={palette.on} />
            </View>
          )}

          <View style={{ flex: 1 }}>
            <Text variant="title">{med.title}</Text>
            <Text variant="label" color={theme.colors.muted}>
              {[dose, `${taken}/${expected} aujourd'hui`].filter(Boolean).join(' · ')}
            </Text>
            {times ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 }}>
                <Ionicons name="alarm-outline" size={13} color={palette.solid} />
                <Text variant="label" color={theme.colors.muted}>
                  {times}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Ring */}
          <View style={{ width: 56, height: 56, alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={56} height={56} style={{ position: 'absolute' }}>
              <Circle cx={28} cy={28} r={R} stroke={theme.colors.ink} strokeOpacity={0.12} strokeWidth={5} fill="none" />
              <Circle
                cx={28}
                cy={28}
                r={R}
                stroke={palette.solid}
                strokeWidth={5}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={C}
                strokeDashoffset={C * (1 - pct)}
                transform="rotate(-90 28 28)"
              />
            </Svg>
            <Text variant="label" color={theme.colors.ink} style={{ fontFamily: theme.fonts.accent }}>
              {taken}/{expected}
            </Text>
          </View>
        </View>
      )}
    </Pressable>
  );
}

function MedModal({ editing, onClose }: { editing: { entry?: Entry } | null; onClose: () => void }) {
  const { theme } = useTheme();
  const visible = editing !== null;
  const existing = editing?.entry;

  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [unit, setUnit] = useState('mg');
  const [times, setTimes] = useState(1);
  const [reminders, setReminders] = useState<string[]>([]);
  const [photoUri, setPhotoUri] = useState<string | undefined>(undefined);
  const [timeDraft, setTimeDraft] = useState(() => {
    const d = new Date();
    d.setHours(8, 0, 0, 0);
    return d;
  });

  useEffect(() => {
    if (!visible) return;
    const p = existing?.payload as MedicationPayload | undefined;
    setName(existing?.title ?? '');
    setDosage(p?.dosage ?? '');
    setUnit(p?.unit ?? 'mg');
    setTimes(p?.timesPerDay ?? 1);
    setReminders(p?.reminders?.map((r) => r.time) ?? []);
    setPhotoUri(p?.photoUri);
  }, [visible, existing]);

  const addTime = () => {
    const t = `${String(timeDraft.getHours()).padStart(2, '0')}:${String(timeDraft.getMinutes()).padStart(2, '0')}`;
    if (!reminders.includes(t)) setReminders((r) => [...r, t].sort());
  };

  const submit = async () => {
    if (!name.trim()) return;
    const args = { name: name.trim(), dosage: dosage.trim() || undefined, unit, timesPerDay: times, reminderTimes: reminders, photoUri };
    if (existing) await updateMedication(existing, args);
    else await addMedication(args);
    onClose();
  };
  const remove = async () => {
    if (existing) await removeMedication(existing);
    onClose();
  };

  const choosePhoto = () => {
    const run = async (src: PhotoSource) => {
      const uri = await pickImage(src);
      if (uri) setPhotoUri(uri);
    };
    Alert.alert('Ajouter une photo', "D'où veux-tu importer ?", [
      { text: 'Photothèque', onPress: () => run('library') },
      { text: 'Appareil photo', onPress: () => run('camera') },
      { text: 'Fichiers', onPress: () => run('files') },
      { text: 'Annuler', style: 'cancel' },
    ]);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable onPress={onClose} style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(26,7,8,0.45)' }]} />
        <View style={{ backgroundColor: theme.colors.bg, borderTopLeftRadius: theme.radius.bento, borderTopRightRadius: theme.radius.bento, maxHeight: '90%' }}>
          <ScrollView nestedScrollEnabled contentContainerStyle={{ padding: theme.spacing(6), gap: theme.spacing(3) }}>
            <Text variant="title">{existing ? 'Modifier le médicament' : 'Nouveau médicament'}</Text>

            {/* Photo */}
            <Pressable onPress={choosePhoto} style={{ alignSelf: 'flex-start' }}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={{ width: 72, height: 72, borderRadius: theme.radius.md }} />
              ) : (
                <View style={{ width: 72, height: 72, borderRadius: theme.radius.md, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                  <Ionicons name="camera" size={22} color={theme.colors.muted} />
                  <Text variant="label" color={theme.colors.muted} style={{ fontSize: 10 }}>
                    Photo
                  </Text>
                </View>
              )}
            </Pressable>
            {photoUri ? (
              <Pressable onPress={() => setPhotoUri(undefined)} hitSlop={6}>
                <Text variant="label" color={theme.colors.danger}>
                  Retirer la photo
                </Text>
              </Pressable>
            ) : null}

            <TextInput value={name} onChangeText={setName} placeholder="Nom (ex : Doliprane)" placeholderTextColor={theme.colors.muted} style={input(theme)} />

            {/* Dose + unit */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TextInput value={dosage} onChangeText={setDosage} placeholder="Dose (ex : 500)" placeholderTextColor={theme.colors.muted} keyboardType="numeric" style={[input(theme), { flex: 1 }]} />
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {MED_UNITS.map((u) => {
                const active = u === unit;
                return (
                  <Pressable key={u} onPress={() => setUnit(u)} style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: theme.radius.pill, backgroundColor: active ? theme.colors.ink : theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border }}>
                    <Text variant="label" color={active ? theme.colors.bg : theme.colors.ink}>
                      {u}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Times per day */}
            <Text variant="label" color={theme.colors.inkSoft}>
              Prises par jour
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Pressable
                  key={n}
                  onPress={() => setTimes(n)}
                  style={{ width: 44, height: 44, borderRadius: theme.radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: times === n ? theme.colors.primary : theme.colors.surfaceAlt }}
                >
                  <Text variant="label" color={times === n ? theme.colors.onPrimary : theme.colors.ink}>
                    {n}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Reminders */}
            <Text variant="label" color={theme.colors.inkSoft}>
              Rappels (notifications)
            </Text>
            {reminders.length > 0 ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {reminders.map((t) => (
                  <Pressable
                    key={t}
                    onPress={() => setReminders((r) => r.filter((x) => x !== t))}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: theme.radius.pill, backgroundColor: theme.colors.secondary }}
                  >
                    <Ionicons name="notifications" size={14} color={theme.colors.ink} />
                    <Text variant="label">{t}</Text>
                    <Ionicons name="close" size={14} color={theme.colors.ink} />
                  </Pressable>
                ))}
              </View>
            ) : null}
            <DateTimeFields value={timeDraft} onChange={setTimeDraft} withDate={false} collapsible />
            <Pressable onPress={addTime} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', paddingVertical: 10, paddingHorizontal: 16, borderRadius: theme.radius.pill, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border }}>
              <Ionicons name="add" size={16} color={theme.colors.ink} />
              <Text variant="label">Ajouter cette heure</Text>
            </Pressable>

            <Pressable onPress={submit} style={{ marginTop: theme.spacing(1), paddingVertical: 14, borderRadius: theme.radius.pill, alignItems: 'center', backgroundColor: theme.colors.primary }}>
              <Text variant="label" color={theme.colors.onPrimary}>
                {existing ? 'Enregistrer' : 'Ajouter'}
              </Text>
            </Pressable>
            {existing ? (
              <Pressable onPress={remove} style={{ paddingVertical: 12, alignItems: 'center' }}>
                <Text variant="label" color={theme.colors.danger}>
                  Supprimer
                </Text>
              </Pressable>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

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
const iconBtn = (t: ReturnType<typeof useTheme>['theme']) => ({
  width: 40,
  height: 40,
  borderRadius: t.radius.pill,
  backgroundColor: t.colors.surface,
  borderWidth: 1,
  borderColor: t.colors.border,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
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
