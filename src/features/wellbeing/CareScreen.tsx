import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { useTheme } from '@/theme/ThemeProvider';
import { useObservedQuery } from '@/db/hooks';
import { queryEntries } from '@/db/repositories/entries';
import type { Entry } from '@/db/models/Entry';
import { POLE, type AppointmentPayload, type PractitionerPayload, type MeasurePayload } from '@/poles/types';
import { addAppointment, addPractitioner, cancelAppointment, removePractitioner } from './care';
import { MEASURE_TYPES, queryMeasures, logMeasure, deleteMeasure } from './wellbeing';

const HOURS = [8, 9, 10, 11, 14, 15, 16, 17, 18];

function nextDays(n: number): { ts: number; label: string }[] {
  const out: { ts: number; label: string }[] = [];
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  for (let i = 0; i < n; i++) {
    const d = new Date(base.getTime() + i * 86400000);
    const label =
      i === 0 ? 'Auj.' : i === 1 ? 'Dem.' : d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' });
    out.push({ ts: d.getTime(), label });
  }
  return out;
}

const fmtDateTime = (ms: number) =>
  new Date(ms).toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export function CareScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const palette = theme.poleColors.wellbeing;

  const practitioners = useObservedQuery<Entry>(() => queryEntries(POLE.wellbeing, 'practitioner'), [], ['title', 'payload']);
  const appointments = useObservedQuery<Entry>(() => queryEntries(POLE.wellbeing, 'appointment'), [], ['payload', 'title']);

  const upcoming = useMemo(
    () =>
      appointments
        .filter((a) => (a.payload as AppointmentPayload).start >= Date.now() - 3600000)
        .sort((a, b) => (a.payload as AppointmentPayload).start - (b.payload as AppointmentPayload).start),
    [appointments],
  );

  const measures = useObservedQuery<Entry>(() => queryMeasures(), [], ['payload', 'title']);
  const recentMeasures = useMemo(
    () => [...measures].sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime()).slice(0, 12),
    [measures],
  );

  const [apptModal, setApptModal] = useState(false);
  const [pracModal, setPracModal] = useState(false);
  const [measureModal, setMeasureModal] = useState(false);

  return (
    <Screen account={false}>
      <Pressable
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/wellbeing'))}
        hitSlop={10}
        style={squareBtn(theme)}
      >
        <Ionicons name="chevron-back" size={22} color={theme.colors.ink} />
      </Pressable>

      <Text variant="display">Médecins & RDV</Text>
      <Text variant="body" color={theme.colors.inkSoft}>
        Tes praticiens et rendez-vous — synchronisés au Planning.
      </Text>

      {/* Upcoming appointments */}
      <View style={{ marginTop: theme.spacing(6), flexDirection: 'row', alignItems: 'center' }}>
        <Text variant="title" style={{ flex: 1 }}>
          Prochains RDV
        </Text>
        <Pressable onPress={() => setApptModal(true)} style={pillBtn(theme, theme.colors.primary)}>
          <Ionicons name="add" size={16} color={theme.colors.onPrimary} />
          <Text variant="label" color={theme.colors.onPrimary}>
            RDV
          </Text>
        </Pressable>
      </View>

      <View style={{ marginTop: theme.spacing(3), gap: 10 }}>
        {upcoming.length === 0 ? (
          <Text variant="caption" color={theme.colors.muted}>
            Aucun rendez-vous à venir.
          </Text>
        ) : (
          upcoming.map((a) => {
            const p = a.payload as AppointmentPayload;
            return (
              <Row key={a.id}>
                <View style={{ width: 4, height: 38, borderRadius: 999, backgroundColor: palette.solid }} />
                <View style={{ flex: 1 }}>
                  <Text variant="body">{a.title}</Text>
                  <Text variant="label" color={theme.colors.muted}>
                    {fmtDateTime(p.start)}
                  </Text>
                </View>
                <Pressable onPress={() => cancelAppointment(a)} hitSlop={8}>
                  <Ionicons name="close" size={20} color={theme.colors.muted} />
                </Pressable>
              </Row>
            );
          })
        )}
      </View>

      {/* Practitioners */}
      <View style={{ marginTop: theme.spacing(7), flexDirection: 'row', alignItems: 'center' }}>
        <Text variant="title" style={{ flex: 1 }}>
          Praticiens
        </Text>
        <Pressable onPress={() => setPracModal(true)} style={pillBtn(theme, theme.colors.surface)}>
          <Ionicons name="add" size={16} color={theme.colors.ink} />
          <Text variant="label">Ajouter</Text>
        </Pressable>
      </View>

      <View style={{ marginTop: theme.spacing(3), gap: 10 }}>
        {practitioners.length === 0 ? (
          <Text variant="caption" color={theme.colors.muted}>
            Aucun praticien enregistré.
          </Text>
        ) : (
          practitioners.map((pr) => {
            const p = pr.payload as PractitionerPayload;
            return (
              <Row key={pr.id}>
                <View
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: theme.radius.pill,
                    backgroundColor: palette.solid,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="person" size={18} color={palette.on} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="body">{pr.title}</Text>
                  {p.specialty ? (
                    <Text variant="label" color={theme.colors.muted}>
                      {p.specialty}
                    </Text>
                  ) : null}
                </View>
                <Pressable onPress={() => removePractitioner(pr)} hitSlop={8}>
                  <Ionicons name="trash" size={18} color={theme.colors.muted} />
                </Pressable>
              </Row>
            );
          })
        )}
      </View>

      {/* Measures */}
      <View style={{ marginTop: theme.spacing(7), flexDirection: 'row', alignItems: 'center' }}>
        <Text variant="title" style={{ flex: 1 }}>
          Mesures
        </Text>
        <Pressable onPress={() => setMeasureModal(true)} style={pillBtn(theme, theme.colors.surface)}>
          <Ionicons name="add" size={16} color={theme.colors.ink} />
          <Text variant="label">Mesure</Text>
        </Pressable>
      </View>
      <View style={{ marginTop: theme.spacing(3), gap: 10 }}>
        {recentMeasures.length === 0 ? (
          <Text variant="caption" color={theme.colors.muted}>
            Aucune mesure. Note ton poids, ta tension…
          </Text>
        ) : (
          recentMeasures.map((m) => {
            const p = m.payload as MeasurePayload;
            return (
              <Row key={m.id}>
                <View style={{ flex: 1 }}>
                  <Text variant="body">{m.title}</Text>
                  <Text variant="label" color={theme.colors.muted}>
                    {m.occurredAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                <Text variant="body" color={palette.solid} style={{ fontFamily: theme.fonts.accent }}>
                  {p.value} {p.unit ?? ''}
                </Text>
                <Pressable onPress={() => deleteMeasure(m)} hitSlop={8}>
                  <Ionicons name="close" size={18} color={theme.colors.muted} />
                </Pressable>
              </Row>
            );
          })
        )}
      </View>

      <PractitionerModal visible={pracModal} onClose={() => setPracModal(false)} />
      <AppointmentModal visible={apptModal} onClose={() => setApptModal(false)} practitioners={practitioners} />
      <MeasureModal visible={measureModal} onClose={() => setMeasureModal(false)} />
    </Screen>
  );
}

function MeasureModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { theme } = useTheme();
  const [kind, setKind] = useState(MEASURE_TYPES[0].kind);
  const [value, setValue] = useState('');
  const meta = MEASURE_TYPES.find((m) => m.kind === kind);

  const submit = async () => {
    const v = Number(value.replace(',', '.'));
    if (!v) return;
    await logMeasure(kind, v, meta?.unit);
    setValue('');
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Nouvelle mesure">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {MEASURE_TYPES.map((m) => (
          <Chip key={m.kind} label={m.label} active={kind === m.kind} onPress={() => setKind(m.kind)} />
        ))}
      </ScrollView>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <TextInput
          value={value}
          onChangeText={setValue}
          placeholder="Valeur"
          placeholderTextColor={theme.colors.muted}
          keyboardType="numeric"
          style={[field(theme), { flex: 1 }]}
        />
        <Text variant="body" color={theme.colors.muted}>
          {meta?.unit}
        </Text>
      </View>
      <PrimaryBtn label="Enregistrer" onPress={submit} />
    </Sheet>
  );
}

function PractitionerModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { theme } = useTheme();
  const [name, setName] = useState('');
  const [specialty, setSpecialty] = useState('');

  const submit = async () => {
    if (!name.trim()) return;
    await addPractitioner({ name: name.trim(), specialty: specialty.trim() || undefined });
    setName('');
    setSpecialty('');
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Nouveau praticien">
      <TextInput value={name} onChangeText={setName} placeholder="Nom (ex : Dr. Martin)" placeholderTextColor={theme.colors.muted} style={field(theme)} />
      <TextInput value={specialty} onChangeText={setSpecialty} placeholder="Spécialité (ex : Dentiste) — optionnel" placeholderTextColor={theme.colors.muted} style={field(theme)} />
      <PrimaryBtn label="Ajouter" onPress={submit} />
    </Sheet>
  );
}

