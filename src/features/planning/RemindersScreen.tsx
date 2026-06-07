import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { BackButton, DeleteX, Field, ListRow, PrimaryButton, Section, Sheet } from '@/components/ListUI';
import { DateTimeFields } from '@/components/DateTimePicker';
import { useTheme } from '@/theme/ThemeProvider';
import { useObservedQuery } from '@/db/hooks';
import { queryEntries } from '@/db/repositories/entries';
import type { Entry } from '@/db/models/Entry';
import { POLE, type ReminderPayload } from '@/poles/types';
import { addReminder, removeReminder } from './reminders';

export function RemindersScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const palette = theme.poleColors.planning;

  const reminders = useObservedQuery<Entry>(() => queryEntries(POLE.planning, 'reminder'), [], ['title', 'payload']);
  const [adding, setAdding] = useState(false);

  return (
    <Screen account={false}>
      <BackButton onPress={() => (router.canGoBack() ? router.back() : router.replace('/planning'))} />
      <Text variant="display">Rappels</Text>
      <Text variant="body" color={theme.colors.inkSoft}>
        Notifications programmées sur ton téléphone.
      </Text>

      <Section title="Tes rappels" right={null} />
      <Pressable
        onPress={() => setAdding(true)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          alignSelf: 'flex-start',
          marginBottom: 10,
          paddingVertical: 12,
          paddingHorizontal: 18,
          borderRadius: theme.radius.pill,
          backgroundColor: theme.colors.primary,
        }}
      >
        <Ionicons name="add" size={18} color={theme.colors.onPrimary} />
        <Text variant="label" color={theme.colors.onPrimary}>
          Nouveau rappel
        </Text>
      </Pressable>

      <View style={{ gap: 10 }}>
        {reminders.length === 0 ? (
          <Text variant="caption" color={theme.colors.muted}>
            Aucun rappel. Crées-en un — il déclenchera une vraie notification.
          </Text>
        ) : (
          reminders.map((r) => {
            const p = r.payload as ReminderPayload;
            const when =
              p.repeat === 'daily'
                ? `Tous les jours à ${new Date(p.at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
                : new Date(p.at).toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
            return (
              <ListRow key={r.id}>
                <Ionicons name={p.repeat === 'daily' ? 'repeat' : 'alarm'} size={22} color={palette.solid} />
                <View style={{ flex: 1 }}>
                  <Text variant="body">{r.title}</Text>
                  <Text variant="label" color={theme.colors.muted}>
                    {when}
                  </Text>
                </View>
                <DeleteX onPress={() => removeReminder(r)} />
              </ListRow>
            );
          })
        )}
      </View>

      <ReminderModal visible={adding} onClose={() => setAdding(false)} />
    </Screen>
  );
}

function ReminderModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { theme } = useTheme();
  const [title, setTitle] = useState('');
  const [daily, setDaily] = useState(false);
  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 1, 0, 0, 0);
    return d;
  });

  const submit = async () => {
    if (!title.trim()) return;
    await addReminder({ title: title.trim(), at: date.getTime(), repeat: daily ? 'daily' : 'once' });
    setTitle('');
    setDaily(false);
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Nouveau rappel">
      <Field value={title} onChangeText={setTitle} placeholder="Quoi te rappeler ?" />

      <Pressable onPress={() => setDaily(!daily)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Ionicons name={daily ? 'checkbox' : 'square-outline'} size={22} color={daily ? theme.colors.primary : theme.colors.muted} />
        <Text variant="label">Tous les jours (heure fixe)</Text>
      </Pressable>

      <DateTimeFields value={date} onChange={setDate} withDate={!daily} />

      <PrimaryButton label="Créer le rappel" onPress={submit} />
    </Sheet>
  );
}
