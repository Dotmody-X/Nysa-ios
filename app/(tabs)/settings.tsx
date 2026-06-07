import React from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { BentoCard } from '@/components/BentoCard';
import { useTheme } from '@/theme/ThemeProvider';
import { themes, type ThemeName } from '@/theme/tokens';

export default function AccountScreen() {
  const { theme, themeName, setTheme } = useTheme();
  const router = useRouter();
  const names = Object.keys(themes) as ThemeName[];

  return (
    <Screen account={false}>
      {/* Back to where the account button was tapped from */}
      <Pressable
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))}
        hitSlop={10}
        style={{
          width: 44,
          height: 44,
          borderRadius: theme.radius.pill,
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: theme.colors.border,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: theme.spacing(4),
        }}
      >
        <Ionicons name="chevron-back" size={22} color={theme.colors.ink} />
      </Pressable>

      <Text variant="display">Compte</Text>
      <Text variant="body" color={theme.colors.inkSoft}>
        Ton profil et tes réglages.
      </Text>

      <View style={{ marginTop: theme.spacing(6) }}>
        <BentoCard tone="accent" span={2} icon="person" title="Invité" subtitle="Connexion à venir (Phase 2)" />
      </View>

      <View style={{ marginTop: theme.spacing(7) }}>
        <Text variant="title">Thème</Text>
        <Text variant="caption" color={theme.colors.inkSoft} style={{ marginBottom: theme.spacing(2) }}>
          Vrais style packs — pas un simple changement de couleur.
        </Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {names.map((name) => {
            const active = name === themeName;
            return (
              <Pressable
                key={name}
                onPress={() => setTheme(name)}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 20,
                  borderRadius: theme.radius.pill,
                  backgroundColor: active ? theme.colors.primary : theme.colors.surface,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                }}
              >
                <Text variant="label" color={active ? theme.colors.onPrimary : theme.colors.ink}>
                  {name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={{ marginTop: theme.spacing(7) }}>
        <BentoCard tone="surface" span={2} accent="primary" icon="information-circle" title="Nysa" subtitle="Version 0.1.0" />
      </View>
    </Screen>
  );
}
