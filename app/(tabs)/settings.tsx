import React from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { BentoCard } from '@/components/BentoCard';
import { useTheme } from '@/theme/ThemeProvider';
import { themes, type ThemeName } from '@/theme/tokens';
import { useLlmStatus } from '@/features/ai/llmStatus';
import { useSession, signOut } from '@/features/auth/auth';
import { useSyncStatus } from '@/db/sync/syncStore';

export default function AccountScreen() {
  const { theme, themeName, setTheme } = useTheme();
  const router = useRouter();
  const names = Object.keys(themes) as ThemeName[];
  const { session } = useSession();
  const { syncing, lastSyncedAt, error: syncError, run: runSync } = useSyncStatus();
  const { enabled: llmEnabled, state: llmState, progress: llmProgress, setEnabled: setLlmEnabled } = useLlmStatus();
  const llmLabel =
    !llmEnabled
      ? 'Désactivée'
      : llmState === 'ready'
        ? 'Prête'
        : llmState === 'downloading'
          ? `Téléchargement ${Math.round(llmProgress * 100)}%`
          : llmState === 'error'
            ? 'Erreur'
            : 'Chargement…';

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
        {session ? (
          <Pressable
            onPress={() => signOut()}
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
            <Ionicons name="person-circle" size={36} color={theme.colors.accent} />
            <View style={{ flex: 1 }}>
              <Text variant="body">{session.user.email}</Text>
              <Text variant="label" color={theme.colors.muted}>
                Connecté · appuie pour te déconnecter
              </Text>
            </View>
            <Ionicons name="log-out-outline" size={20} color={theme.colors.muted} />
          </Pressable>
        ) : (
          <BentoCard
            tone="accent"
            span={2}
            icon="person"
            title="Pas connecté"
            subtitle="Connecte-toi pour sauvegarder & synchroniser"
            onPress={() => router.push('/auth')}
          />
        )}
      </View>

      {session ? (
        <Pressable
          onPress={() => runSync()}
          style={{
            marginTop: theme.spacing(3),
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
          <Ionicons name={syncing ? 'sync' : 'cloud-done-outline'} size={22} color={theme.colors.accent} />
          <View style={{ flex: 1 }}>
            <Text variant="body">Synchronisation</Text>
            <Text variant="label" color={syncError ? theme.colors.danger : theme.colors.muted}>
              {syncing
                ? 'Synchronisation…'
                : syncError
                  ? syncError
                  : lastSyncedAt
                    ? `Dernière : ${new Date(lastSyncedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
                    : 'Appuie pour synchroniser'}
            </Text>
          </View>
          <Ionicons name="refresh" size={18} color={theme.colors.muted} />
        </Pressable>
      ) : null}

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
        <Text variant="title">Assistant IA locale</Text>
        <Text variant="caption" color={theme.colors.inkSoft} style={{ marginBottom: theme.spacing(2) }}>
          Modèle on-device pour comprendre le langage libre. Télécharge ~1 Go la première fois. À éviter sur simulateur (lourd).
        </Text>
        <Pressable
          onPress={() => setLlmEnabled(!llmEnabled)}
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
          <Ionicons name="sparkles" size={22} color={theme.colors.primary} />
          <View style={{ flex: 1 }}>
            <Text variant="body">IA locale</Text>
            <Text variant="label" color={theme.colors.muted}>
              {llmLabel}
            </Text>
          </View>
          <View
            style={{
              width: 52,
              height: 30,
              borderRadius: 999,
              backgroundColor: llmEnabled ? theme.colors.primary : theme.colors.surfaceAlt,
              padding: 3,
              justifyContent: 'center',
              alignItems: llmEnabled ? 'flex-end' : 'flex-start',
            }}
          >
            <View style={{ width: 24, height: 24, borderRadius: 999, backgroundColor: theme.colors.surface }} />
          </View>
        </Pressable>
      </View>

      <View style={{ marginTop: theme.spacing(7) }}>
        <BentoCard tone="surface" span={2} accent="primary" icon="information-circle" title="Nysa" subtitle="Version 0.1.0" />
      </View>
    </Screen>
  );
}