function AppointmentModal({ visible, onClose, practitioners }: { visible: boolean; onClose: () => void; practitioners: Entry[] }) {
  const { theme } = useTheme();
  const days = useMemo(() => nextDays(12), []);
  const [pracId, setPracId] = useState<string | null>(null);
  const [dayTs, setDayTs] = useState<number>(days[0].ts);
  const [hour, setHour] = useState<number>(9);

  const submit = async () => {
    const pr = practitioners.find((p) => p.id === pracId);
    await addAppointment({
      practitionerId: pr?.id,
      practitionerName: pr?.title,
      start: dayTs + hour * 3600000,
    });
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Nouveau rendez-vous">
      {practitioners.length > 0 ? (
        <>
          <Text variant="label" color={theme.colors.inkSoft}>
            Praticien
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {practitioners.map((p) => (
              <Chip key={p.id} label={p.title} active={pracId === p.id} onPress={() => setPracId(p.id)} />
            ))}
          </ScrollView>
        </>
      ) : null}

      <Text variant="label" color={theme.colors.inkSoft}>
        Jour
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {days.map((d) => (
          <Chip key={d.ts} label={d.label} active={dayTs === d.ts} onPress={() => setDayTs(d.ts)} />
        ))}
      </ScrollView>

      <Text variant="label" color={theme.colors.inkSoft}>
        Heure
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {HOURS.map((h) => (
          <Chip key={h} label={`${h}h`} active={hour === h} onPress={() => setHour(h)} />
        ))}
      </ScrollView>

      <PrimaryBtn label="Ajouter le RDV" onPress={submit} />
    </Sheet>
  );
}

// ---- shared bits ----------------------------------------------------------
function Sheet({ visible, onClose, title, children }: { visible: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const { theme } = useTheme();
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
          }}
        >
          <Text variant="title">{title}</Text>
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingVertical: 12,
        paddingHorizontal: 18,
        borderRadius: theme.radius.md,
        backgroundColor: active ? theme.colors.primary : theme.colors.surfaceAlt,
      }}
    >
      <Text variant="label" color={active ? theme.colors.onPrimary : theme.colors.ink}>
        {label}
      </Text>
    </Pressable>
  );
}

function PrimaryBtn({ label, onPress }: { label: string; onPress: () => void }) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{ marginTop: theme.spacing(1), paddingVertical: 14, borderRadius: theme.radius.pill, alignItems: 'center', backgroundColor: theme.colors.primary }}
    >
      <Text variant="label" color={theme.colors.onPrimary}>
        {label}
      </Text>
    </Pressable>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        padding: theme.spacing(4),
      }}
    >
      {children}
    </View>
  );
}

const field = (t: ReturnType<typeof useTheme>['theme']) => ({
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
const pillBtn = (t: ReturnType<typeof useTheme>['theme'], bg: string) => ({
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 6,
  paddingVertical: 8,
  paddingHorizontal: 14,
  borderRadius: t.radius.pill,
  backgroundColor: bg,
  borderWidth: 1,
  borderColor: t.colors.border,
});
