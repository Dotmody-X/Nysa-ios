import React from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/Text';
import { useTheme } from '@/theme/ThemeProvider';
import { useGroupes } from './groupes';

/** Manage project groupes (brands) and their hourly rate. */
export function GroupesSettings() {
  const { theme } = useTheme();
  const { groupes, add, update, remove } = useGroupes();

  const input = {
    fontFamily: theme.fonts.body,
    fontSize: 15,
    color: theme.colors.ink,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  } as const;

  return (
    <View>
      <Text variant="title">Groupes & tarifs (Travail)</Text>
      <Text variant="caption" color={theme.colors.inkSoft} style={{ marginBottom: theme.spacing(2) }}>
        Tes marques / catégories de projets et leur tarif horaire (sert au calcul du facturable).
      </Text>

      <View style={{ gap: 10 }}>
        {groupes.map((g) => (
          <View key={g.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TextInput
              value={g.name}
              onChangeText={(name) => update(g.id, { name })}
              placeholder="Nom"
              placeholderTextColor={theme.colors.muted}
              style={[input, { flex: 1 }]}
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <TextInput
                value={g.rate != null ? String(g.rate) : ''}
                onChangeText={(t) => update(g.id, { rate: t ? Number(t.replace(',', '.')) || 0 : undefined })}
                placeholder="0"
                placeholderTextColor={theme.colors.muted}
                keyboardType="numeric"
                style={[input, { width: 60, textAlign: 'right' }]}
              />
              <Text variant="label" color={theme.colors.muted}>
                €/h
              </Text>
            </View>
            <Pressable onPress={() => remove(g.id)} hitSlop={8}>
              <Ionicons name="close" size={18} color={theme.colors.muted} />
            </Pressable>
          </View>
        ))}
      </View>

      <Pressable
        onPress={() => add()}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', marginTop: theme.spacing(3), paddingVertical: 10, paddingHorizontal: 16, borderRadius: theme.radius.pill, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border }}
      >
        <Ionicons name="add" size={16} color={theme.colors.ink} />
        <Text variant="label">Ajouter un groupe</Text>
      </Pressable>
    </View>
  );
}
