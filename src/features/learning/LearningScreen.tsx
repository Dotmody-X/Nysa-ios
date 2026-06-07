import React from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { AddRow, BackButton, DeleteX, ListRow, Section } from '@/components/ListUI';
import { useTheme } from '@/theme/ThemeProvider';
import { useObservedQuery } from '@/db/hooks';
import { queryEntries } from '@/db/repositories/entries';
import type { Entry } from '@/db/models/Entry';
import { POLE, type BookPayload, type CoursePayload, type NotePayload } from '@/poles/types';
import { addBook, addCourse, addNote, bumpCourse, cycleBookStatus, removeBook, removeCourse, removeNote } from './learning';

const STATUS: Record<BookPayload['status'], string> = { 'to-read': 'À lire', reading: 'En cours', read: 'Lu' };

export function LearningScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const palette = theme.poleColors.learning;

  const books = useObservedQuery<Entry>(() => queryEntries(POLE.learning, 'book'), [], ['title', 'payload']);
  const courses = useObservedQuery<Entry>(() => queryEntries(POLE.learning, 'course'), [], ['title', 'payload']);
  const notes = useObservedQuery<Entry>(() => queryEntries(POLE.learning, 'note'), [], ['title', 'payload']);

  const statusColor = (s: BookPayload['status']) => (s === 'read' ? theme.colors.success : s === 'reading' ? theme.colors.primary : theme.colors.surfaceAlt);

  return (
    <Screen account={false}>
      <BackButton onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))} />
      <Text variant="display">Apprentissage</Text>
      <Text variant="body" color={theme.colors.inkSoft}>
        Grandir, chaque jour.
      </Text>

      <Section title="Livres" />
      <AddRow placeholder="Ajouter un livre…" onAdd={(t) => addBook({ title: t })} />
      <View style={{ gap: 10 }}>
        {books.map((b) => {
          const p = b.payload as BookPayload;
          return (
            <ListRow key={b.id}>
              <Ionicons name="book" size={20} color={palette.solid} />
              <View style={{ flex: 1 }}>
                <Text variant="body">{b.title}</Text>
                {p.author ? (
                  <Text variant="label" color={theme.colors.muted}>
                    {p.author}
                  </Text>
                ) : null}
              </View>
              <Pressable onPress={() => cycleBookStatus(b)} style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: theme.radius.pill, backgroundColor: statusColor(p.status) }}>
                <Text variant="label" color={p.status === 'to-read' ? theme.colors.ink : theme.colors.onPrimary}>
                  {STATUS[p.status]}
                </Text>
              </Pressable>
              <DeleteX onPress={() => removeBook(b)} />
            </ListRow>
          );
        })}
      </View>

      <Section title="Cours en ligne" />
      <AddRow placeholder="Ajouter un cours…" onAdd={(t) => addCourse(t)} />
      <View style={{ gap: 10 }}>
        {courses.map((c) => {
          const prog = (c.payload as CoursePayload).progress;
          return (
            <ListRow key={c.id}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row' }}>
                  <Text variant="body" style={{ flex: 1 }}>
                    {c.title}
                  </Text>
                  <Text variant="label" color={theme.colors.muted}>
                    {prog}%
                  </Text>
                </View>
                <View style={{ height: 8, borderRadius: 999, backgroundColor: theme.colors.surfaceAlt, overflow: 'hidden', marginTop: 6 }}>
                  <View style={{ width: `${prog}%`, height: '100%', backgroundColor: palette.solid }} />
                </View>
              </View>
              <Pressable onPress={() => bumpCourse(c, -10)} hitSlop={6}>
                <Ionicons name="remove-circle" size={22} color={theme.colors.muted} />
              </Pressable>
              <Pressable onPress={() => bumpCourse(c, 10)} hitSlop={6}>
                <Ionicons name="add-circle" size={22} color={palette.solid} />
              </Pressable>
              <DeleteX onPress={() => removeCourse(c)} />
            </ListRow>
          );
        })}
      </View>

      <Section title="Second cerveau" />
      <AddRow placeholder="Nouvelle note…" onAdd={(t) => addNote({ title: t })} />
      <View style={{ gap: 10 }}>
        {notes.map((n) => (
          <ListRow key={n.id}>
            <Ionicons name="bulb" size={20} color={palette.solid} />
            <View style={{ flex: 1 }}>
              <Text variant="body">{n.title}</Text>
              {(n.payload as NotePayload).content ? (
                <Text variant="label" color={theme.colors.muted} numberOfLines={1}>
                  {(n.payload as NotePayload).content}
                </Text>
              ) : null}
            </View>
            <DeleteX onPress={() => removeNote(n)} />
          </ListRow>
        ))}
      </View>
    </Screen>
  );
}
