import React from 'react';
import { Alert, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { AddRow, BackButton, DeleteX, ListRow, Section } from '@/components/ListUI';
import { useTheme } from '@/theme/ThemeProvider';
import { useObservedQuery } from '@/db/hooks';
import { queryEntries } from '@/db/repositories/entries';
import type { Entry } from '@/db/models/Entry';
import { POLE, type ContactPayload, type GiftIdeaPayload } from '@/poles/types';
import { addContact, addGiftIdea, birthdayToPlanning, logInteraction, removeContact, removeGiftIdea, toggleGiftBought } from './relationships';

const DAY = 86_400_000;
const seenLabel = (lastSeen?: number) => {
  if (!lastSeen) return 'jamais vu';
  const d = Math.floor((Date.now() - lastSeen) / DAY);
  return d <= 0 ? "vu aujourd'hui" : d === 1 ? 'vu hier' : `vu il y a ${d} j`;
};

export function ContactsScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const palette = theme.poleColors.relationships;

  const contacts = useObservedQuery<Entry>(() => queryEntries(POLE.relationships, 'contact'), [], ['title', 'payload']);
  const gifts = useObservedQuery<Entry>(() => queryEntries(POLE.relationships, 'gift_idea'), [], ['title', 'payload']);

  return (
    <Screen account={false}>
      <BackButton onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))} />
      <Text variant="display">Relations</Text>
      <Text variant="body" color={theme.colors.inkSoft}>
        Les gens qui comptent.
      </Text>

      <Section title="Contacts" />
      <AddRow placeholder="Ajouter un contact…" onAdd={(t) => addContact({ name: t })} />
      <View style={{ gap: 10 }}>
        {contacts.map((c) => {
          const p = c.payload as ContactPayload;
          return (
            <ListRow key={c.id}>
              <View style={{ width: 42, height: 42, borderRadius: theme.radius.pill, backgroundColor: palette.solid, alignItems: 'center', justifyContent: 'center' }}>
                <Text variant="label" color={palette.on}>
                  {c.title.slice(0, 1).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="body">{c.title}</Text>
                <Text variant="label" color={theme.colors.muted}>
                  {seenLabel(p.lastSeen)}
                </Text>
              </View>
              {p.birthday ? (
                <Pressable
                  onPress={async () => {
                    await birthdayToPlanning(c);
                    Alert.alert('Ajouté', `L'anniversaire de ${c.title} est dans ton Planning.`);
                  }}
                  hitSlop={8}
                >
                  <Ionicons name="gift" size={18} color={theme.colors.muted} />
                </Pressable>
              ) : null}
              <Pressable onPress={() => logInteraction(c)} style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: theme.radius.pill, backgroundColor: theme.colors.primary }}>
                <Text variant="label" color={theme.colors.onPrimary}>
                  Vu
                </Text>
              </Pressable>
              <DeleteX onPress={() => removeContact(c)} />
            </ListRow>
          );
        })}
      </View>

      <Section title="Idées cadeaux" />
      <AddRow placeholder="Ajouter une idée…" onAdd={(t) => addGiftIdea({ title: t })} />
      <View style={{ gap: 10 }}>
        {gifts.map((g) => {
          const bought = (g.payload as GiftIdeaPayload).bought;
          return (
            <ListRow key={g.id}>
              <Pressable onPress={() => toggleGiftBought(g, !bought)} hitSlop={8}>
                <Ionicons name={bought ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={bought ? theme.colors.success : theme.colors.muted} />
              </Pressable>
              <Text variant="body" style={[{ flex: 1 }, bought ? { textDecorationLine: 'line-through', color: theme.colors.muted } : null]}>
                {g.title}
              </Text>
              <DeleteX onPress={() => removeGiftIdea(g)} />
            </ListRow>
          );
        })}
      </View>
    </Screen>
  );
}
