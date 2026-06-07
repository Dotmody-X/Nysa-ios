import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { AddRow, BackButton, DeleteX, Field, ListRow, PillButton, PrimaryButton, Section, Sheet } from '@/components/ListUI';
import { useTheme } from '@/theme/ThemeProvider';
import { useObservedQuery } from '@/db/hooks';
import { queryEntries } from '@/db/repositories/entries';
import type { Entry } from '@/db/models/Entry';
import { POLE, type BucketPayload, type MediaPayload, type WishlistPayload } from '@/poles/types';
import { addBucket, addMedia, addWishlist, removeBucket, removeMedia, removeWishlist, toggleBucket, toggleMedia } from './leisure';

const KINDS: MediaPayload['kind'][] = ['film', 'série', 'livre', 'jeu'];

export function LeisureScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const palette = theme.poleColors.leisure;

  const media = useObservedQuery<Entry>(() => queryEntries(POLE.leisure, 'media'), [], ['title', 'payload']);
  const wishlist = useObservedQuery<Entry>(() => queryEntries(POLE.leisure, 'wishlist_item'), [], ['title', 'payload']);
  const bucket = useObservedQuery<Entry>(() => queryEntries(POLE.leisure, 'bucket_item'), [], ['title', 'payload']);

  const [mediaModal, setMediaModal] = useState(false);
  const [wishModal, setWishModal] = useState(false);

  return (
    <Screen account={false}>
      <BackButton onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))} />
      <Text variant="display">Loisirs</Text>
      <Text variant="body" color={theme.colors.inkSoft}>
        Le plaisir, suivi.
      </Text>

      <Section title="Films, séries, livres" right={<PillButton label="Ajouter" filled onPress={() => setMediaModal(true)} />} />
      <View style={{ gap: 10 }}>
        {media.map((m) => {
          const p = m.payload as MediaPayload;
          return (
            <ListRow key={m.id}>
              <Pressable onPress={() => toggleMedia(m)} hitSlop={8}>
                <Ionicons name={p.done ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={p.done ? theme.colors.success : theme.colors.muted} />
              </Pressable>
              <View style={{ flex: 1 }}>
                <Text variant="body" style={p.done ? { textDecorationLine: 'line-through', color: theme.colors.muted } : undefined}>
                  {m.title}
                </Text>
                <Text variant="label" color={theme.colors.muted}>
                  {p.kind}
                </Text>
              </View>
              <DeleteX onPress={() => removeMedia(m)} />
            </ListRow>
          );
        })}
      </View>

      <Section title="Wishlist" right={<PillButton label="Ajouter" onPress={() => setWishModal(true)} />} />
      <View style={{ gap: 10 }}>
        {wishlist.map((w) => {
          const price = (w.payload as WishlistPayload).price;
          return (
            <ListRow key={w.id}>
              <Ionicons name="sparkles" size={20} color={palette.solid} />
              <Text variant="body" style={{ flex: 1 }}>
                {w.title}
              </Text>
              {price ? <Text variant="label" color={theme.colors.muted}>{price} €</Text> : null}
              <DeleteX onPress={() => removeWishlist(w)} />
            </ListRow>
          );
        })}
      </View>

      <Section title="Bucket list" />
      <AddRow placeholder="Un rêve à réaliser…" onAdd={(t) => addBucket(t)} />
      <View style={{ gap: 10 }}>
        {bucket.map((b) => {
          const done = (b.payload as BucketPayload).done;
          return (
            <ListRow key={b.id}>
              <Pressable onPress={() => toggleBucket(b)} hitSlop={8}>
                <Ionicons name={done ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={done ? theme.colors.success : theme.colors.muted} />
              </Pressable>
              <Text variant="body" style={[{ flex: 1 }, done ? { textDecorationLine: 'line-through', color: theme.colors.muted } : null]}>
                {b.title}
              </Text>
              <DeleteX onPress={() => removeBucket(b)} />
            </ListRow>
          );
        })}
      </View>

      <MediaModal visible={mediaModal} onClose={() => setMediaModal(false)} />
      <WishModal visible={wishModal} onClose={() => setWishModal(false)} />
    </Screen>
  );
}

function MediaModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { theme } = useTheme();
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<MediaPayload['kind']>('film');
  const submit = async () => {
    if (!title.trim()) return;
    await addMedia({ title: title.trim(), kind });
    setTitle('');
    setKind('film');
    onClose();
  };
  return (
    <Sheet visible={visible} onClose={onClose} title="Ajouter à voir / lire">
      <Field value={title} onChangeText={setTitle} placeholder="Titre" />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {KINDS.map((k) => (
          <Pressable key={k} onPress={() => setKind(k)} style={{ flex: 1, paddingVertical: 12, borderRadius: theme.radius.md, alignItems: 'center', backgroundColor: kind === k ? theme.colors.primary : theme.colors.surfaceAlt }}>
            <Text variant="label" color={kind === k ? theme.colors.onPrimary : theme.colors.ink}>
              {k}
            </Text>
          </Pressable>
        ))}
      </View>
      <PrimaryButton label="Ajouter" onPress={submit} />
    </Sheet>
  );
}

function WishModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const submit = async () => {
    if (!title.trim()) return;
    const n = parseFloat(price.replace(',', '.'));
    await addWishlist({ title: title.trim(), price: isNaN(n) ? undefined : n });
    setTitle('');
    setPrice('');
    onClose();
  };
  return (
    <Sheet visible={visible} onClose={onClose} title="Nouvelle envie">
      <Field value={title} onChangeText={setTitle} placeholder="Quoi ?" />
      <Field value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="Prix (€) — optionnel" />
      <PrimaryButton label="Ajouter" onPress={submit} />
    </Sheet>
  );
}
